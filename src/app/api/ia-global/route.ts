import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getGlobalIA, setGlobalIA } from "@/lib/iaGlobal";

/** GET /api/ia-global — Devuelve el estado actual del switch global de IA */
export async function GET() {
  return NextResponse.json({ iaGlobal: getGlobalIA() });
}

/** POST /api/ia-global — Cambia el switch global y aplica a todas las conversaciones existentes */
export async function POST(req: NextRequest) {
  try {
    const { iaGlobal } = await req.json();
    if (typeof iaGlobal !== "boolean") {
      return NextResponse.json({ error: "iaGlobal debe ser un booleano" }, { status: 400 });
    }

    // Guardar el valor global en el singleton del proceso
    setGlobalIA(iaGlobal);

    // Aplicar a todas las conversaciones existentes que no han sido borradas
    await prisma.conversacion.updateMany({
      where: { deleted: false },
      data: { iaActiva: iaGlobal }
    });

    return NextResponse.json({ iaGlobal, applied: true });
  } catch (err) {
    console.error("Error al cambiar IA global:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
