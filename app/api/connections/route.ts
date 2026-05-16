import { NextResponse } from "next/server";
import { detectConnections } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(detectConnections());
}
