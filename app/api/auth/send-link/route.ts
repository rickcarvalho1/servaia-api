import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, full_name, name, phone, service_company_id")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customerName = customer.full_name || customer.name || "Valued Customer";
    const phone = customer.phone;

    if (!phone) {
      return NextResponse.json(
        { error: "Customer has no phone number on file" },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const { error: tokenError } = await supabase
      .from("auth_tokens")
      .upsert(
        {
          token,
          customer_id: customerId,
          expires_at: expiresAt.toISOString(),
          used: false,
        },
        { onConflict: "customer_id" }
      );

    if (tokenError) {
      console.error("Token upsert error:", tokenError);
      return NextResponse.json(
        { error: "Failed to generate auth token" },
        { status: 500 }
      );
    }

    const authLink = `${process.env.NEXT_PUBLIC_APP_URL}/authorize/${token}`;

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioSid || !twilioAuth || !twilioPhone) {
      console.warn("Twilio not configured. Auth link:", authLink);
      return NextResponse.json({
        success: true,
        message: "Twilio not configured. Link generated for manual use.",
        authLink,
      });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const smsBody = `Hi ${customerName}, your payment setup link for Servaia is ready. Tap to securely save your card on file: ${authLink}\n\nLink expires in 72 hours.`;

    const formData = new URLSearchParams();
    formData.append("To", phone);
    formData.append("From", twilioPhone);
    formData.append("Body", smsBody);

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!twilioRes.ok) {
      const twilioError = await twilioRes.json();
      console.error("Twilio error:", twilioError);
      return NextResponse.json(
        { error: "Failed to send SMS", details: twilioError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Auth link sent via SMS to ${phone}`,
    });
  } catch (err) {
    console.error("send-link error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}