import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { contenido, nombreAgente } = body;
    if (!contenido || !nombreAgente) {
      return NextResponse.json({ error: "Faltan datos obligatorios (contenido o nombreAgente)" }, { status: 400 });
    }
    const nota = await db.addNota(params.id, contenido, nombreAgente);
    return NextResponse.json(nota, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
