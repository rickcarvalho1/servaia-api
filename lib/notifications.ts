// ─── Twilio SMS ───────────────────────────────────────────────────────────────

export async function sendSMS({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ success: boolean; error?: string }> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const auth  = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !auth || !from) {
    console.warn("Twilio not configured — skipping SMS");
    return { success: false, error: "Twilio not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const params = new URLSearchParams();
  params.append("To",   to);
  params.append("From", from);
  params.append("Body", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:   "Basic " + Buffer.from(`${sid}:${auth}`).toString("base64"),
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Twilio error:", err);
    return { success: false, error: err.message };
  }

  return { success: true };
}

// ─── Resend Email ─────────────────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey    = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || `receipts@${process.env.RESEND_FROM_DOMAIN}`;

  if (!apiKey) {
    console.warn("Resend not configured — skipping email");
    return { success: false, error: "Resend not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend error:", err);
    return { success: false, error: err.message };
  }

  return { success: true };
}

// ─── Receipt templates ────────────────────────────────────────────────────────

export function buildSMSReceipt({
  customerName,
  businessName,
  serviceNames,
  totalDollars,
  surchargeAmount,
  jobId,
}: {
  customerName: string;
  businessName: string;
  serviceNames: string;
  totalDollars: string;
  surchargeAmount?: number;
  jobId: string;
}): string {
  return (
    `Hi ${customerName}, your ${businessName} service is complete.\n\n` +
    `Services: ${serviceNames}\n` +
    (surchargeAmount && surchargeAmount > 0 ? `Card surcharge: $${surchargeAmount.toFixed(2)}\n` : '') +
    `Total charged: $${totalDollars}\n\n` +
    `Thank you for your business!`
  );
}

export function buildEmailReceipt({
  customerName,
  businessName,
  serviceLines,
  totalDollars,
  jobId,
  completedAt,
}: {
  customerName: string;
  businessName: string;
  serviceLines: { name: string; price: string }[];
  totalDollars: string;
  jobId: string;
  completedAt: string;
}): string {
  const rows = serviceLines
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;">${s.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:right;">$${s.price}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#0E1117;padding:28px 36px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                ${businessName}
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:#8a9bb0;">Service Receipt</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 6px;font-size:15px;color:#333;">Hi ${customerName},</p>
              <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.5;">
                Your service has been completed and your card on file has been charged. Here's your receipt.
              </p>

              <!-- Line items -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:8px;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Service</td>
                  <td style="padding-bottom:8px;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Amount</td>
                </tr>
                ${rows}
                <tr>
                  <td style="padding:16px 0 0;font-size:15px;font-weight:700;color:#0E1117;">Total</td>
                  <td style="padding:16px 0 0;font-size:15px;font-weight:700;color:#0E1117;text-align:right;">$${totalDollars}</td>
                </tr>
              </table>

              <!-- Meta -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f9f9f9;border-radius:8px;padding:16px;">
                <tr>
                  <td style="font-size:12px;color:#999;">Date</td>
                  <td style="font-size:12px;color:#666;text-align:right;">${completedAt}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#999;padding-top:6px;">Job ID</td>
                  <td style="font-size:12px;color:#666;text-align:right;padding-top:6px;">${jobId.slice(0, 8).toUpperCase()}</td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.5;">
                Questions about this charge? Reply to this email or contact ${businessName} directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#bbb;text-align:center;">
                Powered by <strong style="color:#999;">Servaia</strong> · Secure payments for home services
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}