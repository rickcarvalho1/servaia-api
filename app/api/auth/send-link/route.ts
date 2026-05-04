import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, full_name, name, phone, email, business_id, service_companies(name)")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customerName = customer.full_name || customer.name || "Valued Customer";
    const phone = customer.phone;
    const email = customer.email;
    const businessName = (customer.service_companies as any)?.name || "Your service provider";

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Customer has no phone number or email on file" },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const { error: tokenError } = await supabase
      .from("auth_tokens")
      .upsert(
        { token, customer_id: customerId, expires_at: expiresAt.toISOString(), used: false },
        { onConflict: "customer_id" }
      );

    if (tokenError) {
      return NextResponse.json({ error: "Failed to generate auth token" }, { status: 500 });
    }

    const authLink = `${process.env.NEXT_PUBLIC_APP_URL}/authorize/${token}`;

    let emailSent = false;
    let smsSent = false;

    // ── SMS (primary) — only mark success if status is sent/delivered ──
    if (phone) {
      const twilioSid   = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuth  = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      if (twilioSid && twilioAuth && twilioPhone) {
        try {
          const smsBody = `Hi ${customerName}, ${businessName} has requested you save a card on file via Servaia. Tap to authorize: ${authLink}\n\nExpires in 72 hours. Reply STOP to opt out.`;
          const formData = new URLSearchParams();
          formData.append("To", phone);
          formData.append("From", twilioPhone);
          formData.append("Body", smsBody);

          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formData.toString(),
            }
          );

          if (twilioRes.ok) {
            const twilioData = await twilioRes.json()
            // Only mark SMS as sent if status is queued or sent
            // If 10DLC not approved, Twilio returns status 'failed' or error code 30007/30034
            const status = twilioData.status
            const errorCode = twilioData.error_code
            if (
              (status === 'queued' || status === 'sent' || status === 'delivered') &&
              !errorCode
            ) {
              smsSent = true
            } else {
              console.warn('Twilio message not delivered:', status, errorCode)
            }
          } else {
            const err = await twilioRes.json();
            console.error("Twilio error:", err);
          }
        } catch (err) {
          console.error("SMS send error:", err);
        }
      }
    }

    // ── EMAIL (fallback — sends if SMS failed or no phone) ──
    if (!smsSent && email) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "rick@servaiapay.com",
          to: email,
          subject: `${businessName} — Save your card on file`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #fff;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 800; color: #0E1117; margin: 0;">Servaia</h1>
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #0E1117; margin-bottom: 8px;">
                Hi ${customerName},
              </h2>
              <p style="color: #6B7490; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                <strong>${businessName}</strong> has requested that you save a card on file for future service payments.
                You'll only be charged after a job is completed — never before.
              </p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${authLink}" style="display: inline-block; background: #0E1117; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 999px; text-decoration: none;">
                  Save Card Securely →
                </a>
              </div>
              <p style="color: #9BA3B8; font-size: 13px; text-align: center; margin-bottom: 8px;">
                This link expires in 72 hours.
              </p>
              <p style="color: #9BA3B8; font-size: 13px; text-align: center;">
                If you didn't expect this email, you can safely ignore it.
              </p>
              <hr style="border: none; border-top: 1px solid #DDE1EC; margin: 32px 0;" />
              <p style="color: #9BA3B8; font-size: 12px; text-align: center;">
                Powered by Servaia · Secure card storage via Stripe · PCI compliant
              </p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err) {
        console.error("Email send error:", err);
      }
    }

    if (!emailSent && !smsSent) {
      return NextResponse.json(
        { error: "Failed to send authorization link via SMS or email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent,
      smsSent,
      message: smsSent && emailSent
        ? `Auth link sent via SMS and email`
        : smsSent
        ? `Auth link sent via SMS to ${phone}`
        : `Auth link sent via email to ${email}`,
    });

  } catch (err) {
    console.error("send-link error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}