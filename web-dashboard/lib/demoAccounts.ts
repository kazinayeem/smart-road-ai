/** Demo quick-login is a development aid. It renders only when NEXT_PUBLIC_ENABLE_DEMO_LOGIN=1. */
export const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === '1';

export interface DemoAccount { key: string; label: string; email: string; username: string; password: string; role: string }

// The env var is inlined at build time, so when it is not '1' this require() is dead code and the
// demo credentials are NOT included in the production bundle (verified by grepping .next output).
export const DEMO_ACCOUNTS: DemoAccount[] =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === '1'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('../../scripts/demo_accounts.json').accounts as DemoAccount[])
    : [];
