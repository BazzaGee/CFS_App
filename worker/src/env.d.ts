export interface Env {
  HOUSEHOLD_SYNC: DurableObjectNamespace;
  INVITE_STORE: DurableObjectNamespace;
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;
}
