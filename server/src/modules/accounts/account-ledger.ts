import type { IAccount } from './accounts.model.js';

/**
 * Derives dueBalance from billed vs paid.
 * Store credit is applied only when `applyCredit` is true (e.g. checkout chose
 * “Store credit”); otherwise credit stays available until explicitly used.
 * When credit is applied it is added to totalPaid so settlement sticks on later syncs.
 * Excess paid vs billed moves into creditBalance only when `absorbOverpay` is true.
 */
export function syncAccountLedger(
  account: IAccount,
  options?: { absorbOverpay?: boolean; applyCredit?: boolean }
): void {
  const absorbOverpay = options?.absorbOverpay ?? false;
  const applyCredit = options?.applyCredit ?? false;
  let due = Number((account.totalBilled - account.totalPaid).toFixed(2));

  if (due < 0) {
    if (absorbOverpay) {
      const surplus = Math.abs(due);
      account.creditBalance = Number((account.creditBalance + surplus).toFixed(2));
    }
    account.dueBalance = 0;
  } else {
    if (applyCredit && account.creditBalance > 0 && due > 0) {
      const applied = Math.min(account.creditBalance, due);
      account.creditBalance = Number((account.creditBalance - applied).toFixed(2));
      account.totalPaid = Number((account.totalPaid + applied).toFixed(2));
      due = Number((due - applied).toFixed(2));
    }
    account.dueBalance = due;
  }

  account.lastActivityAt = new Date();
}
