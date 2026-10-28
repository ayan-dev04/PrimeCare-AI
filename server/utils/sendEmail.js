const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

/**
 * PrimeCare Enterprise Nodemailer Email Utility
 * Generates modern card-based email layouts with the official PrimeCare Hospital logo
 * positioned cleanly in the corner of the card container.
 */
const sendEmail = async (options) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Resolve logo path for inline CID embedding
        const localLogoPath = path.resolve(__dirname, '../../client/public/logo.jpeg');
        const hasLogo = fs.existsSync(localLogoPath);

        const defaultAttachments = hasLogo ? [
            {
                filename: 'logo.jpeg',
                path: localLogoPath,
                cid: 'primecare-logo'
            }
        ] : [];

        const recipient = options.to || options.email;
        if (!recipient) {
            console.warn('[SMTP Warning] No recipient specified in sendEmail options.');
            return { success: false, error: 'No recipient' };
        }

        const mailOptions = {
            from: `"PrimeCare Hospital" <${process.env.EMAIL_USER}>`,
            to: recipient,
            subject: options.subject,
            html: options.html,
            attachments: options.attachments || defaultAttachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[SMTP SUCCESS] Sent to: ${recipient} | Subject: ${options.subject}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[SMTP ERROR] Recipient: ${options.to || options.email} | Message: ${error.message}`);
        return { success: false, error: error.message };
    }
};

/**
 * Helper to build card-styled email HTML with logo positioned in the header corner
 */
function createHospitalEmailCard({ title, subtitle, badgeText, contentHtml, footerNote }) {
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
                  <img src="cid:primecare-logo" alt="PrimeCare Hospital" style="width: 130px; max-width: 130px; height: auto; display: inline-block; border: none; outline: none;" />
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