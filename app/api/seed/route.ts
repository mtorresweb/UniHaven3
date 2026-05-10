import { NextResponse } from "next/server";
import { seedKnowledgeAreas } from "@/lib/db/areas";

// Only available in development
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  await seedKnowledgeAreas();
  return NextResponse.json({ ok: true });
}
