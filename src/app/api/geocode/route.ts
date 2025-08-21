// src/app/api/geocode/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  const ACCESS_TOKEN = process.env.LOCATION_IQ_TOKEN;
  if (!location || !ACCESS_TOKEN) {
    return NextResponse.json(null, { status: 400 });
  }
  const url = `https://us1.locationiq.com/v1/search?key=${ACCESS_TOKEN}&q=${encodeURIComponent(location)}&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json(null);
    const data = await res.json();
    if (data.length > 0) {
      return NextResponse.json({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      });
    }
    return NextResponse.json(null);
  } catch (e) {
    console.error("Geocoding error:", e);
    return NextResponse.json(null);
  }
}
