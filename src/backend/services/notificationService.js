'use strict';

const email = require('./emailService');

// ── Persist an in-app notification row ──────────────────────────────────────

async function createNotification(pool, {
  recipientId,
  type,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
}) {
  const result = await pool.query(
    `insert into notifications
       (recipient_id, notification_type, title, message, related_entity_type, related_entity_id)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [recipientId, type, title, message, relatedEntityType, relatedEntityId]
  );
  return result.rows[0].id;
}

// ── Combined: DB notification + email dispatch ───────────────────────────────
// Each method saves to the notifications table then fires the matching email.
// Email failures are logged but do NOT throw — the in-app notification always lands.

async function notifyWelcome(pool, { user, tempPassword }) {
  await createNotification(pool, {
    recipientId: user.id,
    type: 'user_welcome',
    title: 'Welcome to ContractIQ',
    message: `Your account has been created. Please sign in with your temporary password.`,
  });

  await fireEmail(() => email.sendWelcomeEmail({
    to: user.email,
    firstName: user.firstName || user.first_name,
    tempPassword,
  }), 'welcome');
}

async function notifyUserInvite(pool, { user, tempPassword, invitedByName }) {
  await createNotification(pool, {
    recipientId: user.id,
    type: 'user_invite',
    title: 'You have been invited to ContractIQ',
    message: `${invitedByName} has added you to ContractIQ.`,
  });

  await fireEmail(() => email.sendUserInviteEmail({
    to: user.email,
    firstName: user.firstName || user.first_name,
    invitedByName,
    tempPassword,
  }), 'user_invite');
}

async function notifyPasswordReset(pool, { userId, userEmail, firstName, resetCode }) {
  if (userId) {
    await createNotification(pool, {
      recipientId: userId,
      type: 'password_reset',
      title: 'Password reset requested',
      message: 'A password reset code has been sent to your email address.',
    });
  }

  await fireEmail(() => email.sendPasswordResetEmail({
    to: userEmail,
    firstName,
    resetCode,
  }), 'password_reset');
}

async function notifyContractCreated(pool, { recipientId, recipientEmail, recipientName, contract }) {
  await createNotification(pool, {
    recipientId,
    type: 'contract_created',
    title: 'Contract created',
    message: `Contract "${contract.title}" has been created.`,
    relatedEntityType: 'contract',
    relatedEntityId: contract.id,
  });

  await fireEmail(() => email.sendContractCreatedEmail({
    to: recipientEmail,
    recipientName,
    contract,
  }), 'contract_created');
}

async function notifyContractSent(pool, { recipientId, recipientEmail, recipientName, contract }) {
  await createNotification(pool, {
    recipientId,
    type: 'contract_sent',
    title: 'Contract sent for review',
    message: `Contract "${contract.title}" has been sent to you for review.`,
    relatedEntityType: 'contract',
    relatedEntityId: contract.id,
  });

  await fireEmail(() => email.sendContractSentEmail({
    to: recipientEmail,
    recipientName,
    contract,
  }), 'contract_sent');
}

async function notifyContractApproved(pool, { recipientId, recipientEmail, recipientName, contract }) {
  await createNotification(pool, {
    recipientId,
    type: 'contract_approved',
    title: 'Contract approved',
    message: `Contract "${contract.title}" has been approved.`,
    relatedEntityType: 'contract',
    relatedEntityId: contract.id,
  });

  await fireEmail(() => email.sendContractApprovedEmail({
    to: recipientEmail,
    recipientName,
    contract,
  }), 'contract_approved');
}

async function notifyContractRejected(pool, { recipientId, recipientEmail, recipientName, contract, reason }) {
  await createNotification(pool, {
    recipientId,
    type: 'contract_rejected',
    title: 'Contract requires changes',
    message: `Contract "${contract.title}" has been returned for revision.`,
    relatedEntityType: 'contract',
    relatedEntityId: contract.id,
  });

  await fireEmail(() => email.sendContractRejectedEmail({
    to: recipientEmail,
    recipientName,
    contract,
    reason,
  }), 'contract_rejected');
}

async function notifyContractExpiring(pool, { recipientId, recipientEmail, recipientName, contract, daysUntilExpiry }) {
  await createNotification(pool, {
    recipientId,
    type: 'contract_expiring',
    title: 'Contract expiring soon',
    message: `Contract "${contract.title}" expires in ${daysUntilExpiry} day(s).`,
    relatedEntityType: 'contract',
    relatedEntityId: contract.id,
  });

  await fireEmail(() => email.sendContractExpiringEmail({
    to: recipientEmail,
    recipientName,
    contract,
    daysUntilExpiry,
  }), 'contract_expiring');
}

async function notifyContractExpired(pool, { recipientId, recipientEmail, recipientName, contract }) {
  await createNotification(pool, {
    recipientId,
    type: 'contract_expired',
    title: 'Contract has expired',
    message: `Contract "${contract.title}" has expired.`,
    relatedEntityType: 'contract',
    relatedEntityId: contract.id,
  });

  await fireEmail(() => email.sendContractExpiredEmail({
    to: recipientEmail,
    recipientName,
    contract,
  }), 'contract_expired');
}

async function notifyApprovalRequested(pool, { approverId, approverEmail, approverName, contract, submittedByName }) {
  await createNotification(pool, {
    recipientId: approverId,
    type: 'approval_requested',
    title: 'Approval required',
    message: `Contract "${contract.title}" is awaiting your approval.`,
    relatedEntityType: 'contract',
    relatedEntityId: contract.id,
  });

  await fireEmail(() => email.sendApprovalRequestedEmail({
    to: approverEmail,
    approverName,
    contract,
    submittedByName,
  }), 'approval_requested');
}

async function notifyApprovalReminder(pool, { approverId, approverEmail, approverName, contract, pendingSinceDays }) {
  await createNotification(pool, {
    recipientId: approverId,
    type: 'approval_reminder',
    title: 'Reminder: Approval pending',
    message: `Contract "${contract.title}" has been awaiting your approval for ${pendingSinceDays} day(s).`,
    relatedEntityType: 'contract',
    relatedEntityId: contract.id,
  });

  await fireEmail(() => email.sendApprovalReminderEmail({
    to: approverEmail,
    approverName,
    contract,
    pendingSinceDays,
  }), 'approval_reminder');
}

// ── Helper: fire email, swallow & log failures so DB notification still lands

async function fireEmail(fn, label) {
  try {
    await fn();
  } catch (err) {
    console.error(`[email] Failed to send ${label} email:`, err.message);
  }
}

module.exports = {
  createNotification,
  notifyWelcome,
  notifyUserInvite,
  notifyPasswordReset,
  notifyContractCreated,
  notifyContractSent,
  notifyContractApproved,
  notifyContractRejected,
  notifyContractExpiring,
  notifyContractExpired,
  notifyApprovalRequested,
  notifyApprovalReminder,
};
