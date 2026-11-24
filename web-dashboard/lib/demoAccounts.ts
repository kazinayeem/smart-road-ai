/** Demo quick-login is a development aid. It renders only when NEXT_PUBLIC_ENABLE_DEMO_LOGIN=1. */
export const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === '1';

export interface DemoAccount { key: string; label: string; email: string; username: string; password: string; role: string }

// The flag is inlined at build time (next.config.mjs `env`). When it is not '1', this branch is
// removed and the demo credentials are NOT in the production bundle — re-check with:
//   npm run build && grep -rl "CityAdmin@2026" .next/static   (must print nothing)
let accounts: DemoAccount[] = [];
if (process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === '1') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  accounts = require('../../scripts/demo_accounts.json').accounts;
}
export const DEMO_ACCOUNTS: DemoAccount[] = accounts;
