export const APP_NAME = 'paintapp';

export const ROUTES = {
  HOME: '/',
  SIGNUP: '/signup',
  PENDING_APPROVAL: '/pending-approval',
  ADMIN: '/admin',
  DASHBOARD: '/dashboard',
  BILLING: '/billing',
  INVENTORY: '/inventory',
  REPORTS: '/reports',
  ACCOUNTS: '/accounts',
  ACCOUNT_DETAIL: '/accounts/:customerId',
  SETTINGS: '/settings',
} as const;

export function accountDetailPath(customerId: string) {
  return `/accounts/${customerId}`;
}

