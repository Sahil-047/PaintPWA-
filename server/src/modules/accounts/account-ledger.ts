import type { IAccount } from './accounts.model.js';

/**
 * Keeps due vs customer credit in sync.
 * - If paid > billed: excess moves to creditBalance (collections unchanged in memos).
 * - If billed > paid: due is reduced by available credit first.
 */
export function syncAccountLedger(account: IAccount): void {
  const net = Number((account.totalBilled - account.totalPaid).toFixed(2));

  if (net < 0) {
    const surplus = Math.abs(net);
    account.creditBalance = Number((account.creditBalance + surplus).toFixed(2));
    account.totalPaid = Number(account.totalBilled.toFixed(2));
    account.dueBalance = 0;
  } else {
    let due = net;
    if (account.creditBalance > 0 && due > 0) {
      const applied = Math.min(account.creditBalance, due);
      account.creditBalance = Number((account.creditBalance - applied).toFixed(2));
      due = Number((due - applied).toFixed(2));
    }
    account.dueBalance = due;
  }

  account.lastActivityAt = new Date();
}
