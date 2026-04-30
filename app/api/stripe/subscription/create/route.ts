import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get service company
    const { data: company, error: companyError } = await supabase
      .from('service_companies')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Create or get Stripe customer
    let customerId = company.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          company_id: company.id,
        },
      })
      customerId = customer.id

      // Save customer ID
      await supabase
        .from('service_companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id)
    }

    // Create Stripe Checkout session for monthly subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_49',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      metadata: {
        company_id: company.id,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Subscription creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
