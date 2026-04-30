import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

async function sendSMSReceipt({ phone, customerName, businessName, serviceNames, totalDollars, surchargeAmount }: any) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER
  if (!twilioSid || !twilioAuth || !twilioPhone) return false

  const body = `Hi ${customerName}, your service from ${businessName} is complete. Services: ${serviceNames}.${surchargeAmount ? ` Card surcharge: $${surchargeAmount.toFixed(2)}.` : ''} Total charged: $${totalDollars}. Thank you!`
  const formData = new URLSearchParams()
  formData.append('To', phone)
  formData.append('From', twilioPhone)
  formData.append('Body', body)

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })
  return res.ok
}

async function sendEmailReceipt({ email, customerName, businessName, services, totalDollars, surchargeAmount }: any) {
  const resendKey = process.env.RESEND_API_KEY
  const fromDomain = process.env.RESEND_FROM_DOMAIN
  if (!resendKey || !fromDomain) return false

  const lineItemsHTML = services.map((s: any) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;">${s.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;text-align:right;">$${parseFloat(s.price_charged).toFixed(2)}</td>
    </tr>`).join('')

  const surchargeRow = surchargeAmount && surchargeAmount > 0 ? `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-weight:700;">Card surcharge</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;text-align:right;">$${surchargeAmount.toFixed(2)}</td>
    </tr>` : ''

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
        <tr><td style="background:#0E1117;padding:32px;text-align:center;border-radius:16px 16px 0 0;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${businessName}</p>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:13px;">Service Receipt</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#374151;">Hi ${customerName},</p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Your service has been completed and your card has been charged.</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${lineItemsHTML}
            ${surchargeRow}
            <tr>
              <td style="padding:16px 0 0;font-weight:700;color:#0E1117;">Total charged</td>
              <td style="padding:16px 0 0;font-weight:700;color:#0E1117;text-align:right;">$${totalDollars}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;border-radius:0 0 16px 16px;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Powered by <strong>Servaia</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${businessName} <noreply@${fromDomain}>`,
      to: [email],
      subject: `Your receipt from ${businessName} — $${totalDollars}`,
      html,
    }),
  })
  return res.ok
}

export async function POST(request: Request) {
  try {
    const { jobId, crewMember } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: job, error: jobErr } = await supabase
      .from('payments')
      .select(`
        *,
        customers (
          id, full_name, name, email, phone,
          stripe_customer_id, stripe_payment_method,
          service_companies (id, name, surcharge_enabled, surcharge_percentage)
        ),
        job_services (name, price_charged)
      `)
      .eq('id', jobId)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.job_status === 'completed') {
      return NextResponse.json({ error: 'Job already completed' }, { status: 400 })
    }

    const customer = job.customers as any
    const company = Array.isArray(customer.service_companies)
      ? customer.service_companies[0]
      : customer.service_companies

    if (!customer.stripe_customer_id || !customer.stripe_payment_method) {
      return NextResponse.json({ error: 'Customer has no card on file' }, { status: 402 })
    }

    const services = job.job_services as any[]
    const totalCents = services.reduce(
      (sum: number, s: any) => sum + Math.round(parseFloat(s.price_charged) * 100), 0
    )

    if (totalCents <= 0) {
      return NextResponse.json({ error: 'Total must be greater than $0' }, { status: 400 })
    }

    const surchargeEnabled = !!company?.surcharge_enabled
    const surchargePercentage = parseFloat(company?.surcharge_percentage || 0)
    const surchargeAmountCents = surchargeEnabled
      ? Math.round(totalCents * (surchargePercentage / 100))
      : 0
    const totalWithSurchargeCents = totalCents + surchargeAmountCents

    const businessName = company?.name || 'Servaia'
    const customerName = customer.full_name || customer.name || 'Customer'
    const serviceNames = services.map((s: any) => s.name).join(', ')
    const totalDollars = (totalWithSurchargeCents / 100).toFixed(2)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalWithSurchargeCents,
      currency: 'usd',
      customer: customer.stripe_customer_id,
      payment_method: customer.stripe_payment_method,
      confirm: true,
      off_session: true,
      description: `${businessName}: ${serviceNames}`,
      metadata: {
        jobId,
        customerId: customer.id,
        businessName,
        crewMember: crewMember || '',
        platform: 'servaia',
      },
    })

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment failed', status: paymentIntent.status }, { status: 402 })
    }

    await supabase
      .from('payments')
      .update({
        job_status:       'completed',
        payment_status:   'charged',
        stripe_charge_id: paymentIntent.id,
        amount:           parseFloat(totalDollars),
        surcharge_amount: surchargeAmountCents / 100,
        crew_member:      crewMember || job.crew_member || null,
        completed_at:     new Date().toISOString(),
      })
      .eq('id', jobId)

    let smsSent = false
    let emailSent = false

    if (customer.phone) {
      smsSent = await sendSMSReceipt({ phone: customer.phone, customerName, businessName, serviceNames, totalDollars, surchargeAmount: surchargeAmountCents / 100 })
    }
    if (customer.email) {
      emailSent = await sendEmailReceipt({ email: customer.email, customerName, businessName, services, totalDollars, surchargeAmount: surchargeAmountCents / 100 })
    }

    await supabase
      .from('payments')
      .update({ sms_sent: smsSent, email_sent: emailSent })
      .eq('id', jobId)

    return NextResponse.json({
      success: true,
      jobId,
      chargeId: paymentIntent.id,
      amount: totalDollars,
      smsSent,
      emailSent,
    })

  } catch (err: any) {
    if (err.type === 'StripeCardError') {
      return NextResponse.json({ error: `Card declined: ${err.message}`, code: err.code }, { status: 402 })
    }
    console.error('Complete scheduled job error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}