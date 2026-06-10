import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { titulo, descripcion, fechaVencimiento } = body;
    if (!titulo || !fechaVencimiento) {
      return NextResponse.json({ error: "Faltan datos obligatorios (titulo o fechaVencimiento)" }, { status: 400 });
    }
    const seguimiento = await db.addSeguimiento(params.id, { titulo, descripcion, fechaVencimiento });
    return NextResponse.json(seguimiento, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add follow-up" }, { status: 500 });
  }
}
