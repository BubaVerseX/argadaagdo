import { absoluteSiteUrl } from "@/lib/site";

export type TransactionalEmailEvent =
  | "account_verification"
  | "password_reset"
  | "reservation_confirmation"
  | "reservation_cancellation"
  | "business_approval"
  | "pickup_reminder"
  | "pickup_completed"
  | "rating_reminder";

export type TransactionalEmailPayload = {
  recipientName?: string | null;
  offerTitle?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  pickupWindow?: string | null;
  pickupCode?: string | null;
  orderId?: number | string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  supportUrl?: string | null;
};

export type TransactionalEmailTemplate = {
  subject: string;
  preview: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clean(value: string | number | null | undefined, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function renderDetail(label: string, value: string | number | null | undefined) {
  const normalized = clean(value);
  if (!normalized) return "";

  return `
    <tr>
      <td style="padding:10px 0;color:#9dbfa8;font-size:14px;font-weight:500;">${escapeHtml(
        label
      )}</td>
      <td style="padding:10px 0;color:#f4efe4;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(
        normalized
      )}</td>
    </tr>
  `;
}

function renderAction(actionUrl?: string | null, actionLabel?: string | null) {
  const normalizedUrl = clean(actionUrl);
  const normalizedLabel = clean(actionLabel);

  if (!normalizedUrl || !normalizedLabel) return "";

  return `
    <a
      href="${escapeHtml(normalizedUrl)}"
      style="display:inline-block;margin-top:24px;border-radius:14px;background:#daf1de;color:#051f20;font-size:15px;font-weight:600;text-decoration:none;padding:14px 22px;"
    >
      ${escapeHtml(normalizedLabel)}
    </a>
  `;
}

function renderLayout({
  preview,
  title,
  intro,
  details,
  actionUrl,
  actionLabel,
  footer,
}: {
  preview: string;
  title: string;
  intro: string;
  details?: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  footer?: string;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;background:#051f20;font-family:'Noto Sans','Noto Sans Georgian',Arial,Helvetica,sans-serif;color:#f4efe4;" bgcolor="#051f20">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
          preview
        )}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#051f20;padding:28px 12px;" bgcolor="#051f20">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#123630;border-radius:24px;overflow:hidden;border:1px solid #2e5a4c;" bgcolor="#123630">
                <tr>
                  <td style="background:#0b2b26;padding:28px 28px 24px;color:#f4efe4;" bgcolor="#0b2b26">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-right:12px;"><img src="${escapeHtml(
                          absoluteSiteUrl("/icons/icon-96.png")
                        )}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border:0;" /></td>
                        <td style="font-size:15px;font-weight:600;letter-spacing:.02em;color:#daf1de;">ArGadaagdo</td>
                      </tr>
                    </table>
                    <h1 style="margin:16px 0 0;font-size:26px;line-height:1.2;font-weight:600;color:#f4efe4;">${escapeHtml(
                      title
                    )}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0;color:#c3ddcb;font-size:16px;line-height:1.6;font-weight:400;">${escapeHtml(
                      intro
                    )}</p>
                    ${
                      details
                        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-top:1px solid #2e5a4c;border-bottom:1px solid #2e5a4c;">${details}</table>`
                        : ""
                    }
                    ${renderAction(actionUrl, actionLabel)}
                    <p style="margin:26px 0 0;color:#9dbfa8;font-size:13px;line-height:1.6;font-weight:400;">${escapeHtml(
                      footer ||
                        "Questions? Contact ArGadaagdo support. We are here to help customers and local businesses reduce food waste in Tbilisi."
                    )}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildTextEmail({
  title,
  intro,
  details,
  actionUrl,
}: {
  title: string;
  intro: string;
  details?: Array<[string, string | number | null | undefined]>;
  actionUrl?: string | null;
}) {
  const detailLines =
    details
      ?.map(([label, value]) => [label, clean(value)].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("\n") || "";

  return [title, "", intro, "", detailLines, actionUrl ? `Open: ${actionUrl}` : ""]
    .filter(Boolean)
    .join("\n");
}

export function buildTransactionalEmailTemplate(
  event: TransactionalEmailEvent,
  payload: TransactionalEmailPayload
): TransactionalEmailTemplate {
  const offerTitle = clean(payload.offerTitle, "your surprise bag");
  const businessName = clean(payload.businessName, "the business");
  const pickupWindow = clean(payload.pickupWindow, "the listed pickup window");

  const commonDetails = [
    renderDetail("Offer", offerTitle),
    renderDetail("Business", businessName),
    renderDetail("Pickup", pickupWindow),
    renderDetail("Address", payload.businessAddress),
    renderDetail("Pickup code", payload.pickupCode),
    renderDetail("Reservation ID", payload.orderId),
  ].join("");

  switch (event) {
    case "account_verification": {
      const subject = "Verify your ArGadaagdo account";
      const intro =
        "Confirm your email address to finish creating your ArGadaagdo account.";
      return {
        subject,
        preview: "Confirm your email before using ArGadaagdo.",
        html: renderLayout({
          preview: "Confirm your email before using ArGadaagdo.",
          title: subject,
          intro,
          actionUrl: payload.actionUrl,
          actionLabel: payload.actionLabel || "Verify email",
          footer:
            "If you did not create this account, you can safely ignore this email.",
        }),
        text: buildTextEmail({ title: subject, intro, actionUrl: payload.actionUrl }),
      };
    }

    case "password_reset": {
      const subject = "Reset your ArGadaagdo password";
      const intro =
        "Use the secure link below to choose a new password for your account.";
      return {
        subject,
        preview: "Reset your ArGadaagdo password.",
        html: renderLayout({
          preview: "Reset your ArGadaagdo password.",
          title: subject,
          intro,
          actionUrl: payload.actionUrl,
          actionLabel: payload.actionLabel || "Reset password",
          footer:
            "If you did not request a password reset, you can safely ignore this email.",
        }),
        text: buildTextEmail({ title: subject, intro, actionUrl: payload.actionUrl }),
      };
    }

    case "reservation_confirmation": {
      const subject = `Reservation confirmed: ${offerTitle}`;
      const intro =
        "Your reservation is confirmed. Keep your pickup code ready and visit during the pickup window.";
      return {
        subject,
        preview: `Your ${offerTitle} reservation is confirmed.`,
        html: renderLayout({
          preview: `Your ${offerTitle} reservation is confirmed.`,
          title: "Reservation confirmed",
          intro,
          details: commonDetails,
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
          actionLabel: payload.actionLabel || "View order",
        }),
        text: buildTextEmail({
          title: "Reservation confirmed",
          intro,
          details: [
            ["Offer", offerTitle],
            ["Business", businessName],
            ["Pickup", pickupWindow],
            ["Address", payload.businessAddress],
            ["Pickup code", payload.pickupCode],
            ["Reservation ID", payload.orderId],
          ],
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
        }),
      };
    }

    case "reservation_cancellation": {
      const subject = `Reservation cancelled: ${offerTitle}`;
      const intro =
        "Your reservation was cancelled. If a refund applies, the payment status has been updated in ArGadaagdo.";
      return {
        subject,
        preview: `Your ${offerTitle} reservation was cancelled.`,
        html: renderLayout({
          preview: `Your ${offerTitle} reservation was cancelled.`,
          title: "Reservation cancelled",
          intro,
          details: commonDetails,
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
          actionLabel: payload.actionLabel || "View orders",
          footer:
            "Cancelled orders stay in your history so you can review what happened.",
        }),
        text: buildTextEmail({
          title: "Reservation cancelled",
          intro,
          details: [
            ["Offer", offerTitle],
            ["Business", businessName],
            ["Pickup", pickupWindow],
            ["Reservation ID", payload.orderId],
          ],
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
        }),
      };
    }

    case "business_approval": {
      const subject = `${businessName} is approved on ArGadaagdo`;
      const intro =
        "Your business has been approved. You can now open the dashboard and publish your first surprise bag.";
      return {
        subject,
        preview: "Your business can now publish offers on ArGadaagdo.",
        html: renderLayout({
          preview: "Your business can now publish offers on ArGadaagdo.",
          title: "Business approved",
          intro,
          details: renderDetail("Business", businessName),
          actionUrl: payload.actionUrl || absoluteSiteUrl("/business/dashboard"),
          actionLabel: payload.actionLabel || "Open dashboard",
        }),
        text: buildTextEmail({
          title: "Business approved",
          intro,
          details: [["Business", businessName]],
          actionUrl: payload.actionUrl || absoluteSiteUrl("/business/dashboard"),
        }),
      };
    }

    case "pickup_reminder": {
      const subject = `Pickup reminder: ${offerTitle}`;
      const intro =
        "Your pickup window is coming up. Bring your pickup code and collect your surprise bag on time.";
      return {
        subject,
        preview: `Do not forget your pickup for ${offerTitle}.`,
        html: renderLayout({
          preview: `Do not forget your pickup for ${offerTitle}.`,
          title: "Pickup reminder",
          intro,
          details: commonDetails,
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
          actionLabel: payload.actionLabel || "View pickup code",
        }),
        text: buildTextEmail({
          title: "Pickup reminder",
          intro,
          details: [
            ["Offer", offerTitle],
            ["Business", businessName],
            ["Pickup", pickupWindow],
            ["Pickup code", payload.pickupCode],
          ],
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
        }),
      };
    }

    case "pickup_completed": {
      const subject = `Pickup completed: ${offerTitle}`;
      const intro =
        "Thanks for collecting your order. Your pickup has been marked as completed.";
      return {
        subject,
        preview: `Your ${offerTitle} pickup is complete.`,
        html: renderLayout({
          preview: `Your ${offerTitle} pickup is complete.`,
          title: "Pickup completed",
          intro,
          details: commonDetails,
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
          actionLabel: payload.actionLabel || "View order",
        }),
        text: buildTextEmail({
          title: "Pickup completed",
          intro,
          details: [
            ["Offer", offerTitle],
            ["Business", businessName],
            ["Reservation ID", payload.orderId],
          ],
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
        }),
      };
    }

    case "rating_reminder": {
      const subject = `Rate your pickup from ${businessName}`;
      const intro =
        "Your rating helps other customers choose trusted local businesses and helps partners improve.";
      return {
        subject,
        preview: "Share your ArGadaagdo pickup experience.",
        html: renderLayout({
          preview: "Share your ArGadaagdo pickup experience.",
          title: "How was your pickup?",
          intro,
          details: commonDetails,
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
          actionLabel: payload.actionLabel || "Rate order",
        }),
        text: buildTextEmail({
          title: "How was your pickup?",
          intro,
          details: [
            ["Offer", offerTitle],
            ["Business", businessName],
            ["Reservation ID", payload.orderId],
          ],
          actionUrl: payload.actionUrl || absoluteSiteUrl("/orders"),
        }),
      };
    }

    default: {
      const exhaustiveCheck: never = event;
      throw new Error(`Unsupported email event: ${exhaustiveCheck}`);
    }
  }
}
