import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const {
      customerId,
      services,
      scheduledFor,
      assignedTo,
      notes,
      businessId,
    } = await request.json()

    if (!customerId || !services || services.length === 0 || !scheduledFor) {
      return NextResponse.json(
        { error: 'customerId, services, and scheduledFor are required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    const { data: job, error } = await supabase
      .from('payments')
      .insert({
        business_id:    businessId,
        customer_id:    customerId,
        scheduled_for:  scheduledFor,
        assigned_to:    assignedTo || null,
        notes:          notes || null,
        job_status:     'scheduled',
        payment_status: 'pending',
        amount:         0,
        sms_sent:       false,
        email_sent:     false,
      })
      .select()
      .single()

    if (error) {
      console.error('Schedule job error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (job && services.length > 0) {
      const lineItems = services.map((s: any) => ({
        job_id:        job.id,
        service_id:    s.serviceId || null,
        name:          s.name,
        price_charged: parseFloat(s.price),
        is_custom:     s.isCustom || false,
      }))
      await supabase.from('job_services').insert(lineItems)
    }

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (err: any) {
    console.error('Schedule job error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}