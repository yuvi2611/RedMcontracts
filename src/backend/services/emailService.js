'use strict';

const https = require('https');

// Optional safety guard. When EMAIL_ALLOWED_RECIPIENTS is set, emails only go
// to those comma-separated addresses; when empty, delivery is unrestricted.
const ALLOWED_RECIPIENTS = new Set(
  String(process.env.EMAIL_ALLOWED_RECIPIENTS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
);

function config() {
  return {
    apiKey:    process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@redmps.com',
    fromName:  process.env.EMAIL_FROM_NAME   || 'ContractIQ',
    replyTo:   process.env.EMAIL_REPLY_TO    || undefined,
  };
}

function subjectKey(key, fallback) {
  return process.env[key] || fallback;
}

// ── Core send via Brevo REST API ─────────────────────────────────────────────

function send({ to, subjectLine, html }) {
  return new Promise((resolve, reject) => {
    const cfg = config();
    if (!cfg.apiKey) {
      return reject(new Error('Brevo API key not set. Add BREVO_API_KEY to your .env file.'));
    }

    const allRecipients = (Array.isArray(to) ? to : [to]).map(addr =>
      typeof addr === 'string' ? { email: addr } : addr
    );

    // Filter to allowed recipients only
    const recipients = allRecipients.filter(r => {
      const emailAddr = (r.email || '').toLowerCase();
      if (ALLOWED_RECIPIENTS.size && !ALLOWED_RECIPIENTS.has(emailAddr)) {
        console.warn(`[email] Skipping non-whitelisted recipient: ${emailAddr}`);
        return false;
      }
      return true;
    });

    if (recipients.length === 0) {
      console.warn(`[email] No allowed recipients for "${subjectLine}" — email suppressed.`);
      return resolve({ suppressed: true });
    }

    const body = JSON.stringify({
      sender:      { name: cfg.fromName, email: cfg.fromEmail },
      to:          recipients,  // already filtered to allowed list
      replyTo:     cfg.replyTo ? { email: cfg.replyTo } : undefined,
      subject:     subjectLine,
      htmlContent: html,
    });

    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers: {
        'api-key':       cfg.apiKey,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Brevo ${res.statusCode}: ${data.message || raw}`));
          }
        } catch {
          reject(new Error(`Brevo returned non-JSON (${res.statusCode}): ${raw}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── HTML layout ──────────────────────────────────────────────────────────────

function layout(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box}
  body{margin:0;padding:0;background:#0d0d0d;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a}
  .outer{padding:40px 16px;background:#0d0d0d}
  .wrap{max-width:600px;margin:0 auto;background:#ffffff;border-radius:0;overflow:hidden;border:1px solid #2a2a2a}
  .header{background:#0d0d0d;padding:0;text-align:center;border-bottom:3px solid #cc1a1a}
  .header-top{padding:28px 32px 0}
  .logo{display:inline-block;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:1px;text-transform:uppercase}
  .logo span{color:#cc1a1a}
  .header-band{height:6px;background:linear-gradient(90deg,#cc1a1a 0%,#ff2222 50%,#cc1a1a 100%);margin-top:20px}
  .body{padding:36px 40px}
  .body p{margin:0 0 16px;line-height:1.7;color:#3a3a3a;font-size:15px}
  .body h2{margin:0 0 20px;font-size:20px;font-weight:700;color:#0d0d0d;letter-spacing:-.3px;border-left:4px solid #cc1a1a;padding-left:12px}
  .btn{display:inline-block;margin:20px 0;padding:13px 32px;background:#cc1a1a;color:#ffffff!important;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:.3px;text-transform:uppercase;border:none}
  .btn:hover{background:#aa1010}
  .info-box{background:#0d0d0d;border-left:4px solid #cc1a1a;padding:18px 20px;margin:20px 0}
  .info-box p{margin:6px 0;font-size:14px;color:#cccccc;line-height:1.5}
  .info-box strong{color:#ffffff;font-weight:600}
  .divider{height:1px;background:#e8e8e8;margin:24px 0}
  .footer{background:#0d0d0d;padding:22px 40px;border-top:3px solid #cc1a1a}
  .footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
  .footer-brand{font-size:13px;color:#888;font-weight:500}
  .footer-brand span{color:#cc1a1a}
  .footer-link{font-size:12px;color:#666;text-decoration:none}
  .footer-link:hover{color:#cc1a1a}
  .footer-copy{font-size:11px;color:#555;margin-top:10px;padding-top:10px;border-top:1px solid #2a2a2a;text-align:center}
</style>
</head>
<body>
<div class="outer">
<div class="wrap">
  <div class="header">
    <div class="header-top"><div class="logo">Contract<span>IQ</span></div></div>
    <div class="header-band"></div>
  </div>
  <div class="body">${bodyHtml}</div>
  <div class="footer">
    <div class="footer-inner">
      <div class="footer-brand"><span>RedMPS</span> &mdash; ContractIQ</div>
      <a class="footer-link" href="mailto:${process.env.EMAIL_REPLY_TO || 'support@redmps.com'}">Contact Support</a>
    </div>
    <div class="footer-copy">&copy; ${new Date().getFullYear()} RedMPS (Pty) Ltd. All rights reserved. This communication is confidential and intended solely for the named recipient(s).</div>
  </div>
</div>
</div>
</body>
</html>`;
}

// ── User / account emails ────────────────────────────────────────────────────

async function sendWelcomeEmail({ to, firstName, tempPassword }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_WELCOME', 'Welcome to ContractIQ'),
    html: layout(`
      <h2>Welcome to ContractIQ, ${firstName}!</h2>
      <p>Your account has been created. Use the temporary credentials below to sign in for the first time.</p>
      <div class="info-box">
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Temporary password:</strong> ${tempPassword}</p>
      </div>
      <p>You will be prompted to set a new password on first login. Keep this email confidential.</p>
    `),
  });
}

async function sendUserInviteEmail({ to, firstName, invitedByName, tempPassword }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_USER_INVITE', 'You have been invited to ContractIQ'),
    html: layout(`
      <h2>You've been invited to ContractIQ</h2>
      <p>Hi ${firstName}, <strong>${invitedByName}</strong> has added you to ContractIQ, RedMPS's contract management platform.</p>
      <div class="info-box">
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Temporary password:</strong> ${tempPassword}</p>
      </div>
      <p>Sign in and set your permanent password to get started.</p>
    `),
  });
}

async function sendPasswordResetEmail({ to, firstName, resetCode }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_PASSWORD_RESET', 'Reset your ContractIQ password'),
    html: layout(`
      <h2>Reset your password</h2>
      <p>Hi ${firstName || 'there'}, we received a request to reset your ContractIQ password.</p>
      <p>Enter the code below on the password reset screen to choose a new password. This code expires in <strong>1 hour</strong>.</p>
      <div class="info-box" style="text-align:center">
        <p style="font-size:13px;color:#999;margin-bottom:8px;letter-spacing:1px;text-transform:uppercase">Your reset code</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#ffffff;margin:0">${resetCode}</p>
      </div>
      <p>If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
    `),
  });
}

// ── Contract lifecycle emails ────────────────────────────────────────────────

async function sendContractCreatedEmail({ to, recipientName, contract }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_CONTRACT_CREATED', 'Your contract has been created'),
    html: layout(`
      <h2>Contract created</h2>
      <p>Hi ${recipientName}, a new contract has been created and is ready for processing.</p>
      <div class="info-box">
        <p><strong>Contract:</strong> ${contract.title}</p>
        <p><strong>Reference:</strong> ${contract.reference || contract.id}</p>
        <p><strong>Created:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    `),
  });
}

async function sendContractSentEmail({ to, recipientName, contract }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_CONTRACT_SENT', 'A contract has been sent to you for review'),
    html: layout(`
      <h2>A contract has been sent to you for review</h2>
      <p>Hi ${recipientName}, the following contract requires your attention.</p>
      <div class="info-box">
        <p><strong>Contract:</strong> ${contract.title}</p>
        <p><strong>Reference:</strong> ${contract.reference || contract.id}</p>
        <p><strong>Sent by:</strong> ${contract.senderName || '—'}</p>
      </div>
      <p>Please log in to ContractIQ to review and respond.</p>
    `),
  });
}

async function sendContractApprovedEmail({ to, recipientName, contract }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_CONTRACT_APPROVED', 'Contract approved'),
    html: layout(`
      <h2>Contract approved</h2>
      <p>Hi ${recipientName}, the following contract has been <strong style="color:#27ae60">approved</strong>.</p>
      <div class="info-box">
        <p><strong>Contract:</strong> ${contract.title}</p>
        <p><strong>Reference:</strong> ${contract.reference || contract.id}</p>
        <p><strong>Approved by:</strong> ${contract.approverName || '—'}</p>
        <p><strong>Approved on:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    `),
  });
}

async function sendContractRejectedEmail({ to, recipientName, contract, reason }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_CONTRACT_REJECTED', 'Contract requires changes'),
    html: layout(`
      <h2>Contract requires changes</h2>
      <p>Hi ${recipientName}, the following contract has been <strong style="color:#e74c3c">returned</strong> for revision.</p>
      <div class="info-box">
        <p><strong>Contract:</strong> ${contract.title}</p>
        <p><strong>Reference:</strong> ${contract.reference || contract.id}</p>
        <p><strong>Reviewed by:</strong> ${contract.approverName || '—'}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
      <p>Please log in to ContractIQ to make the requested changes and resubmit.</p>
    `),
  });
}

async function sendContractExpiringEmail({ to, recipientName, contract, daysUntilExpiry }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_CONTRACT_EXPIRING', 'Contract expiring soon'),
    html: layout(`
      <h2>Contract expiring soon</h2>
      <p>Hi ${recipientName}, the following contract will expire in <strong>${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</strong>.</p>
      <div class="info-box">
        <p><strong>Contract:</strong> ${contract.title}</p>
        <p><strong>Reference:</strong> ${contract.reference || contract.id}</p>
        <p><strong>Expiry date:</strong> ${contract.expiryDate}</p>
      </div>
    `),
  });
}

async function sendContractExpiredEmail({ to, recipientName, contract }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_CONTRACT_EXPIRED', 'Contract has expired'),
    html: layout(`
      <h2>Contract has expired</h2>
      <p>Hi ${recipientName}, the following contract has now <strong style="color:#e74c3c">expired</strong>.</p>
      <div class="info-box">
        <p><strong>Contract:</strong> ${contract.title}</p>
        <p><strong>Reference:</strong> ${contract.reference || contract.id}</p>
        <p><strong>Expired on:</strong> ${contract.expiryDate}</p>
      </div>
    `),
  });
}

// ── Approval workflow emails ─────────────────────────────────────────────────

async function sendApprovalRequestedEmail({ to, approverName, contract, submittedByName }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_APPROVAL_REQUESTED', 'Action required: Contract approval request'),
    html: layout(`
      <h2>Action required: Contract approval</h2>
      <p>Hi ${approverName}, a contract has been submitted and requires your approval.</p>
      <div class="info-box">
        <p><strong>Contract:</strong> ${contract.title}</p>
        <p><strong>Reference:</strong> ${contract.reference || contract.id}</p>
        <p><strong>Submitted by:</strong> ${submittedByName || '—'}</p>
        <p><strong>Submitted on:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <p>Please log in to ContractIQ to review and approve or return this contract.</p>
    `),
  });
}

async function sendApprovalReminderEmail({ to, approverName, contract, pendingSinceDays }) {
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_APPROVAL_REMINDER', 'Reminder: Pending contract approval'),
    html: layout(`
      <h2>Reminder: Pending contract approval</h2>
      <p>Hi ${approverName}, a contract has been awaiting your approval for <strong>${pendingSinceDays} day${pendingSinceDays !== 1 ? 's' : ''}</strong>.</p>
      <div class="info-box">
        <p><strong>Contract:</strong> ${contract.title}</p>
        <p><strong>Reference:</strong> ${contract.reference || contract.id}</p>
      </div>
      <p>Please log in to ContractIQ at your earliest convenience to action this request.</p>
    `),
  });
}

module.exports = {
  sendWelcomeEmail,
  sendUserInviteEmail,
  sendPasswordResetEmail,
  sendContractCreatedEmail,
  sendContractSentEmail,
  sendContractApprovedEmail,
  sendContractRejectedEmail,
  sendContractExpiringEmail,
  sendContractExpiredEmail,
  sendApprovalRequestedEmail,
  sendApprovalReminderEmail,
};
