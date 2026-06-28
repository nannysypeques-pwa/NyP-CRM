import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import sharp from "sharp";
import path from "path";
import fs from "fs";

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { lead: true }
    });

    if (!cotizacion || cotizacion.deleted) {
      return new NextResponse("Cotización no encontrada", { status: 404 });
    }

    const templatePath = path.join(process.cwd(), "public", "images", "cotizacion_base.png");
    if (!fs.existsSync(templatePath)) {
      return new NextResponse("Plantilla base no encontrada", { status: 500 });
    }

    const rawFecha = new Date(cotizacion.creadoEn).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const fecha = escapeXml(rawFecha.replace(/[\u200e\u200f\u202a-\u202e]/g, ""));
    const cliente = escapeXml(cotizacion.lead.nombreCompleto);
    const edadPeque = escapeXml(cotizacion.lead.edadHijo ? `${cotizacion.lead.edadHijo} años` : "Por definir");
    const horario = escapeXml(`${cotizacion.dias} de ${cotizacion.horaInicio} a ${cotizacion.horaFin} (${cotizacion.horasPorDia} hrs/día)`);
    const zona = escapeXml(cotizacion.lead.zona || "Por definir");
    const precio = escapeXml(`$${cotizacion.total.toLocaleString("es-MX")} MXN`);
    const precioDetalle = escapeXml(cotizacion.notas || "");
    const nota = escapeXml(cotizacion.tipoServicio || "Por definir");
    const notaDetalle = escapeXml("Las horas extra tienen un costo de $100 pesos c/u.");

    const svgOverlay = `
      <svg width="791" height="1024" xmlns="http://www.w3.org/2000/svg">
        <!-- Fecha -->
        <text x="120" y="200" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${fecha}</text>
        
        <!-- Nombre del cliente -->
        <text x="350" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${cliente}</text>
        
        <!-- Edad del peque -->
        <text x="310" y="390" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${edadPeque}</text>
        
        <!-- Horario -->
        <text x="210" y="440" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${horario}</text>
        
        <!-- Zona -->
        <text x="180" y="490" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${zona}</text>
        
        <!-- Precio -->
        <text x="200" y="565" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="#D53F8C">${precio}</text>
        <text x="200" y="615" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="500" fill="#718096" font-style="italic">${precioDetalle}</text>
        
        <!-- Nota -->
        <text x="170" y="670" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${nota}</text>
        <text x="200" y="730" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="500" fill="#718096" font-style="italic">${notaDetalle}</text>
      </svg>
    `;

    const pngBuffer = await sharp(templatePath)
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }])
      .toBuffer();

    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, must-revalidate"
      }
    });
  } catch (err: any) {
    console.error("Error al generar imagen de cotización:", err);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
