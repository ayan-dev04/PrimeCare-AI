const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const SMTP_TIMEOUT_MS = Number(process.env.EMAIL_SMTP_TIMEOUT_MS) || 10000;
const HTTP_TIMEOUT_MS = Number(process.env.EMAIL_HTTP_TIMEOUT_MS) || 15000;

const localLogoPath = path.resolve(__dirname, '../../client/public/logo.jpeg');
const hasLogo = fs.existsSync(localLogoPath);
const LOGO_CID = 'primecare-logo';

const getHttpProvider = () => {
    if (process.env.BREVO_API_KEY) return 'brevo';
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.SENDGRID_API_KEY) return 'sendgrid';
    return null;
};

const postJson = async (url, headers, body) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        const text = await response.text();
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { raw: text };
        }
        if (!response.ok) {
            throw new Error(data.message || data.error || data.raw || `HTTP ${response.status}`);
        }
        return {
            data,
            messageId: response.headers.get('x-message-id') || data.id || data.messageId || ''
        };
    } finally {
        clearTimeout(timer);
    }
};

const sendViaBrevo = async ({ to, subject, html, fromEmail, fromName }) => {
    const body = {
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
        htmlContent: html
    };
    const { messageId } = await postJson(
        'https://api.brevo.com/v3/smtp/email',
        { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' },
        body
    );
    return { success: true, provider: 'brevo', messageId };
};

const sendViaResend = async ({ to, subject, html, fromEmail, fromName }) => {
    const body = {
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html
    };
    const { messageId } = await postJson(
        'https://api.resend.com/emails',
        { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body
    );
    return { success: true, provider: 'resend', messageId };
};

const sendViaSendGrid = async ({ to, subject, html, fromEmail, fromName }) => {
    const body = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/html', value: html }]
    };
    const { messageId } = await postJson(
        'https://api.sendgrid.com/v3/mail/send',
        { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
        body
    );
    return { success: true, provider: 'sendgrid', messageId };
};

const sendViaSmtp = async ({ to, subject, html, fromEmail, fromName, attachments }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        connectionTimeout: SMTP_TIMEOUT_MS,
        greetingTimeout: SMTP_TIMEOUT_MS,
        socketTimeout: SMTP_TIMEOUT_MS * 2
    });

    const defaultAttachments = hasLogo ? [{
        filename: 'logo.jpeg',
        path: localLogoPath,
        cid: LOGO_CID
    }] : [];

    const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
        attachments: attachments || defaultAttachments
    });
    return { success: true, provider: 'smtp', messageId: info.messageId };
};

const sendEmail = async (options = {}, attempt = 1) => {
    const recipient = options.to || options.email;
    if (!recipient) {
        console.warn('[EMAIL Warning] No recipient specified in sendEmail options.');
        return { success: false, error: 'No recipient' };
    }

    const fromEmail = options.from || process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'PrimeCare Hospital';
    if (!fromEmail) {
        console.error('[EMAIL Error] EMAIL_FROM or EMAIL_USER is not configured.');
        return { success: false, error: 'Sender email is not configured' };
    }

    const payload = {
        to: recipient,
        subject: options.subject,
        html: options.html,
        fromEmail,
        fromName,
        attachments: options.attachments
    };
    const provider = getHttpProvider();

    try {
        let result;
        if (provider === 'brevo') result = await sendViaBrevo(payload);
        else if (provider === 'resend') result = await sendViaResend(payload);
        else if (provider === 'sendgrid') result = await sendViaSendGrid(payload);
        else result = await sendViaSmtp(payload);

        console.log(`[EMAIL SUCCESS] Provider: ${result.provider} | MessageId: ${result.messageId} | Sent to: ${recipient} | Subject: ${options.subject}`);
        return result;
    } catch (error) {
        console.error(`[EMAIL ERROR] Provider: ${provider || 'smtp'} | Attempt: ${attempt} | Recipient: ${recipient} | Message: ${error.message}`);
        if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return sendEmail(options, 2);
        }
        return { success: false, provider: provider || 'smtp', error: error.message };
    }
};

function createHospitalEmailCard({ title, subtitle, badgeText, contentHtml, footerNote }) {
    const logoSrc = process.env.EMAIL_LOGO_URL || (getHttpProvider() ? '' : `cid:${LOGO_CID}`);
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 30px 15px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
        
        <!-- Header Card Section with Clean Logo Corner Placement -->
        <tr>
          <td style="padding: 28px 32px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <!-- Title & Badge Left Column -->
                <td style="vertical-align: middle;">
                  ${badgeText ? `<span style="display: inline-block; background-color: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 12px; margin-bottom: 8px;">${badgeText}</span>` : ''}
                  <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">${title}</h1>
                  ${subtitle ? `<p style="margin: 4px 0 0; font-size: 13px; color: #64748b; font-weight: 500;">${subtitle}</p>` : ''}
                </td>
                
                <!-- Logo Top-Right Corner Placement -->
                <td style="width: 140px; text-align: right; vertical-align: middle;">
                  ${logoSrc ? `<img src="${logoSrc}" alt="PrimeCare Hospital" style="width: 130px; max-width: 130px; height: auto; display: inline-block; border: none; outline: none;" />` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Card Body -->
        <tr>
          <td style="padding: 32px; color: #334155; font-size: 14px; line-height: 1.6;">
            ${contentHtml}
          </td>
        </tr>

        <!-- Footer Section -->
        <tr>
          <td style="padding: 20px 32px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">
              PrimeCare Hospital & Research Center
            </p>
            <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">
              Ring Road, Medical Square, Indore (M.P.) • 24/7 Helpline: +91 (0731) 456-7890
            </p>
            ${footerNote ? `<p style="margin: 8px 0 0; font-size: 11px; color: #cbd5e1;">${footerNote}</p>` : ''}
          </td>
        </tr>

      </table>
    </body>
    </html>
    `;
}

module.exports = sendEmail;
module.exports.createHospitalEmailCard = createHospitalEmailCard;
