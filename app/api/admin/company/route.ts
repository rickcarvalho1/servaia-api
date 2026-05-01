import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, companyId, newTrialEndsAt } = body as {
      action?: string
      companyId?: string
      newTrialEndsAt?: string
    }

    if (!action || !companyId) {
      return NextResponse.json({ error: 'action and companyId are required' }, { status: 400 })
    }

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: request.cookies }
    )

    const { data: authData } = await authClient.auth.getUser()
    const user = authData?.user

    if (!user || user.email !== 'rick@servaiapay.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    if (action === 'deleteCompany') {
      const { data: payments, error: paymentsError } = await admin
        .from('payments')
        .select('id')
        .eq('business_id', companyId)

      if (paymentsError) {
        return NextResponse.json({ error: paymentsError.message }, { status: 500 })
      }

      const paymentIds = (payments ?? []).map((payment: any) => payment.id)

      if (paymentIds.length > 0) {
        await admin.from('job_services').delete().in('job_id', paymentIds)
      }

      const { data: customers, error: customersError } = await admin
        .from('customers')
        .select('id')
        .eq('business_id', companyId)

      if (customersError) {
        return NextResponse.json({ error: customersError.message }, { status: 500 })
      }

      const customerIds = (customers ?? []).map((customer: any) => customer.id)

      if (customerIds.length > 0) {
        await admin.from('customer_services').delete().in('customer_id', customerIds)
      }

      await Promise.all([
        admin.from('photos').delete().eq('business_id', companyId),
        admin.from('payments').delete().eq('business_id', companyId),
        admin.from('team_members').delete().eq('service_company_id', companyId),
        admin.from('invite_tokens').delete().eq('business_id', companyId),
        admin.from('customers').delete().eq('business_id', companyId),
      ])

      const { error: deleteError } = await admin
        .from('service_companies')
        .delete()
        .eq('id', companyId)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Company deleted successfully' })
    }

    if (action === 'extendTrial') {
      const trialEndsAt = newTrialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { error } = await admin
        .from('service_companies')
        .update({ trial_ends_at: trialEndsAt })
        .eq('id', companyId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Trial extended for 30 days', trialEndsAt })
    }

    if (action === 'activateSubscription') {
      const { error } = await admin
        .from('service_companies')
        .update({ subscription_status: 'active' })
        .eq('id', companyId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Subscription marked active' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
