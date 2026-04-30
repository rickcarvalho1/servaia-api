import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const email = body?.email
  const name = body?.name
  const company = body?.company

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const subject = 'Welcome to Servaia'
  const html = `
    <div style="font-family: system-ui, sans-serif; color: #111;">
      <h1>Welcome to Servaia</h1>
      <p>Hi ${name || 'there'},</p>
      <p>Your account for ${company || 'your business'} is now being created. Thank you for choosing Servaia.</p>
      <p>You can sign in at <a href="https://app.servaiapay.com/login">app.servaiapay.com/login</a>.</p>
      <p>We look forward to helping you get paid faster.</p>
    </div>
  `

  const { success, error } = await sendEmail({
    to: email,
    subject,
    html,
  })

  if (!success) {
    return NextResponse.json({ error: error || 'Failed to send welcome email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
