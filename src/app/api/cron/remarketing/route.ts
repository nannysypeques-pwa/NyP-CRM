import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { generateRemarketingMessageForStage } from "@/lib/openai";

export async function GET(req: NextRequest) {
  return handleRemarketingExecution();
}

export async function POST(req: NextRequest) {
  return handleRemarketingExecution();
}

async function handleRemarketingExecution() {
  try {
    // 1. Obtener todos los leads con estado "COTIZADO" que tienen conversación con IA activa
    const cotizadoLeads = await prisma.lead.findMany({
      where: {
        estado: "COTIZADO"
      },
      include: {
        hijos: true,
        cotizaciones: true,
        conversacion: {
          include: {
            mensajes: {
              orderBy: { creadoEn: "desc" },
              take: 50
            }
          }
        }
      }
    });

    const now = new Date();
    const currentHour = now.getHours();
    const results = [];

    for (const lead of cotizadoLeads) {
      if (!lead.conversacion) continue;

      const conv = lead.conversacion;
      if (!conv.iaActiva) continue;

      const mensajes = conv.mensajes || [];
      const lastMsg = mensajes[0];

      // Si el último mensaje fue del cliente (INBOUND), no le enviamos remarketing
      if (lastMsg && lastMsg.direccion === "INBOUND") continue;

      // Buscar la fecha del ÚLTIMO mensaje enviado por el cliente (punto de referencia dinámico)
      const lastClientMsg = mensajes.find(m => m.direccion === "INBOUND");
      const tClienteRef = lastClientMsg ? new Date(lastClientMsg.creadoEn) : new Date(lead.creadoEn);

      // Filtrar TODOS los mensajes de remarketing enviados a esta conversación en toda su historia
      const totalRemarketingMsgsSent = mensajes.filter(m => 
        m.direccion === "OUTBOUND" && 
        m.tipoRemitente === "IA" &&
        (
          m.contenido.includes("[REMARKETING") ||
          m.contenido.includes("✨") || 
          m.contenido.includes("🌸") || 
          m.contenido.includes("🧸") || 
          m.contenido.includes("💛")
        )
      );

      // La etapa a evaluar avanza progresivamente (1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7) sin reiniciar jamás aunque el cliente responda
      const stageToEvaluate = totalRemarketingMsgsSent.length + 1;
      if (stageToEvaluate > 7) {
        // Ya se enviaron las 7 etapas únicas de remarketing a este prospecto
        continue;
      }

      const hoursSinceClient = (now.getTime() - tClienteRef.getTime()) / (1000 * 60 * 60);
      const lastRemarketingMsg = totalRemarketingMsgsSent[0];
      const hoursSinceLastRemarketing = lastRemarketingMsg 
        ? (now.getTime() - new Date(lastRemarketingMsg.creadoEn).getTime()) / (1000 * 60 * 60)
        : hoursSinceClient;

      let isEligible = false;

      switch (stageToEvaluate) {
        case 1:
          // 1er mensaje: a las 2 horas de que no responda
          if (hoursSinceClient >= 2 && hoursSinceLastRemarketing >= 1.5) {
            isEligible = true;
          }
          break;

        case 2:
          // 2do mensaje: a las siguientes 4 horas (6 horas del último mensaje del cliente)
          if (hoursSinceClient >= 6 && hoursSinceLastRemarketing >= 3.5) {
            isEligible = true;
          }
          break;

        case 3:
          // 3er mensaje: al día siguiente a las 9am (mínimo 14h tras cliente)
          if (hoursSinceClient >= 14 && hoursSinceLastRemarketing >= 8 && currentHour >= 9) {
            isEligible = true;
          }
          break;

        case 4:
          // 4to mensaje: a las 1pm del mismo día del 3er mensaje (mínimo 3.5h tras etapa 3)
          if (hoursSinceClient >= 18 && hoursSinceLastRemarketing >= 3.5 && currentHour >= 13) {
            isEligible = true;
          }
          break;

        case 5:
          // 5to mensaje: al siguiente día a las 9am (mínimo 36h tras cliente)
          if (hoursSinceClient >= 36 && hoursSinceLastRemarketing >= 16 && currentHour >= 9) {
            isEligible = true;
          }
          break;

        case 6:
          // 6to mensaje: a la 1pm (mismo día del 5to mensaje)
          if (hoursSinceClient >= 40 && hoursSinceLastRemarketing >= 3.5 && currentHour >= 13) {
            isEligible = true;
          }
          break;

        case 7:
          // 7mo mensaje: 7 días después del 6to mensaje
          if (hoursSinceLastRemarketing >= (7 * 24 - 2)) {
            isEligible = true;
          }
          break;
      }

      if (isEligible) {
        try {
          const remarketingText = await generateRemarketingMessageForStage(lead, stageToEvaluate, mensajes);

          // Guardar el mensaje en el historial del chat (OUTBOUND)
          await db.addMessage({
            idConversacion: conv.id,
            direccion: "OUTBOUND",
            tipoRemitente: "IA",
            contenido: remarketingText
          });

          // Enviar por WhatsApp
          await sendWhatsAppMessage(conv.telefono, remarketingText);

          // Registrar nota de auditoría interna en la ficha del lead
          await prisma.notaLead.create({
            data: {
              idLead: lead.id,
              contenido: `[REMARKETING ETAPA ${stageToEvaluate}/7] Enviado por WhatsApp tras ${Math.round(hoursSinceClient)}h del último mensaje del cliente.`,
              nombreAgente: "Asistente IA Sofía"
            }
          });

          results.push({
            leadId: lead.id,
            nombre: lead.nombreCompleto,
            telefono: lead.telefono,
            etapa: stageToEvaluate,
            mensajeEnviado: remarketingText
          });
        } catch (err: any) {
          console.error(`Error enviando remarketing etapa ${stageToEvaluate} a lead ${lead.id}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedLeadsCount: results.length,
      details: results
    });
  } catch (error: any) {
    console.error("Error in remarketing execution:", error);
    return NextResponse.json({ error: error?.message || "Error ejecutando remarketing" }, { status: 500 });
  }
}
