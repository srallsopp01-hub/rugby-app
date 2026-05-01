import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This invite link is no longer valid. Ask your coach for the team join link." },
    { status: 410 }
  );
}
