import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { tipoServicio, ciudad, dias, horaInicio, horaFin, horasPorDia, cantidadHijos, subtotal, descuento, total, creadoPor } = body;
    if (!tipoServicio || !total || !creadoPor) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }
    const cotizacion = await db.addCotizacion(params.id, {
      idLead: params.id,
      tipoServicio,
      ciudad,
      dias,
      horaInicio,
      horaFin,
      horasPorDia,
      cantidadHijos,
      subtotal,
      descuento,
      total,
      creadoPor
    });
    return NextResponse.json(cotizacion, { status: 201 });
  } catch (error) {
    console.error("Error al guardar cotización:", error);
    return NextResponse.json({ error: "Failed to add quote" }, { status: 500 });
  }
}
