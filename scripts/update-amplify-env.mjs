// scripts/update-amplify-env.mjs
import fs from "fs";
import { execSync } from "child_process";

const CDK_OUTPUTS_FILE = "cdk-outputs.json";

function main() {
  console.log("\n🚀 WebSocket Deployment Complete!\n");

  // Try to read CDK outputs
  let outputs = {};
  try {
    const content = fs.readFileSync(CDK_OUTPUTS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    // Get the first stack's outputs
    const stackKey = Object.keys(parsed)[0];
    outputs = parsed[stackKey] || {};
  } catch (error) {
    console.error("⚠️  Could not read CDK outputs file:", error.message);
    console.log(
      "   You may need to manually get the values from AWS Console.\n"
    );
  }

  const websocketUrl = outputs.WebSocketURL || "YOUR_WEBSOCKET_URL";
  const websocketApiEndpoint =
    outputs.WebSocketApiEndpoint || "YOUR_WEBSOCKET_API_ENDPOINT";
  const connectionsTable =
    outputs.ConnectionsTableName || "ChatConnections-prod";

  console.log("📋 Add these environment variables to AWS Amplify:\n");
  console.log(
    "   In AWS Console → Amplify → Your App → Environment Variables\n"
  );
  console.log(
    "   ┌─────────────────────────────────────────────────────────────────┐"
  );
  console.log(
    "   │ Variable Name               │ Value                             │"
  );
  console.log(
    "   ├─────────────────────────────────────────────────────────────────┤"
  );
  console.log(`   │ NEXT_PUBLIC_WEBSOCKET_URL   │ ${websocketUrl}`);
  console.log(`   │ WEBSOCKET_API_ENDPOINT      │ ${websocketApiEndpoint}`);
  console.log(`   │ CONNECTIONS_TABLE           │ ${connectionsTable}`);
  console.log(
    "   └─────────────────────────────────────────────────────────────────┘\n"
  );

  // Also create a .env.local file for local development
  const envContent = `
# WebSocket Configuration (added by deploy script)
NEXT_PUBLIC_WEBSOCKET_URL=${websocketUrl}
WEBSOCKET_API_ENDPOINT=${websocketApiEndpoint}
CONNECTIONS_TABLE=${connectionsTable}
`.trim();

  // Append to .env.local if it exists, otherwise create
  const envPath = ".env.local";
  try {
    let existingContent = "";
    if (fs.existsSync(envPath)) {
      existingContent = fs.readFileSync(envPath, "utf-8");

      // Remove old WebSocket config if present
      existingContent = existingContent
        .split("\n")
        .filter(
          (line) =>
            !line.startsWith("NEXT_PUBLIC_WEBSOCKET_URL") &&
            !line.startsWith("WEBSOCKET_API_ENDPOINT") &&
            !line.startsWith("CONNECTIONS_TABLE") &&
            !line.includes("WebSocket Configuration")
        )
        .join("\n");
    }

    fs.writeFileSync(envPath, existingContent + "\n\n" + envContent);
    console.log("✅ Updated .env.local with WebSocket configuration\n");
  } catch (error) {
    console.error("⚠️  Could not update .env.local:", error.message);
  }

  console.log("📝 Next Steps:");
  console.log("   1. Add the environment variables to Amplify Console");
  console.log("   2. Trigger a new deployment in Amplify");
  console.log("   3. Test the WebSocket connection\n");

  console.log("🧪 To test locally:");
  console.log("   npm run dev\n");
}

main();
