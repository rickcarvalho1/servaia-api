import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export async function POST(req: NextRequest) {
  try {
    const { jobId, stripeChargeId } = await req.json()

    if (!jobId || !stripeChargeId) {
      return NextResponse.json({ error: 'jobId and stripeChargeId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!member || (member.role !== 'owner' && member.role !== 'manager')) {
      return NextResponse.json({ error: 'Only owners and managers can issue refunds' }, { status: 403 })
    }

    // Issue refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: stripeChargeId,
    })

    if (refund.status !== 'succeeded' && refund.status !== 'pending') {
      return NextResponse.json({ error: 'Refund failed' }, { status: 400 })
    }

    // Update payment status in Supabase
    const admin = createAdminClient()
    await admin
      .from('payments')
      .update({ payment_status: 'refunded' })
      .eq('id', jobId)

    return NextResponse.json({ success: true, refundId: refund.id })

  } catch (err: any) {
    console.error('Refund error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}