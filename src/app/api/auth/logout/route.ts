import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ message: "Sesión cerrada correctamente" });

    // Clear session and activeCity cookies by setting past expiration
    response.cookies.set("session", "", { path: "/", maxAge: 0 });
    response.cookies.set("activeCity", "", { path: "/", maxAge: 0 });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Error al cerrar sesión" }, { status: 500 });
  }
}
