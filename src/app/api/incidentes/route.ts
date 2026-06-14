import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSession } from "@/lib/session";

// Helper to validate session
async function validateSession(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) return null;
  const user = decryptSession(sessionCookie);
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const session = await validateSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const incidentes = await db.getIncidentesActivos();
    return NextResponse.json(incidentes);
  } catch (error) {
    console.error("GET /api/incidentes error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await validateSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID de incidente requerido." }, { status: 400 });
    }

    const actualizado = await db.resolverIncidente(id);
    return NextResponse.json(actualizado);
  } catch (error) {
    console.error("PATCH /api/incidentes error:", error);
    return NextResponse.json({ error: "Error al resolver el incidente" }, { status: 500 });
  }
}
