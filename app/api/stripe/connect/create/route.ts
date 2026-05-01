import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

function getOrigin(request: Request) {
  const host = request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || 'https'
  return process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000')
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('service_companies(id, name, stripe_account_id)')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const company = member.service_companies as any
    let stripeAccountId = company.stripe_account_id

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email ?? undefined,
        business_type: 'company',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          business_id: company.id,
          business_name: company.name,
        },
      })

      stripeAccountId = account.id
      await supabase
        .from('service_companies')
        .update({ stripe_account_id: stripeAccountId, stripe_connect_status: 'pending' })
        .eq('id', company.id)
    }

    const origin = getOrigin(request)
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/dashboard/settings/stripe-connect`,
      return_url: `${origin}/api/stripe/connect/callback?account=${stripeAccountId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('Stripe Connect create error:', err)
    return NextResponse.json({ error: err.message || 'Unable to create Stripe Connect link' }, { status: 500 })
  }
}
