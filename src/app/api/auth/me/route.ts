import { NextRequest, NextResponse } from "next/server";
import { decryptSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ user: null });
    }
    const user = decryptSession(sessionCookie);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
