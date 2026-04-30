import { NextResponse } from "next/server";
import { getR2Config } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET() {
  const { config, missing } = getR2Config();
  return NextResponse.json({
    configured: Boolean(config),
    missing,
  });
}
