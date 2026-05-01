import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, sendSMS } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const email = body?.email
  const name = body?.name
  const company = body?.company
  const phone = body?.phone

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const subject = 'Welcome to Servaia — Your 30-Day Free Trial Starts Now'
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0E1117; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #0E1117; font-size: 18px; margin-top: 0; }
          .cta-button { display: inline-block; background-color: #E8B84B; color: #0E1117; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 10px 0; }
          .cta-button:hover { background-color: #d9a93c; }
          .highlight { background-color: #fff3cd; padding: 15px; border-left: 4px solid #E8B84B; border-radius: 4px; margin: 15px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; text-align: center; }
          ul { color: #555; }
          ul li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Servaia</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your 30-Day Free Trial Starts Now</p>
          </div>
          
          <div class="content">
            <p>Hi ${name || 'there'},</p>
            
            <p>Welcome to Servaia! Your account for <strong>${company || 'your business'}</strong> is ready to go. No credit card to start — free for 30 days, then $49/month. Your 30-day free trial starts today.</p>

            <div class="section">
              <h2>🚀 Get Started in 3 Steps</h2>
              <ol>
                <li><strong>Connect Stripe</strong> — Link your Stripe account to accept payments</li>
                <li><strong>Add Customers</strong> — Import or create customer profiles</li>
                <li><strong>Mark Jobs Done</strong> — When work is complete, charge automatically</li>
              </ol>
              <a href="https://app.servaiapay.com/dashboard/settings/stripe-connect" class="cta-button">→ Connect Stripe Now</a>
            </div>

            <div class="section">
              <h2>📊 Your Dashboard</h2>
              <p>Access your dashboard to manage customers, jobs, and payments:</p>
              <a href="https://app.servaiapay.com/dashboard" class="cta-button">→ Go to Dashboard</a>
            </div>

            <div class="section">
              <h2>✨ What's Included in Your 30-Day Trial</h2>
              <ul>
                <li>Unlimited jobs and customers</li>
                <li>Automatic payment charging</li>
                <li>Same-day payouts to your bank account</li>
                <li>Full access to all features</li>
                <li>No monthly subscription fee during your 30-day trial — you only pay standard transaction fees when you collect payments.</li>
              </ul>
            </div>

            <div class="highlight">
              <strong>After Your Trial Ends</strong><br>
              Your subscription will be $49/month + 3.5% per transaction. Cancel anytime — no contracts. If you signed up during our launch, you'll lock in $49/month forever (grandfather pricing).
            </div>

            <div class="section">
              <p style="color: #666; font-size: 14px;">Questions? Reply to this email or reach out anytime. We're here to help.</p>
              <p style="color: #666; font-size: 14px;"><strong>— Rick from Servaia</strong><br>rick@servaiapay.com</p>
            </div>

            <div class="footer">
              <p>© 2026 Servaia. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  const { success, error } = await sendEmail({
    to: email,
    subject,
    html,
  })

  if (!success) {
    return NextResponse.json({ error: error || 'Failed to send welcome email' }, { status: 500 })
  }

  // Send welcome SMS if phone number provided
  if (phone) {
    const smsBody = `Welcome to Servaia! Your 30-day free trial is active. Get started: https://app.servaiapay.com/dashboard`
    await sendSMS({
      to: phone,
      body: smsBody,
    })
  }

  return NextResponse.json({ success: true })
}
