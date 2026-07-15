import type { IAccount } from './accounts.model.js';

/**
 * Derives dueBalance from billed vs paid, applying store credit to open dues.
 * Does not rewrite totalPaid (cash collected stays truthful).
 * Excess paid vs billed is moved into creditBalance only when `absorbOverpay` is true
 * (transaction sites that reduce billed / record overpay); routine syncs must not
 * re-absorb or credit would double-count.
 */
export function syncAccountLedger(account: IAccount, options?: { absorbOverpay?: boolean }): void {
  const absorbOverpay = options?.absorbOverpay ?? false;
  let due = Number((account.totalBilled - account.totalPaid).toFixed(2));

  if (due < 0) {
    if (absorbOverpay) {
      const surplus = Math.abs(due);
      account.creditBalance = Number((account.creditBalance + surplus).toFixed(2));
    }
    account.dueBalance = 0;
  } else {
    if (account.creditBalance > 0 && due > 0) {
      const applied = Math.min(account.creditBalance, due);
      account.creditBalance = Number((account.creditBalance - applied).toFixed(2));
      due = Number((due - applied).toFixed(2));
    }
    account.dueBalance = due;
  }

  account.lastActivityAt = new Date();
}
