'use strict';

const https = require('https');

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

    const recipients = (Array.isArray(to) ? to : [to]).map(addr =>
      typeof addr === 'string' ? { email: addr } : addr
    );

    const body = JSON.stringify({
      sender:      { name: cfg.fromName, email: cfg.fromEmail },
      to:          recipients,
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
  body{margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e}
  .wrap{max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .header{background:#1a1a2e;padding:28px 32px;text-align:center}
  .header h1{margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px}
  .header span{color:#e74c3c;font-weight:800}
  .body{padding:32px}
  .body p{margin:0 0 16px;line-height:1.6;color:#444}
  .body h2{margin:0 0 12px;font-size:18px;color:#1a1a2e}
  .btn{display:inline-block;margin:20px 0;padding:12px 28px;background:#e74c3c;color:#ffffff!important;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px}
  .info-box{background:#f8f9fa;border-left:4px solid #e74c3c;border-radius:4px;padding:16px;margin:16px 0}
  .info-box p{margin:4px 0;font-size:14px;color:#555}
  .info-box strong{color:#1a1a2e}
  .footer{background:#f4f6f8;padding:20px 32px;text-align:center;font-size:12px;color:#888;border-top:1px solid #e8eaed}
  .footer a{color:#e74c3c;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>Contract<span>IQ</span></h1></div>
  <div class="body">${bodyHtml}</div>
  <div class="footer">
    &copy; ${new Date().getFullYear()} RedMPS &mdash; ContractIQ &bull;
    <a href="mailto:${process.env.EMAIL_REPLY_TO || 'support@redmps.com'}">Contact support</a>
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

async function sendPasswordResetEmail({ to, firstName, resetToken, resetUrl }) {
  const url = resetUrl || `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;
  return send({
    to,
    subjectLine: subjectKey('EMAIL_SUBJECT_PASSWORD_RESET', 'Reset your ContractIQ password'),
    html: layout(`
      <h2>Reset your password</h2>
      <p>Hi ${firstName || 'there'}, we received a request to reset your ContractIQ password.</p>
      <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
      <a class="btn" href="${url}">Reset password</a>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
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
