# Email Notifications

> Transactional email delivery, templating, and queue-based sending across multiple stacks.


## Metadata
- **Category:** backend-patterns
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%)
- **Complexity:** Intermediate
- **Maturity:** Stable

## Overview

Email notifications are critical for user onboarding, authentication (password resets, 2FA), and transactional updates.

### Email Providers

| Provider | API | SMTP | Best For |
|----------|-----|------|----------|
| **Resend** | ✅ | ✅ | Developer experience |
| **SendGrid** | ✅ | ✅ | High volume |
| **Postmark** | ✅ | ✅ | Transactional |
| **AWS SES** | ✅ | ✅ | Cost at scale |
| **Mailgun** | ✅ | ✅ | Deliverability |

## Quick Start

### Rust - lettre (SMTP)

```rust
// Cargo.toml: lettre = { version = "0.11", features = ["tokio1-native-tls"] }

use lettre::{
    message::header::ContentType,
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};

pub struct EmailService {
    mailer: AsyncSmtpTransport<Tokio1Executor>,
    from: String,
}

impl EmailService {
    pub fn new(smtp_host: &str, username: &str, password: &str, from: &str) -> Self {
        let creds = Credentials::new(username.to_string(), password.to_string());
        let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(smtp_host)
            .unwrap()
            .credentials(creds)
            .build();
        
        Self { mailer, from: from.to_string() }
    }
    
    pub async fn send_welcome(&self, to: &str, name: &str) -> Result<(), EmailError> {
        let html = format!(r#"
            <h1>Welcome, {name}!</h1>
            <p>Thanks for joining us.</p>
        "#);
        
        let email = Message::builder()
            .from(self.from.parse()?)
            .to(to.parse()?)
            .subject("Welcome!")
            .header(ContentType::TEXT_HTML)
            .body(html)?;
        
        self.mailer.send(email).await?;
        Ok(())
    }
    
    pub async fn send_password_reset(&self, to: &str, token: &str) -> Result<(), EmailError> {
        let reset_url = format!("https://app.example.com/reset?token={token}");
        let html = format!(r#"
            <p>Click <a href="{reset_url}">here</a> to reset your password.</p>
            <p>This link expires in 1 hour.</p>
        "#);
        
        let email = Message::builder()
            .from(self.from.parse()?)
            .to(to.parse()?)
            .subject("Password Reset Request")
            .header(ContentType::TEXT_HTML)
            .body(html)?;
        
        self.mailer.send(email).await?;
        Ok(())
    }
}
```

### Rust - Resend API

```rust
// Cargo.toml: resend-rs = "0.4"

use resend_rs::{types::CreateEmailBaseOptions, Resend};

pub struct ResendService {
    client: Resend,
    from: String,
}

impl ResendService {
    pub fn new(api_key: &str, from: &str) -> Self {
        Self {
            client: Resend::new(api_key),
            from: from.to_string(),
        }
    }
    
    pub async fn send(&self, to: &str, subject: &str, html: &str) -> Result<String, resend_rs::Error> {
        let email = CreateEmailBaseOptions::new(&self.from, [to], subject)
            .with_html(html);
        
        let response = self.client.emails.send(email).await?;
        Ok(response.id)
    }
}
```

### Go - gomail

```go
import (
    "gopkg.in/gomail.v2"
)

type EmailService struct {
    dialer *gomail.Dialer
    from   string
}

func NewEmailService(host string, port int, username, password, from string) *EmailService {
    return &EmailService{
        dialer: gomail.NewDialer(host, port, username, password),
        from:   from,
    }
}

func (s *EmailService) SendWelcome(to, name string) error {
    m := gomail.NewMessage()
    m.SetHeader("From", s.from)
    m.SetHeader("To", to)
    m.SetHeader("Subject", "Welcome!")
    m.SetBody("text/html", fmt.Sprintf("<h1>Welcome, %s!</h1>", name))
    
    return s.dialer.DialAndSend(m)
}

// With Resend API
func SendWithResend(apiKey, to, subject, html string) error {
    client := resend.NewClient(apiKey)
    
    params := &resend.SendEmailRequest{
        From:    "noreply@example.com",
        To:      []string{to},
        Subject: subject,
        Html:    html,
    }
    
    _, err := client.Emails.Send(params)
    return err
}
```

### Python - FastAPI + email

```python
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr

conf = ConnectionConfig(
    MAIL_USERNAME="user",
    MAIL_PASSWORD="password",
    MAIL_FROM="noreply@example.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.example.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
)

async def send_welcome_email(email: EmailStr, name: str):
    html = f"<h1>Welcome, {name}!</h1>"
    
    message = MessageSchema(
        subject="Welcome!",
        recipients=[email],
        body=html,
        subtype="html",
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)

# With Resend
import resend

resend.api_key = "re_xxx"

def send_with_resend(to: str, subject: str, html: str):
    return resend.Emails.send({
        "from": "noreply@example.com",
        "to": to,
        "subject": subject,
        "html": html,
    })
```

### Node.js - Nodemailer + Resend

```typescript
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Resend (recommended)
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcome(to: string, name: string) {
  return resend.emails.send({
    from: 'noreply@example.com',
    to,
    subject: 'Welcome!',
    html: `<h1>Welcome, ${name}!</h1>`,
  });
}

// SMTP fallback
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendWithSMTP(to: string, subject: string, html: string) {
  return transporter.sendMail({
    from: 'noreply@example.com',
    to,
    subject,
    html,
  });
}
```

## Email Templates

### Using Handlebars/Tera

```rust
// Rust with Tera templates
use tera::{Context, Tera};

lazy_static::lazy_static! {
    static ref TEMPLATES: Tera = Tera::new("templates/**/*.html").unwrap();
}

fn render_welcome(name: &str) -> String {
    let mut ctx = Context::new();
    ctx.insert("name", name);
    ctx.insert("year", &2024);
    TEMPLATES.render("emails/welcome.html", &ctx).unwrap()
}
```

```html
<!-- templates/emails/welcome.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; }
    .button { background: #007bff; color: white; padding: 12px 24px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome, {{ name }}!</h1>
    <p>We're excited to have you on board.</p>
    <a href="{{ action_url }}" class="button">Get Started</a>
    <footer>© {{ year }} Company</footer>
  </div>
</body>
</html>
```

## Queue-Based Sending

Always queue email sending to avoid blocking API responses:

```rust
// See background-jobs skill for full implementation
#[derive(Serialize, Deserialize)]
struct EmailJob {
    to: String,
    template: EmailTemplate,
    context: serde_json::Value,
}

// In API handler
async fn register_user(/* ... */) {
    // Create user...
    
    // Queue email (don't await SMTP)
    email_queue.push(EmailJob {
        to: user.email,
        template: EmailTemplate::Welcome,
        context: json!({ "name": user.name }),
    }).await?;
    
    Ok(Json(user))
}
```

## Related Skills

- [background-jobs](../background-jobs/SKILL.md) - Queue email sending
- [authentication](../authentication/SKILL.md) - Password reset flows
- [monitoring-observability](../monitoring-observability/SKILL.md) - Email delivery metrics
