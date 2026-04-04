use lettre::{
    message::{header::ContentType, Mailbox, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use serde::Deserialize;
use sqlx::PgPool;

use crate::{
    config::Config,
    error::AppError,
    models::order::{Order, OrderItem},
  repositories::settings_repo,
};

const DEFAULT_ORDER_EMAIL_SUBJECT: &str = "[Handmade Haven] Order confirmed — {order_code}";
const DEFAULT_ORDER_EMAIL_INTRO: &str = "We have received your order and will prepare it for delivery as soon as possible.";
const DEFAULT_ORDER_EMAIL_FOOTER: &str = "Thank you for your support!";

// ─── Cloudflare Turnstile ────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct TurnstileResponse {
    success: bool,
    #[serde(rename = "error-codes")]
    error_codes: Option<Vec<String>>,
}

/// Verify a Cloudflare Turnstile challenge token against the siteverify API.
/// Returns `true` if the token is valid, `false` if not.
pub async fn verify_turnstile(secret_key: &str, token: &str) -> Result<bool, AppError> {
    let client = reqwest::Client::new();

    let response: TurnstileResponse = client
        .post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
        .form(&[("secret", secret_key), ("response", token)])
        .send()
        .await?
        .json()
        .await?;

    if !response.success {
        let codes = response.error_codes.unwrap_or_default().join(", ");
        tracing::warn!("Turnstile verification failed: {codes}");
    }

    Ok(response.success)
}

// ─── SMTP transport ───────────────────────────────────────────────────────────

/// Build an async SMTP mailer from runtime configuration.
///
/// Uses STARTTLS by default (typically port 587). If your infrastructure uses SMTPS 465,
/// initialize the transport with the appropriate strategy.
pub fn build_mailer(config: &Config) -> Result<AsyncSmtpTransport<Tokio1Executor>, AppError> {
    let creds = Credentials::new(config.smtp_username.clone(), config.smtp_password.clone());

    // Use STARTTLS (port 587) for Gmail. For port 465 use ::relay instead.
    let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.smtp_host)
        .map_err(|e| AppError::Email(format!("SMTP relay error: {e}")))?
        .credentials(creds)
        .port(config.smtp_port)
        .build();

    Ok(mailer)
}

// ─── Admin notification ───────────────────────────────────────────────────────

/// Send a notification email to the shop admin when a contact form is submitted.
pub async fn send_admin_notification(
    config: &Config,
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    name: &str,
    sender_email: &str,
    phone: Option<&str>,
    message: &str,
) -> Result<(), AppError> {
    let phone_display = phone.unwrap_or("Not provided");
    let html = admin_notification_html(name, sender_email, phone_display, message);

    let from: Mailbox = format!(
        "{} <{}>",
        config.contact_from_name, config.contact_from_email
    )
    .parse()
    .map_err(|e| AppError::Email(format!("Invalid from address: {e}")))?;

    let to: Mailbox = config
        .contact_admin_email
        .parse()
        .map_err(|e| AppError::Email(format!("Invalid admin email: {e}")))?;

    let email = Message::builder()
        .from(from)
        .to(to)
        .reply_to(
            format!("{name} <{sender_email}>")
                .parse()
                .map_err(|e| AppError::Email(format!("Invalid reply-to: {e}")))?,
        )
        .subject(format!("[Handmade Haven] New contact from {name}"))
        .multipart(
            MultiPart::alternative().singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_HTML)
                    .body(html),
            ),
        )
        .map_err(|e| AppError::Email(format!("Failed to build admin email: {e}")))?;

    mailer
        .send(email)
        .await
        .map_err(|e| AppError::Email(format!("Failed to send admin notification: {e}")))?;

    tracing::info!("Admin notification sent for contact from {sender_email}");
    Ok(())
}

// ─── Auto-reply to sender ─────────────────────────────────────────────────────

/// Send an auto-reply to the person who submitted the contact form.
pub async fn send_auto_reply(
    config: &Config,
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    recipient_name: &str,
    recipient_email: &str,
) -> Result<(), AppError> {
    let html = auto_reply_html(recipient_name);

    let from: Mailbox = format!(
        "{} <{}>",
        config.contact_from_name, config.contact_from_email
    )
    .parse()
    .map_err(|e| AppError::Email(format!("Invalid from address: {e}")))?;

    let to: Mailbox = format!("{recipient_name} <{recipient_email}>")
        .parse()
        .map_err(|e| AppError::Email(format!("Invalid recipient address: {e}")))?;

    let email = Message::builder()
        .from(from)
        .to(to)
        .subject("[Handmade Haven] We received your message!")
        .multipart(
            MultiPart::alternative().singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_HTML)
                    .body(html),
            ),
        )
        .map_err(|e| AppError::Email(format!("Failed to build auto-reply: {e}")))?;

    mailer
        .send(email)
        .await
        .map_err(|e| AppError::Email(format!("Failed to send auto-reply: {e}")))?;

    tracing::info!("Auto-reply sent to {recipient_email}");
    Ok(())
}

// ─── Order confirmation email ─────────────────────────────────────────────────

/// Send an order confirmation email to the customer after a successful purchase.
pub async fn send_order_confirmation(
    config: &Config,
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
  db: &PgPool,
    order: &Order,
    items: &[OrderItem],
) -> Result<(), AppError> {
  let settings = settings_repo::get_by_keys(
    db,
    &["email_order_subject", "email_order_intro", "email_footer"],
  )
  .await
  .unwrap_or_default();

  let subject_template = settings
    .get("email_order_subject")
    .map(|v| v.trim())
    .filter(|v| !v.is_empty())
    .unwrap_or(DEFAULT_ORDER_EMAIL_SUBJECT);

  let intro_template = settings
    .get("email_order_intro")
    .map(|v| v.trim())
    .filter(|v| !v.is_empty())
    .unwrap_or(DEFAULT_ORDER_EMAIL_INTRO);

  let footer_template = settings
    .get("email_footer")
    .map(|v| v.trim())
    .filter(|v| !v.is_empty())
    .unwrap_or(DEFAULT_ORDER_EMAIL_FOOTER);

  let subject = subject_template.replace("{order_code}", &order.order_code);
  let intro_html = html_multiline(intro_template.replace("{order_code}", &order.order_code).as_str());
  let footer_html = html_multiline(footer_template.replace("{order_code}", &order.order_code).as_str());

  let html = order_confirmation_html(order, items, &intro_html, &footer_html);

    let from: Mailbox = format!(
        "{} <{}>",
        config.contact_from_name, config.contact_from_email
    )
    .parse()
    .map_err(|e| AppError::Email(format!("Invalid from address: {e}")))?;

    let to: Mailbox = format!("{} <{}>", order.customer_name, order.customer_email)
        .parse()
        .map_err(|e| AppError::Email(format!("Invalid recipient address: {e}")))?;

    let email = Message::builder()
        .from(from)
        .to(to)
        .subject(subject)
        .multipart(
            MultiPart::alternative().singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_HTML)
                    .body(html),
            ),
        )
        .map_err(|e| AppError::Email(format!("Failed to build order confirmation: {e}")))?;

    mailer
        .send(email)
        .await
        .map_err(|e| AppError::Email(format!("Failed to send order confirmation: {e}")))?;

    tracing::info!(
        "Order confirmation sent to {} for order {}",
        order.customer_email,
        order.order_code
    );
    Ok(())
}

// ─── HTML templates ───────────────────────────────────────────────────────────

fn admin_notification_html(name: &str, email: &str, phone: &str, message: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Message</title>
</head>
<body style="margin:0;padding:0;background:#f9f0f3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f0f3;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e8688a,#c4547a);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px;">
                ✉️ New Contact Message
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px;">
                Handmade Haven — Customer Inquiry
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Full Name</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#1a1a1a;">{name}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Email</p>
                    <p style="margin:0;">
                      <a href="mailto:{email}" style="font-size:16px;color:#e8688a;text-decoration:none;">{email}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Phone</p>
                    <p style="margin:0;font-size:16px;color:#1a1a1a;">{phone}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Message</p>
                    <div style="background:#fdf6f8;border-left:3px solid #e8688a;border-radius:0 8px 8px 0;padding:16px 20px;">
                      <p style="margin:0;font-size:15px;line-height:1.7;color:#333;">{message}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#fdf6f8;padding:20px 40px;text-align:center;border-top:1px solid #f0dde5;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                This email was generated automatically by Handmade Haven contact system.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"#
    )
}

fn escape_html(input: &str) -> String {
  input
    .replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
    .replace('\'', "&#39;")
}

fn html_multiline(input: &str) -> String {
  escape_html(input).replace('\n', "<br />")
}

fn order_confirmation_html(order: &Order, items: &[OrderItem], intro_html: &str, footer_html: &str) -> String {
    let items_html: String = items
        .iter()
        .map(|item| {
            let variant_badge = if !item.variant.is_empty() {
                format!(
                    r#"<span style="background:#fdf6f8;border:1px solid #f0dde5;border-radius:4px;
                       padding:2px 8px;font-size:11px;color:#c4547a;margin-left:8px;">{}</span>"#,
                    item.variant
                )
            } else {
                String::new()
            };

            format!(
                r#"<tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f5f5f5;vertical-align:top;">
                    <strong style="color:#1a1a1a;">{product_name}</strong>{variant_badge}
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #f5f5f5;text-align:center;color:#555;">
                    x{quantity}
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #f5f5f5;text-align:right;
                             color:#e8688a;font-weight:600;white-space:nowrap;">
                    {subtotal}
                  </td>
                </tr>"#,
                product_name = item.product_name,
                variant_badge = variant_badge,
                quantity = item.quantity,
                subtotal = format_vnd(item.subtotal),
            )
        })
        .collect();

    let payment_label = match order.payment_method.as_str() {
        "cod" => "Cash on Delivery (COD)",
        "bank_transfer" => "Bank Transfer",
        "wallet" => "E-Wallet",
        _ => &order.payment_method,
    };

    let note_row = if let Some(note) = &order.note {
        if !note.is_empty() {
            format!(
                r#"<tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Note</p>
                    <p style="margin:0;font-size:15px;color:#555;">{note}</p>
                  </td>
                </tr>"#
            )
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    let created_at = order.created_at.format("%d/%m/%Y %H:%M").to_string();

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f9f0f3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f0f3;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e8688a,#c4547a);padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">🎉</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
                Order Confirmed!
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,.9);font-size:15px;">
                Thank you for shopping with Handmade Haven
              </p>
            </td>
          </tr>

          <!-- Order code banner -->
          <tr>
            <td style="background:#fdf6f8;padding:20px 40px;text-align:center;border-bottom:1px solid #f0dde5;">
              <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#999;">
                Your Order Code
              </p>
              <p style="margin:0;font-size:26px;font-weight:700;color:#c4547a;letter-spacing:2px;">
                {order_code}
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:#aaa;">{created_at}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              <!-- Greeting -->
              <p style="margin:0 0 24px;font-size:16px;color:#333;">
                Dear <strong style="color:#e8688a;">{customer_name}</strong>,<br />
                {intro_html}
              </p>

              <!-- Customer details -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Delivery Information</p>
                    <p style="margin:0;font-size:15px;color:#333;font-weight:600;">{customer_name}</p>
                    <p style="margin:4px 0;font-size:14px;color:#555;">{customer_phone}</p>
                    <p style="margin:4px 0;font-size:14px;color:#555;">{customer_email}</p>
                    <p style="margin:4px 0;font-size:14px;color:#555;">{address}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Payment Method</p>
                    <p style="margin:0;font-size:15px;color:#333;">{payment_label}</p>
                  </td>
                </tr>
                {note_row}
              </table>

              <!-- Order items -->
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;">
                Order Items
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <thead>
                  <tr>
                    <th style="text-align:left;font-size:12px;color:#999;font-weight:500;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Product</th>
                    <th style="text-align:center;font-size:12px;color:#999;font-weight:500;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Qty</th>
                    <th style="text-align:right;font-size:12px;color:#999;font-weight:500;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items_html}
                </tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#fdf6f8;border-radius:8px;padding:16px 20px;">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#555;">Subtotal</td>
                  <td style="padding:6px 0;font-size:14px;color:#555;text-align:right;">{subtotal}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#555;">Shipping</td>
                  <td style="padding:6px 0;font-size:14px;color:#555;text-align:right;">{shipping_fee}</td>
                </tr>
                <tr>
                  <td style="padding-top:12px;border-top:1px solid #f0dde5;font-size:16px;font-weight:700;color:#1a1a1a;">
                    Total
                  </td>
                  <td style="padding-top:12px;border-top:1px solid #f0dde5;font-size:18px;font-weight:700;
                             color:#e8688a;text-align:right;">
                    {total}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fdf6f8;padding:24px 40px;text-align:center;border-top:1px solid #f0dde5;">
              <p style="margin:0 0 6px;font-size:14px;color:#555;">
                {footer_html}
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#aaa;">
                &copy; Handmade Haven — Crafted with love in Vietnam
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"#,
        order_code = order.order_code,
        created_at = created_at,
        customer_name = order.customer_name,
        customer_phone = order.customer_phone,
        customer_email = order.customer_email,
        address = order.address,
        payment_label = payment_label,
        intro_html = intro_html,
        footer_html = footer_html,
        note_row = note_row,
        items_html = items_html,
        subtotal = format_vnd(order.subtotal),
        shipping_fee = format_vnd(order.shipping_fee),
        total = format_vnd(order.total),
    )
}

fn format_vnd(amount: i64) -> String {
    // Format as "185.000 ₫"
    let s = amount.to_string();
    let chars: Vec<char> = s.chars().collect();
    let mut result = String::new();
    for (i, c) in chars.iter().enumerate() {
        if i > 0 && (chars.len() - i) % 3 == 0 {
            result.push('.');
        }
        result.push(*c);
    }
    format!("{result} ₫")
}

// ─── Order status-update email ────────────────────────────────────────────────

/// Send an email to the customer when the admin updates an order's status.
pub async fn send_order_status_update(
    config: &Config,
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    order: &Order,
    new_status: &str,
    note: Option<&str>,
) -> Result<(), AppError> {
    let from: Mailbox = format!("Handmade Haven <{}>", config.smtp_username)
        .parse()
        .map_err(|e| AppError::Internal(format!("Invalid from address: {e}")))?;

    let to: Mailbox = order
        .customer_email
        .parse()
        .map_err(|_| AppError::BadRequest("Invalid customer email".into()))?;

    let (subject_label, emoji) = match new_status {
        "confirmed" => ("Đã được xác nhận", "✅"),
        "shipping" => ("Đang được giao đến bạn", "🚚"),
        "delivered" => ("Đã giao hàng thành công", "🎉"),
        "cancelled" => ("Đã bị huỷ", "❌"),
        _ => ("Đã được cập nhật", "📦"),
    };

    let subject = format!(
        "[{}] Đơn hàng {} {}",
        emoji, order.order_code, subject_label
    );
    let html = order_status_update_html(order, new_status, subject_label, note);

    let email = Message::builder()
        .from(from)
        .to(to)
        .subject(&subject)
        .multipart(
            MultiPart::alternative().singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_HTML)
                    .body(html),
            ),
        )
        .map_err(|e| AppError::Internal(format!("Build email error: {e}")))?;

    mailer
        .send(email)
        .await
        .map_err(|e| AppError::Internal(format!("SMTP send error: {e}")))?;

    Ok(())
}

fn order_status_update_html(
    order: &Order,
    status: &str,
    label: &str,
    note: Option<&str>,
) -> String {
    let (accent_color, bg_color, status_emoji) = match status {
        "confirmed" => ("#10b981", "#f0fdf4", "✅"),
        "shipping" => ("#3b82f6", "#eff6ff", "🚚"),
        "delivered" => ("#e8688a", "#fdf6f8", "🎉"),
        "cancelled" => ("#ef4444", "#fef2f2", "❌"),
        _ => ("#6b7280", "#f9fafb", "📦"),
    };

    let note_block = if let Some(n) = note {
        if !n.is_empty() {
            format!(
                r#"<tr>
                  <td style="padding:16px 24px;border-top:1px solid #f0f0f0;">
                    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;
                               letter-spacing:.8px;color:#999;">Ghi chú từ cửa hàng</p>
                    <p style="margin:0;font-size:14px;color:#555;font-style:italic;">{n}</p>
                  </td>
                </tr>"#
            )
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    format!(
        r#"<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Cập nhật đơn hàng</title>
</head>
<body style="margin:0;padding:0;background:#f9f0f3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f0f3;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e8688a,#c4547a);padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">{status_emoji}</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Cập nhật đơn hàng</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,.9);font-size:15px;">
                Handmade Haven
              </p>
            </td>
          </tr>
          <!-- Status badge -->
          <tr>
            <td style="background:{bg_color};padding:20px 40px;text-align:center;border-bottom:1px solid #f0f0f0;">
              <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#999;">
                Mã đơn hàng
              </p>
              <p style="margin:0 0 12px;font-size:24px;font-weight:700;color:#c4547a;letter-spacing:2px;">
                {order_code}
              </p>
              <span style="background:{accent_color};color:#fff;padding:6px 20px;border-radius:20px;
                           font-size:14px;font-weight:600;">{label}</span>
            </td>
          </tr>
          <!-- Customer + summary -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;">
                Xin chào <strong style="color:#e8688a;">{customer_name}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#555;">
                Trạng thái đơn hàng <strong>{order_code}</strong> của bạn vừa được cập nhật.
              </p>
            </td>
          </tr>
          <!-- Details table -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 24px;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Người nhận</p>
                    <p style="margin:0;font-size:15px;color:#333;font-weight:600;">{customer_name}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#555;">{address}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#999;">Tổng tiền</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#e8688a;">{total}</p>
                  </td>
                </tr>
                {note_block}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#fdf6f8;padding:24px 40px;text-align:center;border-top:1px solid #f0dde5;">
              <p style="margin:0 0 6px;font-size:14px;color:#555;">
                Câu hỏi? Liên hệ
                <a href="mailto:hello@handmadehaven.vn" style="color:#e8688a;text-decoration:none;">
                  hello@handmadehaven.vn
                </a>
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#aaa;">
                &copy; Handmade Haven — Crafted with love in Vietnam
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"#,
        status_emoji = status_emoji,
        bg_color = bg_color,
        accent_color = accent_color,
        label = label,
        order_code = order.order_code,
        customer_name = order.customer_name,
        address = order.address,
        total = format_vnd(order.total),
        note_block = note_block,
    )
}

fn auto_reply_html(name: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>We received your message</title>
</head>
<body style="margin:0;padding:0;background:#f9f0f3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f0f3;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e8688a,#c4547a);padding:40px;text-align:center;">
              <div style="width:64px;height:64px;background:rgba(255,255,255,.2);border-radius:50%;margin:0 auto 16px;
                          display:flex;align-items:center;justify-content:center;font-size:30px;line-height:64px;">
                🌸
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
                Message Received!
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,.9);font-size:15px;">
                Thank you for reaching out to us.
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;">
                Dear <strong style="color:#e8688a;">{name}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#555;">
                We have received your message and our team is reviewing it right now.
                We will get back to you as soon as possible — usually within <strong>24 hours</strong>.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#555;">
                In the meantime, feel free to browse our handcrafted collection at
                <a href="http://localhost:8081" style="color:#e8688a;text-decoration:none;">Handmade Haven</a>.
              </p>
              <!-- Confirmation box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fdf6f8;border:1px solid #f0dde5;border-radius:10px;padding:20px 24px;">
                    <p style="margin:0;font-size:14px;color:#888;text-align:center;">
                      ✅ &nbsp;Your message has been successfully delivered to our team.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#fdf6f8;padding:24px 40px;text-align:center;border-top:1px solid #f0dde5;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#c4547a;">Handmade Haven</p>
              <p style="margin:0;font-size:12px;color:#aaa;">
                123 Nguyen Hue, District 1, Ho Chi Minh City &nbsp;|&nbsp;
                <a href="mailto:hello@handmadehaven.vn" style="color:#e8688a;text-decoration:none;">hello@handmadehaven.vn</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"#
    )
}
