import { NextResponse } from "next/server";
import { runShowcaseSeed } from "@/prisma/seed";

// Only available in development
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const result = await runShowcaseSeed();
  return NextResponse.json(result);
}
