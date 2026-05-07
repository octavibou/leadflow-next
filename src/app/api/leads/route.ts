import { NextResponse } from "next/server";

/**
 * Disabled in production: previously this route used the Supabase service role
 * key and returned leads across all users, which is unsafe to expose.
 */
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
