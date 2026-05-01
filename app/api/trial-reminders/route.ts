import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/notifications'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function getDaysUntilEnd(trialEndsAt: string | Date) {
  const now = new Date()
  const endDate = new Date(trialEndsAt)
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  return Math.floor((endUtc - todayUtc) / MS_PER_DAY)
}

function buildEmailHtml({ ownerName, companyName, billingUrl, reminderText }: {
  ownerName: string
  companyName: string
  billingUrl: string
  reminderText: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
      </head>
      <body style="margin:0;padding:0;background:#f4f5f7;color:#1f2937;font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px -40px rgba(15,23,42,.4);">
                <tr>
                  <td style="background:#0E1117;padding:24px 32px;color:#ffffff;text-align:center;font-size:20px;font-weight:700;">Servaia Trial Reminder</td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hi ${ownerName || 'there'},</p>
                    <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">This is a quick reminder that your Servaia trial for <strong>${companyName}</strong> ${reminderText}.</p>
                    <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">After your trial, your subscription is $49/month. Keep your account running and manage payment details on your billing page.</p>
                    <p style="margin:0 0 28px;font-size:16px;line-height:1.6;"><a href="${billingUrl}" style="color:#0E1117;font-weight:700;text-decoration:none;">Go to Billing</a></p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">If you have any questions or want help staying set up, just reply to this email.</p>
                    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#475569;">Thanks,<br>The Servaia team</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f3f4f6;padding:20px 32px;font-size:12px;color:#667085;text-align:center;">Servaia · Secure payments for home services</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function buildReminderSubject(daysUntilEnd: number) {
  if (daysUntilEnd === 5) {
    return 'Your Servaia trial ends in 5 days'
  }

  if (daysUntilEnd === 2) {
    return '2 days left on your Servaia trial'
  }

  return 'Your Servaia trial has ended'
}

function buildReminderText(daysUntilEnd: number) {
  if (daysUntilEnd === 5) {
    return 'ends in 5 days'
  }

  if (daysUntilEnd === 2) {
    return 'ends in 2 days'
  }

  return 'has ended today'
}

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.servaiapay.com'
  const billingUrl = `${appUrl.replace(/\/+$/, '')}/dashboard/billing`
  const supabase = await createAdminClient()

  const { data: companies, error } = await supabase
    .from('service_companies')
    .select(
      `id, name, company_name, owner_name, owner_email, trial_ends_at, trial_reminder_25_sent, trial_reminder_28_sent, trial_reminder_30_sent`
    )
    .eq('subscription_status', 'trial')
    .gt('trial_ends_at', new Date().toISOString())

  if (error) {
    console.error('Trial reminder query error:', error)
    return NextResponse.json({ error: 'Failed to query trial companies' }, { status: 500 })
  }

  if (!companies || companies.length === 0) {
    return NextResponse.json({ success: true, sent: 0, skipped: 0 })
  }

  let sentCount = 0
  let skippedCount = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const company of companies as any[]) {
    const trialEndsAt = company.trial_ends_at
    if (!trialEndsAt || !company.owner_email) {
      skippedCount += 1
      continue
    }

    const daysUntilEnd = getDaysUntilEnd(trialEndsAt)
    const subject = buildReminderSubject(daysUntilEnd)
    const reminderText = buildReminderText(daysUntilEnd)

    let flagColumn: string | null = null
    if (daysUntilEnd === 5 && !company.trial_reminder_25_sent) {
      flagColumn = 'trial_reminder_25_sent'
    } else if (daysUntilEnd === 2 && !company.trial_reminder_28_sent) {
      flagColumn = 'trial_reminder_28_sent'
    } else if (daysUntilEnd === 0 && !company.trial_reminder_30_sent) {
      flagColumn = 'trial_reminder_30_sent'
    }

    if (!flagColumn) {
      skippedCount += 1
      continue
    }

    const html = buildEmailHtml({
      ownerName: company.owner_name || company.owner_email.split('@')[0],
      companyName: company.company_name || company.name || 'your business',
      billingUrl,
      reminderText,
    })

    const { success, error: emailError } = await sendEmail({
      to: company.owner_email,
      subject,
      html,
    })

    if (!success) {
      errors.push({ id: company.id, error: emailError || 'Email send failed' })
      continue
    }

    const updatePayload: Record<string, boolean> = {}
    updatePayload[flagColumn] = true

    const { error: updateError } = await supabase
      .from('service_companies')
      .update(updatePayload)
      .eq('id', company.id)

    if (updateError) {
      console.error('Failed to update reminder flag for company', company.id, updateError)
      errors.push({ id: company.id, error: updateError.message })
      continue
    }

    sentCount += 1
  }

  return NextResponse.json({ success: true, sent: sentCount, skipped: skippedCount, errors })
}
