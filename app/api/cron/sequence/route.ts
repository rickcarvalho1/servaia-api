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

function daysBetween(date1: Date, date2: Date) {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
}

const DAY2_MESSAGES: Record<string, string> = {
  'Landscaping': `Hey [firstName] — just following up. Built a tool that landscaping crews are using to get paid the second a job is done — no invoices, no chasing. Free for 30 days, no contract. Want to see it? — Rick`,
  'Hardscaping': `Hey [firstName] — following up. You finish a $8,000 patio and the money should hit your account that same day. That's what Servaia does. Free 30-day trial. Want a quick demo? — Rick`,
  'HVAC': `Hey [firstName] — following up. Your tech finishes a $2,500 AC install — Servaia charges the customer automatically and you see it in your account same day. No invoice. No waiting. Free trial. — Rick`,
  'Electrical': `Hey [firstName] — following up. Your guy finishes a $12,000 service upgrade — Servaia charges the customer automatically the moment he marks it done. Money same day. Free trial. — Rick`,
  'Plumbing': `Hey [firstName] — following up. Plumber finishes a $4,000 water heater install — Servaia charges the customer automatically when he marks it done. No invoice. No waiting. — Rick`,
  'Pool Service': `Hey [firstName] — following up. Tech finishes a $3,000 pool repair — Servaia charges the customer automatically when he marks it done. Money same day, no invoice. Free trial. — Rick`,
  'Pest Control': `Hey [firstName] — following up. Tech finishes a treatment — Servaia charges the card on file automatically. No invoice, no follow-up. Free 30-day trial. — Rick`,
  'Cleaning': `Hey [firstName] — following up. Cleaner finishes the job — Servaia charges the customer automatically. No invoice, no chasing. Free 30-day trial. — Rick`,
  'Auto Detail': `Hey [firstName] — following up. Detail is done — Servaia charges the customer automatically the moment your tech marks it complete. No invoice. Free trial. — Rick`,
  'Other': `Hey [firstName] — just following up. Built a tool that service companies are using to get paid the second a job is done — no invoices, no chasing. Free for 30 days. Want to see it? — Rick`,
}

const DAY5_SUBJECTS: Record<string, string> = {
  'Landscaping': 'Florida landscapers are getting paid same day — here\'s how',
  'Hardscaping': 'Get paid the day you finish the job — no invoice needed',
  'HVAC': 'Your techs finish the job — Servaia collects the money automatically',
  'Electrical': 'Stop waiting 2 weeks to get paid on big electrical jobs',
  'Plumbing': 'Get paid the moment your plumber marks the job done',
  'Other': 'Get paid the moment the job is done — no invoices, no chasing',
}

const DAY8_MESSAGE = `Last one from me [firstName] — servaiapay.com if you ever want to get paid the moment a job's done instead of chasing it. — Rick`

function getDay5Email(firstName: string, industry: string, subject: string) {
  return {
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <p>Hey ${firstName},</p>
        <p>I reached out a few days ago about Servaia — wanted to follow up with a bit more context.</p>
        <p>Most ${industry.toLowerCase()} companies are still sending invoices and waiting days or weeks to get paid. Servaia eliminates that entirely:</p>
        <ul>
          <li>Customer saves a card on file before the job</li>
          <li>Your crew marks the job done on their phone</li>
          <li>Customer gets charged automatically — money hits your account same day</li>
        </ul>
        <p>No invoice. No follow-up. No awkward payment conversation on-site.</p>
        <p>Free for 30 days, no credit card needed, cancel anytime.</p>
        <p>
          <a href="${APP_URL}/get-started" style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin:8px 0;">
            See How It Works →
          </a>
        </p>
        <p>Or book a 10-minute demo: <a href="https://calendly.com/rick-servaiapay">calendly.com/rick-servaiapay</a></p>
        <p>— Rick<br>Founder, Servaia</p>
      </div>
    `
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createRouteHandlerClient({ cookies })
  const now = new Date()

  const { data: prospects } = await supabase
    .from('prospects')
    .select('*')
    .eq('sequence_active', true)
    .not('status', 'in', '("Signed Up","Dead")')

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0

  for (const prospect of prospects) {
    const daysSinceCreated = daysBetween(new Date(prospect.created_at), now)
    const firstName = prospect.owner_name.split(' ')[0]
    const industry = prospect.industry || 'Other'

    for (const targetDay of [2, 5, 8]) {
      if (daysSinceCreated !== targetDay) continue

      const { data: existing } = await supabase
        .from('sequence_log')
        .select('id')
        .eq('prospect_id', prospect.id)
        .eq('day', targetDay)
        .eq('status', 'sent')
        .single()

      if (existing) continue

      try {
        if (targetDay === 2) {
          const template = DAY2_MESSAGES[industry] || DAY2_MESSAGES['Other']
          const message = template.replace('[firstName]', firstName)
          await twilioClient.messages.create({ body: message, from: TWILIO_FROM, to: prospect.phone })
          await supabase.from('sequence_log').insert({
            prospect_id: prospect.id, day: targetDay, type: 'sms',
            message, sent_at: now.toISOString(), status: 'sent',
          })
        }

        if (targetDay === 5 && prospect.email) {
          const subject = DAY5_SUBJECTS[industry] || DAY5_SUBJECTS['Other']
          const { html } = getDay5Email(firstName, industry, subject)
          await resend.emails.send({ from: FROM_EMAIL, to: prospect.email, subject, html })
          await supabase.from('sequence_log').insert({
            prospect_id: prospect.id, day: targetDay, type: 'email',
            message: subject, sent_at: now.toISOString(), status: 'sent',
          })
        }

        if (targetDay === 8) {
          const message = DAY8_MESSAGE.replace('[firstName]', firstName)
          await twilioClient.messages.create({ body: message, from: TWILIO_FROM, to: prospect.phone })
          await supabase.from('sequence_log').insert({
            prospect_id: prospect.id, day: targetDay, type: 'sms',
            message, sent_at: now.toISOString(), status: 'sent',
          })
        }

        sent++
      } catch (err) {
        console.error(`Failed day ${targetDay} for ${prospect.id}:`, err)
        await supabase.from('sequence_log').insert({
          prospect_id: prospect.id, day: targetDay,
          type: targetDay === 5 ? 'email' : 'sms', status: 'failed',
        })
      }
    }

    if (daysSinceCreated >= 9) {
      await supabase.from('prospects')
        .update({ sequence_active: false, sequence_stopped_reason: 'completed' })
        .eq('id', prospect.id)
    }
  }

  return NextResponse.json({ sent, processed: prospects.length })
}