import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSession } from "@/lib/session";

function getSessionUser(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) return null;
  return decryptSession(sessionCookie);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.rol !== "GERENTE" && user.rol !== "COORDINADOR") {
      return NextResponse.json({ error: "No autorizado para modificar la base de conocimientos" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    const existingDoc = await prisma.documentoConocimiento.findUnique({
      where: { id }
    });

    if (!existingDoc) {
      return NextResponse.json({ error: "Documento de conocimiento no encontrado" }, { status: 404 });
    }

    const updatedDoc = await prisma.documentoConocimiento.update({
      where: { id },
      data: {
        titulo: body.titulo !== undefined ? body.titulo : existingDoc.titulo,
        categoria: body.categoria !== undefined ? body.categoria : existingDoc.categoria,
        contenido: body.contenido !== undefined ? body.contenido : existingDoc.contenido,
        estado: body.estado !== undefined ? body.estado : existingDoc.estado,
      }
    });

    return NextResponse.json(updatedDoc);
  } catch (error) {
    console.error("PATCH /api/knowledge/[id] error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.rol !== "GERENTE" && user.rol !== "COORDINADOR") {
      return NextResponse.json({ error: "No autorizado para modificar la base de conocimientos" }, { status: 403 });
    }

    const { id } = params;

    const existingDoc = await prisma.documentoConocimiento.findUnique({
      where: { id }
    });

    if (!existingDoc) {
      return NextResponse.json({ error: "Documento de conocimiento no encontrado" }, { status: 404 });
    }

    await prisma.documentoConocimiento.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Documento de conocimiento eliminado correctamente" });
  } catch (error) {
    console.error("DELETE /api/knowledge/[id] error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
