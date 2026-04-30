import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

function getStatus(account: Stripe.Account) {
  if (account.charges_enabled && account.payouts_enabled) return 'active'
  if (account.requirements?.disabled_reason || (account.requirements?.currently_due?.length ?? 0) > 0) return 'restricted'
  return 'pending'
}

function getOrigin(request: Request) {
  const host = request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || 'https'
  return process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000')
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const accountId = url.searchParams.get('account') || url.searchParams.get('stripe_account')

    if (!accountId) {
      return NextResponse.json({ error: 'Missing Stripe account identifier' }, { status: 400 })
    }

    const account = await stripe.accounts.retrieve(accountId)
    const status = getStatus(account as Stripe.Account)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let businessId = account.metadata?.business_id as string | undefined

    if (!businessId && user) {
      const { data: member } = await supabase
        .from('team_members')
        .select('service_companies(id)')
        .eq('user_id', user.id)
        .eq('active', true)
        .single()
      businessId = (member?.service_companies as any)?.id
    }

    if (!businessId) {
      const { data: company } = await supabase
        .from('service_companies')
        .select('id')
        .eq('stripe_account_id', accountId)
        .single()
      businessId = company?.id
    }

    if (businessId) {
      await supabase
        .from('service_companies')
        .update({ stripe_account_id: accountId, stripe_connect_status: status })
        .eq('id', businessId)
    }

    const origin = getOrigin(request)
    return NextResponse.redirect(`${origin}/dashboard/settings/stripe-connect`)
  } catch (err: any) {
    console.error('Stripe Connect callback error:', err)
    return NextResponse.json({ error: err.message || 'Unable to update Stripe status' }, { status: 500 })
  }
}
