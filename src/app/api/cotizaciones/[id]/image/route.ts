import "@/lib/initFontconfig";
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
      case "'": return '&apos;';
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
      include: { 
        lead: {
          include: {
            hijos: true
          }
        } 
      }
    });

    if (!cotizacion || cotizacion.deleted) {
      return new NextResponse("Cotización no encontrada", { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RUTA 1: Cotización con imagen congelada (creada después del nuevo sistema)
    // Servir el archivo estático permanente sin regenerar nada.
    // ─────────────────────────────────────────────────────────────────────────
    if (cotizacion.imagenUrl) {
      const staticFilePath = path.join(process.cwd(), "public", cotizacion.imagenUrl);
      if (fs.existsSync(staticFilePath)) {
        const pngBuffer = fs.readFileSync(staticFilePath);
        return new Response(new Uint8Array(pngBuffer), {
          headers: {
            "Content-Type": "image/png",
            // Inmutable: esta imagen nunca cambiará
            "Cache-Control": "public, max-age=31536000, immutable"
          }
        });
      }
      // Si el archivo fue borrado del disco por algún motivo, cae al fallback dinámico
      console.warn(`[QuoteImage] Archivo estático no encontrado en disco: ${staticFilePath}. Usando fallback dinámico.`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RUTA 2: Fallback dinámico para cotizaciones antiguas sin imagenUrl
    // Se regenera en tiempo real (comportamiento original).
    // ─────────────────────────────────────────────────────────────────────────
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
    const cliente = escapeXml((cotizacion as any).nombreCliente || cotizacion.lead.nombreCompleto);
    
    // Priorizar snapshot congelado de edadPeque en la cotización, o fallback dinámico si es una cotización antigua
    let rawEdad = (cotizacion as any).edadPeque || "";
    if (!rawEdad) {
      if (cotizacion.lead.hijos && cotizacion.lead.hijos.length > 0) {
        const hijoConEdad = cotizacion.lead.hijos.find(h => h.textoEdad && h.textoEdad.trim() !== "");
        if (hijoConEdad) {
          rawEdad = hijoConEdad.textoEdad;
        }
      }
      if (!rawEdad && cotizacion.lead.edadHijo !== null && cotizacion.lead.edadHijo !== undefined) {
        if (cotizacion.lead.edadHijo === 0) {
          rawEdad = "Menor a 1 año";
        } else {
          rawEdad = `${cotizacion.lead.edadHijo} ${cotizacion.lead.edadHijo === 1 ? "año" : "años"}`;
        }
      }
    }
    if (!rawEdad) {
      rawEdad = "Por definir";
    }
    const edadPeque = escapeXml(rawEdad);

    const horario = escapeXml(`${cotizacion.dias} de ${cotizacion.horaInicio} a ${cotizacion.horaFin} (${cotizacion.horasPorDia} hrs/día)`);
    const zona = escapeXml((cotizacion as any).zona || cotizacion.lead.zona || "Por definir");
    const precio = escapeXml(`$${cotizacion.total.toLocaleString("es-MX")} MXN`);
    const precioDetalle = escapeXml(cotizacion.notas || "");
    const nota = escapeXml(cotizacion.tipoServicio || "Por definir");

    // Ajuste de coordenadas Y para que el texto descanse perfectamente sobre las líneas rosas del formato
    const svgOverlay = `
      <svg width="791" height="1024" xmlns="http://www.w3.org/2000/svg">
        <!-- Fecha -->
        <text x="145" y="210" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${fecha}</text>
        
        <!-- Nombre del cliente -->
        <text x="345" y="350" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${cliente}</text>
        
        <!-- Edad del peque -->
        <text x="305" y="400" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${edadPeque}</text>
        
        <!-- Horario -->
        <text x="210" y="450" font-family="Segoe UI, Arial, sans-serif" font-size="19" font-weight="600" fill="#3A3A3C">${horario}</text>
        
        <!-- Zona -->
        <text x="180" y="507" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${zona}</text>
        
        <!-- Precio -->
        <text x="200" y="562" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="#D53F8C">${precio}</text>
        <text x="200" y="588" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="500" fill="#718096" font-style="italic">${precioDetalle}</text>
        
        <!-- Nota -->
        <text x="170" y="665" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${nota}</text>
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
