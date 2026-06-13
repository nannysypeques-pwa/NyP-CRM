import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSession } from "@/lib/session";

function getSessionUser(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) return null;
  return decryptSession(sessionCookie);
}

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const docs = await prisma.documentoConocimiento.findMany({
      orderBy: { creadoEn: "desc" }
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("GET /api/knowledge error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.rol !== "GERENTE" && user.rol !== "COORDINADOR") {
      return NextResponse.json({ error: "No autorizado para modificar la base de conocimientos" }, { status: 403 });
    }

    const { titulo, categoria, contenido, estado } = await req.json();

    if (!titulo || !categoria || !contenido) {
      return NextResponse.json({ error: "Título, categoría y contenido son requeridos" }, { status: 400 });
    }

    const newDoc = await prisma.documentoConocimiento.create({
      data: {
        titulo,
        categoria,
        contenido,
        estado: estado || "ACTIVO"
      }
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("POST /api/knowledge error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
