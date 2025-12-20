// lambda/utils/secrets.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({});

interface AppSecrets {
  NEXTAUTH_SECRET: string;
}

let cachedSecrets: AppSecrets | null = null;

export async function getSecrets(): Promise<AppSecrets> {
  // Return cached secrets if available (Lambda reuses containers)
  if (cachedSecrets) {
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
    return cachedSecrets;
  } catch (error) {
    console.error("Failed to fetch secrets:", error);
    throw error;
  }
}

export async function getNextAuthSecret(): Promise<string> {
  const secrets = await getSecrets();
  return secrets.NEXTAUTH_SECRET;
}
