import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json(
        { error: "Missing publicId parameter" },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary credentials not configured on the server" },
        { status: 500 }
      );
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();

    // Generate Cloudinary SHA-1 signature
    // Alphabetical order: public_id, then timestamp
    const signatureSource = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(signatureSource)
      .digest("hex");

    const body = new URLSearchParams();
    body.append("public_id", publicId);
    body.append("timestamp", timestamp);
    body.append("api_key", apiKey);
    body.append("signature", signature);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (data.result === "ok") {
      return NextResponse.json({ success: true, result: data.result });
    } else {
      console.error("Cloudinary destroy response error:", data);
      return NextResponse.json(
        { error: "Cloudinary deletion failed", details: data },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Failed to delete image from Cloudinary:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
