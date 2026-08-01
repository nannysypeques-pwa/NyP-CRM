import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  try {
    const body = await req.json();
    const { contenido } = body;

    if (!contenido || !contenido.trim()) {
      return NextResponse.json({ error: "El contenido no puede estar vacío" }, { status: 400 });
    }

    const updatedMsg = await db.updateMessage(params.messageId, contenido.trim());
    return NextResponse.json(updatedMsg);
  } catch (error) {
    console.error("Error al editar mensaje:", error);
    return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
  }
}
