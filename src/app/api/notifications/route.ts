import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const leads = await db.getLeads();

    const notifications = leads
      .filter((lead: any) => lead.estado === "GANADO" || lead.estado === "ATENCION_HUMANA" || lead.listoParaCierre)
      .map((lead: any) => {
        const esListoCierre = lead.estado === "GANADO" || lead.listoParaCierre;

        return {
          id: lead.id,
          leadId: lead.id,
          nombreCompleto: lead.nombreCompleto || "Prospecto sin nombre",
          ciudad: lead.ciudad || "Por definir",
          telefono: lead.telefono || "",
          tipo: esListoCierre ? "LISTO_CIERRE" : "ATENCION_HUMANA",
          titulo: esListoCierre ? "🟢 Listo para Cierre" : "🟣 Atención Humana Requerida",
          mensaje: esListoCierre
            ? `El lead ${lead.nombreCompleto} ha completado la precotización y está listo para cerrar contratación.`
            : `El lead ${lead.nombreCompleto} requiere intervención de un asesor comercial humano.`,
          fecha: lead.actualizadoEn || lead.creadoEn,
          link: `/inbox`
        };
      })
      .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error in GET /api/notifications:", error);
    return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 });
  }
}
