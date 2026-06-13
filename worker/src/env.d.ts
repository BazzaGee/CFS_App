export interface Env {
  HOUSEHOLD_SYNC: DurableObjectNamespace;
  INVITE_STORE: DurableObjectNamespace;
  DB: D1Database;
  AI_PROVIDER: string;
  JWT_SECRET: string;
  DEEPSEEK_KEY: string;
  ALIBABA_KEY: string;
  ZAI_KEY: string;
  OPENROUTER_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  SITE_URL: string;
  PWA_URL: string;
}
