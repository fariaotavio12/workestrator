package com.apibot.features.approval.domain.exception

import com.apibot.shared.exceptions.BusinessRuleViolationException
import com.apibot.shared.exceptions.ForbiddenException
import com.apibot.shared.exceptions.ResourceNotFoundException

class NotificationChannelNotFoundException(
    message: String = "Notification channel not found",
) : ResourceNotFoundException(message)

class NotificationChannelAccessDeniedException(
    message: String = "You do not have access to this notification channel",
) : ForbiddenException(message)

class ApproverAccountNotFoundException(
    message: String = "No Workestrator account found with this email",
) : ResourceNotFoundException(message)

/** Thrown when removing a pool approver would leave an agent with `ownerCanDecide = false` and no one left who can decide (design D13). */
class ApproverRemovalViolatesPolicyException(
    message: String,
) : BusinessRuleViolationException(message)

/** Thrown when saving `Agent.approvalPolicy` would be unsatisfiable — `ownerCanDecide = false` with an empty `approverUserIds`, or an id outside the squad's pool (design D13). */
class InvalidApprovalPolicyException(
    message: String,
) : BusinessRuleViolationException(message)

class ApprovalRequestNotFoundException(
    message: String = "Approval request not found",
) : ResourceNotFoundException(message)

/** Authenticated, but not the owner nor an assigned approver of this specific request (design D9). */
class ApprovalAccessDeniedException(
    message: String = "You do not have access to this approval request",
) : ForbiddenException(message)

class RejectionRequiresFeedbackException(
    message: String = "A justification is required to reject a checkpoint",
) : BusinessRuleViolationException(message)

/**
 * Thrown when deciding the whole request while it carries decidable items (design D15) — a batch verdict
 * would silently erase the per-item ones. The caller must decide item by item instead.
 */
class ItemizedApprovalRequiresPerItemDecisionException(
    message: String = "This checkpoint reviews a list — decide each item instead of the whole request",
) : BusinessRuleViolationException(message)

class ApprovalItemNotFoundException(
    message: String = "Approval item not found",
) : ResourceNotFoundException(message)

/** Thrown when a client sends more items than `app.approval.items-max-count` allows. */
class TooManyApprovalItemsException(
    message: String,
) : BusinessRuleViolationException(message)
