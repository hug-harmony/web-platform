import { NextResponse } from "next/server";
import { uploadToS3WithRandomSuffix } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files allowed" },
        { status: 400 }
      );
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 2MB" },
        { status: 400 }
      );
    }

    const result = await uploadToS3WithRandomSuffix(file, "merchandise");

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
