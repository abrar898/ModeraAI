import { Resend } from 'resend';

function EMAIL_ENABLED() { return !!process.env.RESEND_API_KEY; }
function FROM_ADDRESS()  { return process.env.EMAIL_FROM || 'ModeraAI <onboarding@resend.dev>'; }
function APP_URL()       { return process.env.FRONTEND_URL || 'http://localhost:3000'; }
function getResend()     { return new Resend(process.env.RESEND_API_KEY); }

/**
 * Sends an email when an admin resolves an appeal.
 * Returns { sent: true/false, reason? } so callers can surface status.
 * Requires RESEND_API_KEY in .env — free tier only sends to verified addresses.
 */
export async function sendAppealResolutionEmail({
  userEmail,
  username,
  decision,
  adminResponse,
  submissionId,
}) {
  if (!EMAIL_ENABLED()) {
    console.log(`[email] Skipped — RESEND_API_KEY not set. User ${userEmail} was not emailed.`);
    return { sent: false, reason: 'Email not configured (RESEND_API_KEY missing)' };
  }

  const accepted   = decision === 'accepted';
  const subject    = accepted ? 'Your appeal has been accepted — ModeraAI' : 'Update on your appeal — ModeraAI';
  const detailUrl  = `${APP_URL()}/submissions/${submissionId}`;
  const headerBg   = accepted ? '#f0fdf4' : '#fff7ed';
  const headerColor = accepted ? '#15803d' : '#c2410c';
  const headerIcon = accepted ? '✓ Appeal accepted' : '⚠ Appeal reviewed';
  const bodyText   = accepted
    ? 'An admin reviewed your appeal and <strong>accepted</strong> it. The verdict has been overridden to <strong>Approved</strong>.'
    : 'An admin reviewed your appeal and <strong>rejected</strong> it. The original verdict stands.';

  const adminNoteHtml = adminResponse ? `
    <div style="margin:20px 0;padding:14px 16px;background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 6px 6px 0;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Admin note</p>
      <p style="margin:0;color:#374151;font-size:14px;font-style:italic;">"${adminResponse}"</p>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:24px 32px;background:${headerBg};border-bottom:1px solid #e5e7eb;">
            <span style="font-size:22px;font-weight:600;color:${headerColor};">${headerIcon}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${username},</p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">${bodyText}</p>
            ${adminNoteHtml}
            <a href="${detailUrl}" style="display:inline-block;margin-top:20px;padding:11px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
              View submission →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you filed an appeal on ModeraAI.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const result = await getResend().emails.send({
      from: FROM_ADDRESS(),
      to: userEmail,
      subject,
      html,
    });
    console.log(`[email] Appeal-${decision} email sent to ${userEmail} — id: ${result.data?.id}`);
    return { sent: true, id: result.data?.id };
  } catch (err) {
    console.error(`[email] Failed to send to ${userEmail}:`, err.message);
    return { sent: false, reason: err.message };
  }
}
