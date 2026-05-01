import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import twilio from 'twilio'
import { Resend } from 'resend'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'rick@servaiapay.com'
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.servaiapay.com'

const DAY0_MESSAGES: Record<string, string> = {
  'Landscaping': `Hey [firstName], do you guys collect payment on-site when a job's done or do you send invoices after? Asking for a reason — Rick`,
  'Hardscaping': `Hey [firstName], after you finish a patio or retaining wall, how long does it usually take to actually collect the money? — Rick`,
  'HVAC': `Hey [firstName], do your techs collect payment in the field or does billing happen after the fact? — Rick`,
  'Electrical': `Hey [firstName], after a big panel job or service call, are you collecting on-site or chasing the invoice after? — Rick`,
  'Plumbing': `Hey [firstName], honest question — what's your biggest headache with collecting payment after a job? — Rick`,
  'Pool Service': `Hey [firstName], after a pool repair or install, are you collecting same day or sending an invoice after? — Rick`,
  'Pest Control': `Hey [firstName], when your techs finish a treatment, do they collect on-site or does billing happen later? — Rick`,
  'Cleaning': `Hey [firstName], after a cleaning job is done, how are you handling payment — on-site or invoice after? — Rick`,
  'Auto Detail': `Hey [firstName], when a detail is done, are you collecting right there or sending an invoice after? — Rick`,
  'Other': `Hey [firstName], it's Rick from Servaia. Get paid the moment your job is done — no invoices, no chasing. Worth a quick look? [APP_URL]/get-started`,
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'rickcarvalho1@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { business_name, owner_name, phone, email, industry, notes, source } = body

  if (!business_name || !owner_name || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: prospect, error } = await supabase
    .from('prospects')
    .insert({ business_name, owner_name, phone, email, industry, notes, source, status: 'New', sequence_active: true })
    .select()
    .single()

  if (error || !prospect) {
    return NextResponse.json({ error: 'Failed to create prospect' }, { status: 500 })
  }

  const firstName = owner_name.split(' ')[0]
  const template = DAY0_MESSAGES[industry] || DAY0_MESSAGES['Other']
  const day0Message = template
    .replace('[firstName]', firstName)
    .replace('[APP_URL]', APP_URL)

  try {
    await twilioClient.messages.create({
      body: day0Message,
      from: TWILIO_FROM,
      to: phone,
    })

    await supabase.from('sequence_log').insert({
      prospect_id: prospect.id,
      day: 0,
      type: 'sms',
      message: day0Message,
      sent_at: new Date().toISOString(),
      status: 'sent',
    })

    await supabase.from('prospects').update({ status: 'Contacted' }).eq('id', prospect.id)

  } catch (err) {
    console.error('Day 0 SMS failed:', err)
    await supabase.from('sequence_log').insert({
      prospect_id: prospect.id,
      day: 0,
      type: 'sms',
      message: day0Message,
      status: 'failed',
    })
  }

  return NextResponse.json({ success: true, prospect })
}

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'rickcarvalho1@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}