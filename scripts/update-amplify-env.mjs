// scripts/update-amplify-env.mjs
import fs from "fs";

const CDK_OUTPUTS_FILE = "cdk-outputs.json";

function main() {
  console.log("\n🚀 CDK Deployment Complete!\n");

  // Try to read CDK outputs
  let outputs = {};
  try {
    const content = fs.readFileSync(CDK_OUTPUTS_FILE, "utf-8");
    outputs = JSON.parse(content);
  } catch (error) {
    console.error("⚠️  Could not read CDK outputs file:", error.message);
    console.log(
      "   You may need to manually get the values from AWS Console.\n"
    );
    return;
  }

  // Extract WebSocket Stack outputs
  const wsStackKey = Object.keys(outputs).find((k) =>
    k.startsWith("ChatWebSocketStack")
  );
  const wsStack = wsStackKey ? outputs[wsStackKey] : {};

  // Extract Notification Stack outputs
  const notifStackKey = Object.keys(outputs).find((k) =>
    k.startsWith("NotificationStack")
  );
  const notifStack = notifStackKey ? outputs[notifStackKey] : {};

  // Extract Chime Stack outputs
  const chimeStackKey = Object.keys(outputs).find((k) =>
    k.startsWith("ChimeStack")
  );
  const chimeStack = chimeStackKey ? outputs[chimeStackKey] : {};

  // Extract Payment Stack outputs
  const paymentStackKey = Object.keys(outputs).find((k) =>
    k.startsWith("PaymentSchedulerStack")
  );
  const paymentStack = paymentStackKey ? outputs[paymentStackKey] : {};

  // Gather all environment variables
  const envVars = {
    // WebSocket
    NEXT_PUBLIC_WEBSOCKET_URL: wsStack.WebSocketURL || "",
    WEBSOCKET_API_ENDPOINT: wsStack.WebSocketApiEndpoint || "",
    CONNECTIONS_TABLE: wsStack.ConnectionsTableName || "ChatConnections-prod",
    NOTIFICATIONS_TABLE: wsStack.NotificationsTableName || "Notifications-prod",
    PUSH_SUBSCRIPTIONS_TABLE:
      wsStack.PushSubscriptionsTableName || "PushSubscriptions-prod",

    // Notifications (SNS)
    NOTIFICATION_TOPIC_ARN: notifStack.NotificationTopicArn || "",
    NOTIFICATION_QUEUE_URL: notifStack.NotificationQueueUrl || "",

    // Video
    VIDEO_ROOMS_TABLE: chimeStack.VideoRoomsTableName || "VideoRooms-prod",
  };

  // Print to console
  console.log("📋 Environment Variables from CDK:\n");
  console.log(
    "┌─────────────────────────────────────────────────────────────────────────────┐"
  );
  console.log(
    "│ Variable Name                  │ Value                                      │"
  );
  console.log(
    "├─────────────────────────────────────────────────────────────────────────────┤"
  );

  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      const displayValue =
        value.length > 40 ? value.substring(0, 37) + "..." : value;
      console.log(`│ ${key.padEnd(30)} │ ${displayValue.padEnd(42)} │`);
    }
  });

  console.log(
    "└─────────────────────────────────────────────────────────────────────────────┘\n"
  );

  // Update .env.local
  const envPath = ".env.local";
  try {
    let existingContent = "";
    if (fs.existsSync(envPath)) {
      existingContent = fs.readFileSync(envPath, "utf-8");

      // Remove old CDK-generated config
      const keysToRemove = Object.keys(envVars);
      existingContent = existingContent
        .split("\n")
        .filter((line) => {
          const key = line.split("=")[0];
          return !keysToRemove.includes(key) && !line.includes("# CDK Output");
        })
        .join("\n")
        .trim();
    }

    // Build new env content
    const newEnvLines = [
      "",
      "# CDK Output Configuration (auto-generated)",
      `# Generated at: ${new Date().toISOString()}`,
    ];

    Object.entries(envVars).forEach(([key, value]) => {
      if (value) {
        newEnvLines.push(`${key}=${value}`);
      }
    });

    const finalContent = existingContent + "\n" + newEnvLines.join("\n") + "\n";
    fs.writeFileSync(envPath, finalContent);

    console.log("✅ Updated .env.local with CDK configuration\n");
  } catch (error) {
    console.error("⚠️  Could not update .env.local:", error.message);
  }

  // Print next steps
  console.log("📝 Next Steps:");
  console.log("   1. Add the environment variables to Amplify Console:");
  console.log("      AWS Console → Amplify → Your App → Environment Variables");
  console.log("   2. Trigger a new deployment in Amplify");
  console.log("   3. Test the notification flow\n");

  console.log("🧪 To test locally:");
  console.log("   npm run dev\n");

  // Print SNS status
  if (notifStack.NotificationTopicArn) {
    console.log("✅ SNS Notifications configured:");
    console.log(`   Topic: ${notifStack.NotificationTopicArn}`);
    console.log(`   Queue: ${notifStack.NotificationQueueUrl || "N/A"}\n`);
  } else {
    console.log("⚠️  SNS Notifications not configured");
    console.log("   Run: npm run cdk:deploy:notifications\n");
  }
}

main();
