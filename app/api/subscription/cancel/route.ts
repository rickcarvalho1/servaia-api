import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('team_members')
      .select('service_companies(id, stripe_subscription_id)')
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const co = member.service_companies as any
    const subId = co.stripe_subscription_id

    if (!subId) return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })

    // Cancel at period end — they keep access until billing cycle ends
    await stripe.subscriptions.update(subId, { cancel_at_period_end: true })

    const admin = createAdminClient()
    await admin.from('service_companies').update({ subscription_status: 'cancelled' }).eq('id', co.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}