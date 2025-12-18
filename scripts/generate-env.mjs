import fs from "fs";

const envVars = [
  // Auth
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",

  // Database
  "DATABASE_URL",

  // AWS S3
  "REGION",
  "S3_BUCKET_NAME",
  "ACCESS_KEY_ID",
  "SECRET_ACCESS_KEY",

  // Google OAuth
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",

  // Email
  "GMAIL_USER",
  "ADMIN_EMAIL",

  // Supabase
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",

  // Public URLs
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEBSOCKET_URL",
  "WEBSOCKET_URL",
];

const envContent = envVars
  .filter((key) => process.env[key])
  .map((key) => `${key}=${process.env[key]}`)
  .join("\n");

fs.writeFileSync(".env", envContent);

console.log(
  `✅ Generated .env with ${envVars.filter((k) => process.env[k]).length} variables`
);
