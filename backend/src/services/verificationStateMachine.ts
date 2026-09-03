import { doc_verification_status } from '@prisma/client';

export class VerificationStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<doc_verification_status, doc_verification_status[]> = {
    NOT_SUBMITTED: ['DOCUMENTS_REQUIRED', 'DOCUMENTS_UPLOADED'],
    DOCUMENTS_REQUIRED: ['DOCUMENTS_UPLOADED'],
    DOCUMENTS_UPLOADED: ['PROCESSING', 'DOCUMENTS_REQUIRED'],
    PROCESSING: ['AUTO_REVIEW_READY', 'PROCESSING_FAILED'],
    PROCESSING_FAILED: ['PROCESSING', 'DOCUMENTS_UPLOADED'],
    AUTO_REVIEW_READY: ['NEEDS_ADMIN_REVIEW', 'PROCESSING'],
    NEEDS_ADMIN_REVIEW: ['APPROVED', 'REJECTED', 'NEEDS_CORRECTION', 'PROCESSING'],
    NEEDS_CORRECTION: ['DOCUMENTS_UPLOADED', 'PROCESSING'],
    APPROVED: ['NEEDS_ADMIN_REVIEW'],
    REJECTED: ['NEEDS_ADMIN_REVIEW', 'NEEDS_CORRECTION'],
  };

  /**
   * Validates if a transition from currentStatus to nextStatus is allowed.
   */
  public static canTransition(
    currentStatus: doc_verification_status,
    nextStatus: doc_verification_status
  ): boolean {
    if (currentStatus === nextStatus) return true;
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(nextStatus) : false;
  }

  /**
   * Asserts valid transition, throws Error if invalid.
   */
  public static assertTransition(
    currentStatus: doc_verification_status,
    nextStatus: doc_verification_status
  ): void {
    if (!this.canTransition(currentStatus, nextStatus)) {
      throw new Error(
        `Invalid verification status transition from '${currentStatus}' to '${nextStatus}'.`
      );
    }
  }
}
