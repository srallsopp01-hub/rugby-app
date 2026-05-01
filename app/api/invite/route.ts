import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email invites are no longer available. Share your team join link instead." },
    { status: 410 }
  );
}
