import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  try {
    const { customerId } = await request.json()

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get customer from Supabase
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Create or get Stripe customer
    let stripeCustomerId = customer.stripe_customer_id

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        name:  customer.full_name || customer.name,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        metadata: { supabaseCustomerId: customerId, platform: 'servaia' },
      })
      stripeCustomerId = stripeCustomer.id

      // Save Stripe customer ID back to Supabase
      await supabase
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customerId)
    }

    // Create SetupIntent for saving card
    const setupIntent = await stripe.setupIntents.create({
      customer:             stripeCustomerId,
      payment_method_types: ['card'],
      usage:                'off_session',
      metadata:             { customerId, platform: 'servaia' },
    })

    return NextResponse.json({
      clientSecret:  setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    })

  } catch (err: any) {
    console.error('Setup intent error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}