import { absoluteBusinessUrl } from "@/lib/businessArea";
import {
  OPERATOR_LOCATION,
  OPERATOR_SHORT,
  SUPPORT_EMAIL,
} from "@/lib/legal/shared";
import { formatMoney } from "@/lib/offerLifecycle";
import { absoluteSiteUrl } from "@/lib/site";

// Every email is bilingual, Georgian first and then English: no language
// preference is stored per account, so one email has to work for everyone.
// The rules and the seller/operator lines follow the Terms (lib/legal/terms.ts);
// update both together. Never print the operator's ID code or street address.

export type TransactionalEmailEvent =
  | "account_verification"
  | "password_reset"
  | "reservation_confirmation"
  | "reservation_cancellation"
  | "business_approval"
  | "business_rejection"
  | "pickup_reminder"
  | "pickup_completed"
  | "rating_reminder";

export type TransactionalEmailPayload = {
  recipientName?: string | null;
  offerTitle?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  /** Tbilisi date, YYYY-MM-DD. */
  pickupDate?: string | null;
  /** HH:MM or HH:MM:SS. */
  pickupStart?: string | null;
  pickupEnd?: string | null;
  pickupCode?: string | null;
  /** What the customer paid, in GEL. 0 is a free (demo) order. */
  amount?: number | string | null;
  orderId?: number | string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  supportUrl?: string | null;
  rejectionReason?: string | null;
};

export type TransactionalEmailTemplate = {
  subject: string;
  preview: string;
  html: string;
  text: string;
};

type Bilingual = { ka: string; en: string };

type Detail = {
  label: Bilingual;
  value: string | number | null | undefined;
  /** A smaller second line under the value, e.g. the seller's address. */
  note?: string | null;
};

type Notes = {
  ka: string[];
  en: string[];
  /** Link the Terms and the refund policy under the notes. */
  legalLinks?: boolean;
};

type EmailContent = {
  subject: string;
  preview: string;
  title: Bilingual;
  intro: Bilingual;
  details?: Detail[];
  action?: { url: string; label: string } | null;
  notes?: Notes;
  /** An extra line above the support contact, e.g. "ignore this email if...". */
  footer?: Bilingual;
};

const FONT_STACK =
  "'Noto Sans','Noto Sans Georgian',Arial,Helvetica,sans-serif";

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

function bilingualLabel(label: Bilingual) {
  return `${label.ka} · ${label.en}`;
}

// ---------------------------------------------------------------------------
// Order facts, written the same way in both languages.

/** 7.11.2026, the same short date the Orders screen shows in both languages. */
function formatPickupDate(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}`;
}

/** "7.11.2026 · 18:00–20:00". A date, not "today", because emails are read later. */
function formatPickup(payload: TransactionalEmailPayload) {
  const date = clean(payload.pickupDate);
  const start = clean(payload.pickupStart).slice(0, 5);
  const end = clean(payload.pickupEnd).slice(0, 5);
  const time = start && end ? `${start}–${end}` : "";

  return [date ? formatPickupDate(date) : "", time].filter(Boolean).join(" · ");
}

function formatPickupCode(value: string | null | undefined) {
  const code = clean(value);
  return /^\d{6}$/.test(code) ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

type Price = { free: boolean; text: string };

function getPrice(amount: TransactionalEmailPayload["amount"]): Price | null {
  if (amount === null || amount === undefined || clean(amount) === "") return null;
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return null;
  if (value === 0) return { free: true, text: "უფასო · Free" };
  return { free: false, text: formatMoney(value) };
}

function boxDetail(payload: TransactionalEmailPayload): Detail {
  return {
    label: { ka: "ბოქსი", en: "Box" },
    value: clean(payload.offerTitle, "ლანჩ ბოქსი · Lunch Box"),
  };
}

function sellerDetail(payload: TransactionalEmailPayload): Detail {
  return {
    label: { ka: "გამყიდველი", en: "Sold by" },
    value: payload.businessName,
    note: payload.businessAddress,
  };
}

function pickupDetail(payload: TransactionalEmailPayload): Detail {
  return { label: { ka: "წაღება", en: "Pickup" }, value: formatPickup(payload) };
}

function pickupCodeDetail(payload: TransactionalEmailPayload): Detail {
  return {
    label: { ka: "წაღების კოდი", en: "Pickup code" },
    value: formatPickupCode(payload.pickupCode),
  };
}

function priceDetail(price: Price | null, refund = false): Detail {
  if (!price) return { label: { ka: "", en: "" }, value: null };
  if (price.free) return { label: { ka: "ფასი", en: "Price" }, value: price.text };
  return refund
    ? { label: { ka: "დაბრუნდება", en: "Refund" }, value: price.text }
    : { label: { ka: "გადახდილი", en: "Paid" }, value: price.text };
}

function orderNumberDetail(payload: TransactionalEmailPayload): Detail {
  const id = clean(payload.orderId);
  return {
    label: { ka: "შეკვეთა", en: "Order" },
    value: id ? `#${id}` : null,
  };
}

// Seller and operator: the business sells the food; we run the platform.
function sellerNotes(price: Price | null): Notes {
  const free = price?.free === true;
  return {
    ka: [
      "ლანჩ ბოქსს ამზადებს და ყიდის ბიზნესი, რომელიც საკვებზე პასუხს აგებს.",
      free
        ? `პლატფორმას მართავს არ გადააგდო (${OPERATOR_SHORT.ka}, ${OPERATOR_LOCATION.ka}).`
        : `პლატფორმას მართავს არ გადააგდო (${OPERATOR_SHORT.ka}, ${OPERATOR_LOCATION.ka}), გადახდას კი TBC ბანკი ამუშავებს.`,
    ],
    en: [
      "The business prepares and sells the food and is responsible for it.",
      free
        ? `ArGadaagdo (${OPERATOR_SHORT.en}, ${OPERATOR_LOCATION.en}) runs the platform.`
        : `ArGadaagdo (${OPERATOR_SHORT.en}, ${OPERATOR_LOCATION.en}) runs the platform; payment is processed by TBC Bank.`,
    ],
  };
}

// Cancellation and missed-pickup rules for an order that is still open.
function orderRuleNotes(price: Price | null): Notes {
  const seller = sellerNotes(price);
  const free = price?.free === true;
  return {
    ka: [
      free
        ? "ჯავშნის გაუქმება „შეკვეთებიდან“ შეგიძლია წაღების დაწყებამდე არაუგვიანეს 2 საათისა."
        : "ჯავშნის გაუქმება „შეკვეთებიდან“ შეგიძლია წაღების დაწყებამდე არაუგვიანეს 2 საათისა. სრული თანხა იმავე ბარათზე დაგიბრუნდება.",
      free
        ? "თუ შეკვეთას წაღების დროს არ წაიღებ, ბიზნესმა შეიძლება მაინც გადმოგცეს, მაგრამ ვალდებული არ არის."
        : "თუ შეკვეთას წაღების დროს არ წაიღებ, თანხა არ ბრუნდება (ბიზნესმა შეიძლება მაინც გადმოგცეს, მაგრამ ვალდებული არ არის).",
      ...seller.ka,
    ],
    en: [
      free
        ? "You can cancel in Orders until 2 hours before pickup starts."
        : "You can cancel in Orders until 2 hours before pickup starts, for a full refund to the same card.",
      free
        ? "If you miss the pickup window, the business may still hand it over, but doesn't have to."
        : "If you miss the pickup window, there's no refund (the business may still hand it over, but doesn't have to).",
      ...seller.en,
    ],
    legalLinks: true,
  };
}

function refundNotes(price: Price | null): Notes {
  const seller = sellerNotes(price);
  if (price?.free) return { ...seller, legalLinks: true };
  return {
    ka: [
      "თანხა დაგიბრუნდება იმავე ბარათზე ან ანგარიშზე, რომლითაც გადაიხადე. დაბრუნებას TBC ბანკი ამუშავებს, ანგარიშზე ასახვის დრო კი შენს ბანკზეა დამოკიდებული.",
      ...seller.ka,
    ],
    en: [
      "The refund goes to the same card or account you paid with. TBC Bank processes it; when it appears depends on your bank.",
      ...seller.en,
    ],
    legalLinks: true,
  };
}

// ---------------------------------------------------------------------------
// HTML

function renderDetails(details: Detail[]) {
  const rows = details
    .filter((detail) => clean(detail.value))
    .map((detail) => {
      const note = clean(detail.note);
      return `
    <tr>
      <td style="padding:10px 12px 10px 0;vertical-align:top;white-space:nowrap;color:#9dbfa8;font-size:14px;line-height:1.4;font-weight:500;">${escapeHtml(
        detail.label.ka
      )}<br /><span lang="en" style="font-size:12px;color:#7fa18b;">${escapeHtml(
        detail.label.en
      )}</span></td>
      <td style="padding:10px 0;vertical-align:top;color:#f4efe4;font-size:14px;line-height:1.4;font-weight:600;text-align:right;">${escapeHtml(
        clean(detail.value)
      )}${
        note
          ? `<br /><span style="font-size:13px;font-weight:400;color:#c3ddcb;">${escapeHtml(note)}</span>`
          : ""
      }</td>
    </tr>
  `;
    })
    .join("");

  if (!rows) return "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-top:1px solid #2e5a4c;border-bottom:1px solid #2e5a4c;">${rows}</table>`;
}

function renderAction(action: EmailContent["action"]) {
  const url = clean(action?.url);
  const label = clean(action?.label);
  if (!url || !label) return "";

  return `
    <a
      href="${escapeHtml(url)}"
      style="display:inline-block;margin-top:24px;border-radius:14px;background:#daf1de;color:#051f20;font-size:15px;font-weight:600;text-decoration:none;padding:14px 22px;"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

function renderNoteBlock(
  language: "ka" | "en",
  heading: string,
  lines: string[],
  links: Array<[string, string]>
) {
  const items = lines
    .map(
      (line) => `
          <tr>
            <td style="width:16px;padding:6px 0 0;vertical-align:top;color:#9dbfa8;font-size:14px;line-height:1.55;">•</td>
            <td style="padding:6px 0 0;vertical-align:top;color:#c3ddcb;font-size:14px;line-height:1.55;">${escapeHtml(
              line
            )}</td>
          </tr>`
    )
    .join("");

  const linkRow = links.length
    ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#9dbfa8;">${links
        .map(
          ([label, url]) =>
            `<a href="${escapeHtml(url)}" style="color:#daf1de;font-weight:600;text-decoration:underline;">${escapeHtml(
              label
            )}</a>`
        )
        .join(" &nbsp;·&nbsp; ")}</p>`
    : "";

  return `
      <td lang="${language}" style="padding:18px 20px;">
        <p style="margin:0;color:#daf1de;font-size:14px;line-height:1.4;font-weight:600;">${escapeHtml(
          heading
        )}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items}</table>
        ${linkRow}
      </td>`;
}

function legalLinks(language: "ka" | "en"): Array<[string, string]> {
  return language === "ka"
    ? [
        ["გამოყენების წესები", absoluteSiteUrl("/terms")],
        ["თანხის დაბრუნების პოლიტიკა", absoluteSiteUrl("/refund-policy")],
      ]
    : [
        ["Terms", absoluteSiteUrl("/terms")],
        ["Refund policy", absoluteSiteUrl("/refund-policy")],
      ];
}

function renderNotes(notes: Notes | undefined) {
  if (!notes || (notes.ka.length === 0 && notes.en.length === 0)) return "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;background:#0b2b26;border-radius:16px;" bgcolor="#0b2b26">
      <tr>${renderNoteBlock(
        "ka",
        "კარგია იცოდე",
        notes.ka,
        notes.legalLinks ? legalLinks("ka") : []
      )}
      </tr>
      <tr>
        <td style="padding:0 20px;"><div style="height:1px;line-height:1px;font-size:1px;background:#2e5a4c;">&nbsp;</div></td>
      </tr>
      <tr>${renderNoteBlock(
        "en",
        "Good to know",
        notes.en,
        notes.legalLinks ? legalLinks("en") : []
      )}
      </tr>
    </table>
  `;
}

function renderFooter(footer: Bilingual | undefined) {
  const mail = `<a href="mailto:${SUPPORT_EMAIL}" style="color:#daf1de;font-weight:600;text-decoration:none;">${SUPPORT_EMAIL}</a>`;
  const style =
    "margin:6px 0 0;color:#9dbfa8;font-size:13px;line-height:1.6;font-weight:400;";

  return `
    <div style="margin-top:26px;">
      ${
        footer
          ? `<p style="${style}">${escapeHtml(footer.ka)}</p><p lang="en" style="${style}">${escapeHtml(
              footer.en
            )}</p>`
          : ""
      }
      <p style="${style}">კითხვები? მოგვწერე: ${mail}</p>
      <p lang="en" style="${style}">Questions? Write to us at ${mail}</p>
      <p style="margin:14px 0 0;color:#7fa18b;font-size:12px;line-height:1.6;">არ გადააგდო · ArGadaagdo &nbsp;·&nbsp; ${escapeHtml(
        OPERATOR_LOCATION.ka
      )} · ${escapeHtml(OPERATOR_LOCATION.en)}</p>
    </div>
  `;
}

function renderLayout(content: EmailContent) {
  const { preview, title, intro } = content;

  return `
    <!doctype html>
    <html lang="ka">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>${escapeHtml(bilingualLabel(title))}</title>
      </head>
      <body style="margin:0;background:#051f20;font-family:${FONT_STACK};color:#f4efe4;" bgcolor="#051f20">
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
                        <td style="font-size:15px;font-weight:600;letter-spacing:.02em;color:#daf1de;">არ გადააგდო · ArGadaagdo</td>
                      </tr>
                    </table>
                    <h1 style="margin:16px 0 0;font-size:26px;line-height:1.25;font-weight:600;color:#f4efe4;">${escapeHtml(
                      title.ka
                    )}</h1>
                    <p lang="en" style="margin:6px 0 0;font-size:17px;line-height:1.35;font-weight:500;color:#9dbfa8;">${escapeHtml(
                      title.en
                    )}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0;color:#c3ddcb;font-size:16px;line-height:1.6;font-weight:400;">${escapeHtml(
                      intro.ka
                    )}</p>
                    <p lang="en" style="margin:12px 0 0;color:#9dbfa8;font-size:15px;line-height:1.6;font-weight:400;">${escapeHtml(
                      intro.en
                    )}</p>
                    ${content.details ? renderDetails(content.details) : ""}
                    ${renderAction(content.action)}
                    ${renderNotes(content.notes)}
                    ${renderFooter(content.footer)}
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

// ---------------------------------------------------------------------------
// Plain text

function buildTextEmail(content: EmailContent) {
  const { title, intro, details, action, notes, footer } = content;

  const detailLines = (details || [])
    .filter((detail) => clean(detail.value))
    .map((detail) => {
      const value = [clean(detail.value), clean(detail.note)]
        .filter(Boolean)
        .join(", ");
      return `${bilingualLabel(detail.label)}: ${value}`;
    })
    .join("\n");

  const noteBlock = (language: "ka" | "en", heading: string, lines: string[]) =>
    [
      heading,
      ...lines.map((line) => `- ${line}`),
      ...(notes?.legalLinks
        ? legalLinks(language).map(([label, url]) => `${label}: ${url}`)
        : []),
    ].join("\n");

  return [
    `${title.ka}\n${title.en}`,
    intro.ka,
    intro.en,
    detailLines,
    action?.url && action.label ? `${action.label}: ${action.url}` : "",
    notes?.ka.length ? noteBlock("ka", "კარგია იცოდე", notes.ka) : "",
    notes?.en.length ? noteBlock("en", "Good to know", notes.en) : "",
    footer ? `${footer.ka}\n${footer.en}` : "",
    `კითხვები? მოგვწერე: ${SUPPORT_EMAIL}\nQuestions? Write to us at ${SUPPORT_EMAIL}`,
    "არ გადააგდო · ArGadaagdo",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildEmail(content: EmailContent): TransactionalEmailTemplate {
  return {
    subject: content.subject,
    preview: content.preview,
    html: renderLayout(content),
    text: buildTextEmail(content),
  };
}

function ordersAction(payload: TransactionalEmailPayload, label: Bilingual) {
  return {
    url: clean(payload.actionUrl, absoluteSiteUrl("/orders")),
    label: clean(payload.actionLabel, bilingualLabel(label)),
  };
}

// ---------------------------------------------------------------------------

export function buildTransactionalEmailTemplate(
  event: TransactionalEmailEvent,
  payload: TransactionalEmailPayload
): TransactionalEmailTemplate {
  const businessName = clean(payload.businessName);
  const price = getPrice(payload.amount);
  // "Subject · Subject: Place", so two orders don't thread together.
  const withPlace = (subject: string) =>
    businessName ? `${subject}: ${businessName}` : subject;

  switch (event) {
    case "account_verification": {
      return buildEmail({
        subject: "დაადასტურე ელფოსტა · Confirm your email",
        preview:
          "დაადასტურე ელფოსტა და დაასრულე რეგისტრაცია. Confirm your email to finish signing up.",
        title: { ka: "დაადასტურე ელფოსტა", en: "Confirm your email" },
        intro: {
          ka: "რეგისტრაციის დასასრულებლად დაადასტურე შენი ელფოსტა.",
          en: "Confirm your email address to finish creating your ArGadaagdo account.",
        },
        action: {
          url: clean(payload.actionUrl),
          label: clean(payload.actionLabel, "ელფოსტის დადასტურება · Verify email"),
        },
        footer: {
          ka: "თუ ეს ანგარიში შენ არ შეგიქმნია, უბრალოდ უგულებელყავი ეს წერილი.",
          en: "If you didn't create this account, you can ignore this email.",
        },
      });
    }

    case "password_reset": {
      return buildEmail({
        subject: "პაროლის აღდგენა · Reset your password",
        preview: "აირჩიე ახალი პაროლი. Choose a new password.",
        title: { ka: "პაროლის აღდგენა", en: "Reset your password" },
        intro: {
          ka: "ახალი პაროლის ასარჩევად გამოიყენე ქვემოთ მოცემული დაცული ბმული.",
          en: "Use the secure link below to choose a new password for your account.",
        },
        action: {
          url: clean(payload.actionUrl),
          label: clean(payload.actionLabel, "პაროლის აღდგენა · Reset password"),
        },
        footer: {
          ka: "თუ პაროლის აღდგენა შენ არ მოგითხოვია, უბრალოდ უგულებელყავი ეს წერილი.",
          en: "If you didn't ask to reset your password, you can ignore this email.",
        },
      });
    }

    case "reservation_confirmation": {
      return buildEmail({
        subject: withPlace("შეკვეთა დადასტურდა · Order confirmed"),
        preview:
          "შენი ჯავშანი დადასტურდა. წაღების კოდი შიგნითაა. Your order is confirmed; your pickup code is inside.",
        title: { ka: "შეკვეთა დადასტურდა", en: "Order confirmed" },
        intro: {
          ka: "შენი ჯავშანი დადასტურდა! ლანჩ ბოქსი მითითებულ დროს წაიღე და თანამშრომელს წაღების კოდი აჩვენე.",
          en: "Your reservation is confirmed! Collect your Lunch Box during the pickup window and show your pickup code to the staff.",
        },
        details: [
          boxDetail(payload),
          sellerDetail(payload),
          pickupDetail(payload),
          pickupCodeDetail(payload),
          priceDetail(price),
          orderNumberDetail(payload),
        ],
        action: ordersAction(payload, { ka: "შეკვეთის ნახვა", en: "View order" }),
        notes: orderRuleNotes(price),
      });
    }

    case "reservation_cancellation": {
      const intro: Bilingual = price?.free
        ? {
            ka: "შენი ჯავშანი გაუქმდა. შეკვეთა უფასო იყო, ამიტომ დასაბრუნებელი თანხა არ არის.",
            en: "Your reservation is cancelled. The order was free, so there's nothing to refund.",
          }
        : price
          ? {
              ka: `შენი ჯავშანი გაუქმდა. ${price.text} სრულად დაგიბრუნდება.`,
              en: `Your reservation is cancelled, and you'll get the full ${price.text} back.`,
            }
          : {
              ka: "შენი ჯავშანი გაუქმდა. გადახდილი თანხა სრულად დაგიბრუნდება.",
              en: "Your reservation is cancelled, and you'll get the full amount back.",
            };

      return buildEmail({
        subject: withPlace("შეკვეთა გაუქმდა · Order cancelled"),
        preview: `${intro.ka} ${intro.en}`,
        title: { ka: "შეკვეთა გაუქმდა", en: "Order cancelled" },
        intro,
        details: [
          boxDetail(payload),
          sellerDetail(payload),
          pickupDetail(payload),
          priceDetail(price, true),
          orderNumberDetail(payload),
        ],
        action: ordersAction(payload, { ka: "შეკვეთების ნახვა", en: "View orders" }),
        notes: refundNotes(price),
        footer: {
          ka: "გაუქმებული შეკვეთები ისტორიაში რჩება, ასე რომ ყოველთვის ნახავ, რა მოხდა.",
          en: "Cancelled orders stay in your history so you can review what happened.",
        },
      });
    }

    case "business_approval": {
      const actionUrl = clean(payload.actionUrl, absoluteBusinessUrl("/business/dashboard"));
      return buildEmail({
        subject: withPlace("ბიზნესი დამტკიცდა · Business approved"),
        preview:
          "შენი ბიზნესი დამტკიცდა, უკვე შეგიძლია ლანჩ ბოქსების გამოქვეყნება. Your business can now publish Lunch Boxes.",
        title: { ka: "ბიზნესი დამტკიცდა", en: "Business approved" },
        intro: {
          ka: businessName
            ? `„${businessName}“ დამტკიცდა! გახსენი პანელი და გამოაქვეყნე პირველი ლანჩ ბოქსი.`
            : "შენი ბიზნესი დამტკიცდა! გახსენი პანელი და გამოაქვეყნე პირველი ლანჩ ბოქსი.",
          en: businessName
            ? `${businessName} is approved. Open your dashboard and publish your first Lunch Box.`
            : "Your business is approved. Open your dashboard and publish your first Lunch Box.",
        },
        details: [{ label: { ka: "ბიზნესი", en: "Business" }, value: businessName }],
        action: {
          url: actionUrl,
          label: clean(payload.actionLabel, "პანელის გახსნა · Open dashboard"),
        },
      });
    }

    case "business_rejection": {
      const actionUrl = clean(payload.actionUrl, absoluteBusinessUrl("/business/dashboard"));
      return buildEmail({
        subject: withPlace("განაცხადი არ დამტკიცდა · Application not approved"),
        preview: "განაცხადი არ დამტკიცდა. გადახედე მიზეზს და ხელახლა გაგზავნე.",
        title: { ka: "განაცხადი არ დამტკიცდა", en: "Application not approved" },
        intro: {
          ka: businessName
            ? `ბიზნესის „${businessName}“ განაცხადი ვერ დავამტკიცეთ. გადახედე მიზეზს, გაასწორე დეტალები და პანელიდან ხელახლა გაგზავნე დასამტკიცებლად.`
            : "შენი ბიზნესის განაცხადი ვერ დავამტკიცეთ. გადახედე მიზეზს, გაასწორე დეტალები და პანელიდან ხელახლა გაგზავნე დასამტკიცებლად.",
          en: businessName
            ? `Your application for ${businessName} was not approved. Please read the reason, edit the details and resubmit from your dashboard.`
            : "Your business application was not approved. Please read the reason, edit the details and resubmit from your dashboard.",
        },
        details: [
          { label: { ka: "მიზეზი", en: "Reason" }, value: payload.rejectionReason },
        ],
        action: {
          url: actionUrl,
          label: clean(payload.actionLabel, "პანელის გახსნა · Open dashboard"),
        },
      });
    }

    case "pickup_reminder": {
      return buildEmail({
        subject: withPlace("წაღების შეხსენება · Pickup reminder"),
        preview:
          "არ დაგავიწყდეს ლანჩ ბოქსის წაღება. Don't forget to collect your Lunch Box.",
        title: { ka: "არ დაგავიწყდეს წაღება", en: "Pickup reminder" },
        intro: {
          ka: "წაღების დრო ახლოვდება! მიდი ბიზნესში მითითებულ დროს და თანამშრომელს წაღების კოდი აჩვენე.",
          en: "Your pickup window is coming up. Go to the business during the pickup window and show your pickup code to the staff.",
        },
        details: [
          boxDetail(payload),
          sellerDetail(payload),
          pickupDetail(payload),
          pickupCodeDetail(payload),
          priceDetail(price),
          orderNumberDetail(payload),
        ],
        action: ordersAction(payload, { ka: "კოდის ნახვა", en: "View code" }),
        notes: orderRuleNotes(price),
      });
    }

    case "pickup_completed": {
      return buildEmail({
        subject: withPlace("შეკვეთა წაღებულია · Pickup completed"),
        preview: "მადლობა, რომ საკვები გადაარჩინე! Thanks for rescuing food!",
        title: { ka: "შეკვეთა წაღებულია", en: "Pickup completed" },
        intro: {
          ka: "მადლობა, რომ ლანჩ ბოქსი წაიღე! შეკვეთა დასრულებულად მოინიშნა.",
          en: "Thanks for collecting your Lunch Box! Your order is marked as completed.",
        },
        details: [
          boxDetail(payload),
          sellerDetail(payload),
          priceDetail(price),
          orderNumberDetail(payload),
        ],
        action: ordersAction(payload, { ka: "შეკვეთის ნახვა", en: "View order" }),
        notes: { ...sellerNotes(price), legalLinks: true },
      });
    }

    case "rating_reminder": {
      return buildEmail({
        subject: withPlace("შეაფასე წაღება · Rate your pickup"),
        preview:
          "როგორი იყო წაღება? შეაფასე ბიზნესი. How was your pickup? Rate the business.",
        title: { ka: "როგორი იყო წაღება?", en: "How was your pickup?" },
        intro: {
          ka: "შენი შეფასება სხვა მომხმარებლებს არჩევანის გაკეთებაში ეხმარება, ბიზნესს კი — გაუმჯობესებაში.",
          en: "Your rating helps other customers choose where to pick up and helps the business improve.",
        },
        details: [
          boxDetail(payload),
          { label: { ka: "ბიზნესი", en: "Business" }, value: businessName },
          orderNumberDetail(payload),
        ],
        action: ordersAction(payload, { ka: "შეკვეთის შეფასება", en: "Rate order" }),
      });
    }

    default: {
      const exhaustiveCheck: never = event;
      throw new Error(`Unsupported email event: ${exhaustiveCheck}`);
    }
  }
}
