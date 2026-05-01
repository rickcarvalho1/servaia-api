import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { email, role, businessId, businessName } = await req.json()

    if (!email || !role || !businessId) {
      return NextResponse.json(
        { error: 'email, role, and businessId are required' },
        { status: 400 }
      )
    }

    if (!['manager', 'tech'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be manager or tech' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Check if invite already exists and not used
    const { data: existingInvite } = await supabase
      .from('invite_tokens')
      .select('id, used')
      .eq('email', email)
      .eq('business_id', businessId)
      .single()

    if (existingInvite && !existingInvite.used) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 400 }
      )
    }

    // Check if user already exists on this business
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('email', email)
      .eq('business_id', businessId)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'This person is already a member of your team' },
        { status: 400 }
      )
    }

    // Create invite token
    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const { error: insertError } = await supabase
      .from('invite_tokens')
      .insert({
        business_id: businessId,
        email,
        role,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      )
    }

    // Send invite email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?invite=${token}`
    const roleLabel = role === 'manager' ? 'Manager' : 'Field Tech'

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'rick@servaiapay.com',
        to: email,
        subject: `You're invited to join ${businessName} on Servaia`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0E1117;">
            <h2 style="margin-top: 0;">You're invited!</h2>
            <p>You've been invited to join <strong>${businessName}</strong> on Servaia as a <strong>${roleLabel}</strong>.</p>
            <p>Click the button below to set up your account and get started:</p>
            <a href="${inviteLink}" style="display: inline-block; background-color: #0E1117; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
              Accept Invite
            </a>
            <p style="color: #6B7490; font-size: 14px;">
              This invite link expires in 30 days.
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Delete the invite token if email fails
      await supabase
        .from('invite_tokens')
        .delete()
        .eq('token', token)

      return NextResponse.json(
        { error: 'Failed to send invite email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${email}`,
    })
  } catch (error: any) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invite' },
      { status: 500 }
    )
  }
}
