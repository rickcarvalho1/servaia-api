import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendSMS,
  sendEmail,
  buildSMSReceipt,
  buildEmailReceipt,
} from '@/lib/notifications'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export async function POST(request: Request) {
  try {
    const {
      customerId,
      services,
      crewMember,
      notes,
    } = await request.json()

    if (!customerId || !services || services.length === 0) {
      return NextResponse.json({ error: 'customerId and services required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get customer with business
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*, service_companies(id, name)')
      .eq('id', customerId)
      .single()

    if (custErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (!customer.stripe_customer_id || !customer.stripe_payment_method) {
      return NextResponse.json({ error: 'Customer has no card on file' }, { status: 402 })
    }

    const businessName = (customer.service_companies as any)?.name || 'Servaia'
    const businessId   = (customer.service_companies as any)?.id
    const customerName = customer.full_name || customer.name || 'Valued Customer'

    // Calculate total
    const totalCents = services.reduce(
      (sum: number, s: any) => sum + Math.round(parseFloat(s.price) * 100), 0
    )

    if (totalCents <= 0) {
      return NextResponse.json({ error: 'Total must be greater than $0' }, { status: 400 })
    }

    const serviceNames = services.map((s: any) => s.name).join(', ')
    const totalDollars = (totalCents / 100).toFixed(2)

    // Charge the card
    const paymentIntent = await stripe.paymentIntents.create({
      amount:         totalCents,
      currency:       'usd',
      customer:       customer.stripe_customer_id,
      payment_method: customer.stripe_payment_method,
      confirm:        true,
      off_session:    true,
      description:    `${businessName}: ${serviceNames}`,
      metadata: {
        customerId,
        businessId,
        businessName,
        crewMember: crewMember || '',
        platform:   'servaia',
      },
    })

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({
        error:  'Payment failed',
        status: paymentIntent.status,
      }, { status: 402 })
    }

    // Save job to Supabase
    const { data: job, error: jobErr } = await supabase
      .from('payments')
      .insert({
        business_id:      businessId,
        customer_id:      customerId,
        stripe_charge_id: paymentIntent.id,
        amount:           parseFloat(totalDollars),
        
        payment_status:   'charged',
        crew_member:      crewMember || null,
        notes:            notes || null,
        completed_at:     new Date().toISOString(),
        sms_sent:         false,
        email_sent:       false,
      })
      .select()
      .single()

    if (jobErr) {
      console.error('Job DB insert error:', jobErr.message)
    }

    // Save line items
    if (job) {
      const lineItems = services.map((s: any) => ({
  job_id:        job.id,
  service_id:    s.serviceId || null,
  name:          s.name,
  price_charged: parseFloat(s.price),
  is_custom:     s.isCustom || false,
}))

      await supabase.from('job_services').insert(lineItems)
    }

    // ── Fire notifications (non-blocking — don't fail the job if these error) ──

    let smsSent   = false
    let emailSent = false

    const completedAt = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day:   'numeric',
      year:  'numeric',
    })

    // SMS receipt
    if (customer.phone) {
      const smsBody = buildSMSReceipt({
        customerName,
        businessName,
        serviceNames,
        totalDollars,
        jobId: job?.id || '',
      })

      const smsResult = await sendSMS({ to: customer.phone, body: smsBody })
      smsSent = smsResult.success
    }

    // Email receipt
    if (customer.email) {
      const serviceLines = services.map((s: any) => ({
        name:  s.name,
        price: parseFloat(s.price).toFixed(2),
      }))

      const emailHtml = buildEmailReceipt({
        customerName,
        businessName,
        serviceLines,
        totalDollars,
        jobId:       job?.id || '',
        completedAt,
      })

      const emailResult = await sendEmail({
        to:      customer.email,
        subject: `Your receipt from ${businessName} — $${totalDollars}`,
        html:    emailHtml,
      })

      emailSent = emailResult.success
    }

    // Update job with notification status
    if (job) {
      await supabase
        .from('payments')
        .update({ sms_sent: smsSent, email_sent: emailSent })
        .eq('id', job.id)
    }

    return NextResponse.json({
      success:   true,
      jobId:     job?.id,
      chargeId:  paymentIntent.id,
      amount:    totalDollars,
      smsSent,
      emailSent,
    })

  } catch (err: any) {
    if (err.type === 'StripeCardError') {
      return NextResponse.json({
        error: `Card declined: ${err.message}`,
        code:  err.code,
      }, { status: 402 })
    }
    console.error('Job complete error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
