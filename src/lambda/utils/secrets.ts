// src/lambda/utils/secrets.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({});

interface AppSecrets {
  // Auth
  NEXTAUTH_SECRET: string;

  // VAPID Keys for Push Notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL?: string;

  // Other secrets that might be stored
  DATABASE_URL?: string;
  STRIPE_SECRET_KEY?: string;
  [key: string]: string | undefined;
}

let cachedSecrets: AppSecrets | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all secrets from Secrets Manager (with caching)
 */
export async function getSecrets(): Promise<AppSecrets> {
  const now = Date.now();

  // Return cached secrets if still valid
  if (cachedSecrets && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSecrets;
  }

  const secretName = process.env.SECRETS_NAME;

  if (!secretName) {
    throw new Error("SECRETS_NAME environment variable is not set");
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error("Secret value is empty");
    }

    cachedSecrets = JSON.parse(response.SecretString) as AppSecrets;
    cacheTimestamp = now;

    return cachedSecrets;
  } catch (error) {
    console.error("Failed to fetch secrets:", error);
    throw error;
  }
}

/**
 * Get NextAuth secret
 */
export async function getNextAuthSecret(): Promise<string> {
  const secrets = await getSecrets();
  return secrets.NEXTAUTH_SECRET;
}

/**
 * Get VAPID keys for push notifications
 */
export async function getVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
  email: string;
} | null> {
  const secrets = await getSecrets();

  const publicKey =
    secrets.NEXT_PUBLIC_VAPID_PUBLIC_KEY || secrets.VAPID_PUBLIC_KEY;
  const privateKey = secrets.VAPID_PRIVATE_KEY;
  const email = secrets.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    console.warn("VAPID keys not fully configured in secrets");
    return null;
  }

  return { publicKey, privateKey, email };
}

/**
 * Get a specific secret value
 */
export async function getSecretValue(key: string): Promise<string | undefined> {
  const secrets = await getSecrets();
  return secrets[key];
}

/**
 * Clear the secrets cache (useful for testing or forcing refresh)
 */
export function clearSecretsCache(): void {
  cachedSecrets = null;
  cacheTimestamp = 0;
}
