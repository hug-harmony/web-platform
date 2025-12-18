import { NextResponse } from "next/server";
import { uploadToS3WithRandomSuffix } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    const result = await uploadToS3WithRandomSuffix(file, "messages");

    return NextResponse.json({ url: result.url }, { status: 200 });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
