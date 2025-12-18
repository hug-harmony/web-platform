import { NextResponse } from "next/server";

export async function GET() {
  // Only show in non-production or with secret header
  const isDebugAllowed =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_DEBUG === "true";

  if (!isDebugAllowed) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  return NextResponse.json({
    REGION: process.env.REGION ? "✅ Set" : "❌ Missing",
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ? "✅ Set" : "❌ Missing",
    // Show partial values for debugging
    REGION_VALUE: process.env.REGION || "not set",
    S3_BUCKET_VALUE: process.env.S3_BUCKET_NAME || "not set",
    NODE_ENV: process.env.NODE_ENV,
  });
}
