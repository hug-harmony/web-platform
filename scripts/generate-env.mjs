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
  "PUSH_SUBSCRIPTIONS_TABLE",
  "VIDEO_ROOMS_TABLE",

  // SNS Notifications
  "NOTIFICATION_TOPIC_ARN",

  // Push Notifications (VAPID)
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_EMAIL",

  // Online Status
  "APP_URL",
  "INTERNAL_API_KEY",

  // Cron
  "CRON_SECRET",
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

// Log SNS config status
console.log("\n📬 SNS Notification Configuration:");
console.log(
  `   NOTIFICATION_TOPIC_ARN: ${process.env.NOTIFICATION_TOPIC_ARN ? "✓ Set" : "✗ Missing"}`
);

// Log Push Notification config status
const pushVars = [
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_EMAIL",
];
console.log("\n🔔 Push Notification Configuration:");
pushVars.forEach((v) => {
  console.log(`   ${v}: ${process.env[v] ? "✓ Set" : "✗ Missing"}`);
});

// Log Online Status config status
const onlineStatusVars = ["APP_URL", "INTERNAL_API_KEY"];
console.log("\n🟢 Online Status Configuration:");
onlineStatusVars.forEach((v) => {
  console.log(`   ${v}: ${process.env[v] ? "✓ Set" : "✗ Missing"}`);
});
