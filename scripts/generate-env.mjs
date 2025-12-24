// scripts/generate-env.mjs
import fs from "fs";

const envVars = [
  // Auth
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",

  // Database
  "DATABASE_URL",

  // AWS General
  "AWS_REGION",
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

  // Supabase (can remove after full migration)
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",

  // Public URLs
  "NEXT_PUBLIC_APP_URL",

  // WebSocket Configuration
  "NEXT_PUBLIC_WEBSOCKET_URL",
  "WEBSOCKET_API_ENDPOINT",
  "CONNECTIONS_TABLE",
  "NOTIFICATIONS_TABLE",

  // Online Status (NEW)
  "APP_URL",
  "INTERNAL_API_KEY",
];

const envContent = envVars
  .filter((key) => process.env[key])
  .map((key) => `${key}=${process.env[key]}`)
  .join("\n");

fs.writeFileSync(".env", envContent);

console.log(
  `✅ Generated .env with ${envVars.filter((k) => process.env[k]).length} variables`
);

// Log WebSocket config status
const wsVars = [
  "NEXT_PUBLIC_WEBSOCKET_URL",
  "WEBSOCKET_API_ENDPOINT",
  "CONNECTIONS_TABLE",
];
console.log("\n📡 WebSocket Configuration:");
wsVars.forEach((v) => {
  console.log(`   ${v}: ${process.env[v] ? "✓ Set" : "✗ Missing"}`);
});

// Log Online Status config status (NEW)
const onlineStatusVars = ["APP_URL", "INTERNAL_API_KEY"];
console.log("\n🟢 Online Status Configuration:");
onlineStatusVars.forEach((v) => {
  console.log(`   ${v}: ${process.env[v] ? "✓ Set" : "✗ Missing"}`);
});
