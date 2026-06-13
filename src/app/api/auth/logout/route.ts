import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}

export async function GET(req: NextRequest) {
  const loginUrl = new URL("/login", req.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set("session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}
