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
    // 0. LIMPIEZA AUTOMÁTICA DE LEADS INACTIVOS (48 HORAS)
    const activeStatuses = ["NUEVO", "CONTACTADO", "COTIZADO"];
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const inactiveLeads = await prisma.lead.findMany({
      where: {
        estado: { in: activeStatuses },
        ultimoContactoEn: { lt: fortyEightHoursAgo },
        deleted: false
      }
    });

    console.log(`[CRON LIMPIEZA] Buscando leads inactivos. Encontrados: ${inactiveLeads.length}`);
    for (const lead of inactiveLeads) {
      const prevStatus = lead.estado;
      console.log(`[CRON LIMPIEZA] Lead ${lead.id} (${lead.nombreCompleto}) inactivo desde ${lead.ultimoContactoEn.toISOString()}. Marcando como PERDIDO.`);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          estado: "PERDIDO",
          motivoPerdida: `[AUTO_PERDIDO_INACTIVIDAD] ${prevStatus}`
        }
      });

      await prisma.notaLead.create({
        data: {
          idLead: lead.id,
          contenido: `[LIMPIEZA AUTOMÁTICA] Ficha marcada como PERDIDA debido a 48 horas de inactividad (último contacto: ${lead.ultimoContactoEn.toISOString()}). Estado previo: ${prevStatus}.`,
          nombreAgente: "Asistente IA Sofía"
        }
      });
    }

    // 1. Obtener todos los leads con estado "COTIZADO" que tienen conversación con IA activa
    const cotizadoLeads = await prisma.lead.findMany({
      where: {
        estado: "COTIZADO"
      },
      include: {
        hijos: true,
        cotizaciones: true,
        notas: true,
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

      // Filtrar todas las notas de auditoría interna de remarketing enviadas a este lead
      const totalRemarketingMsgsSent = lead.notas.filter(n => 
        n.nombreAgente === "Asistente IA Sofía" && 
        n.contenido.includes("[REMARKETING")
      );

      // La etapa a evaluar avanza progresivamente (1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7) sin reiniciar jamás aunque el cliente responda
      const stageToEvaluate = totalRemarketingMsgsSent.length + 1;
      if (stageToEvaluate > 7) {
        // Ya se enviaron las 7 etapas únicas de remarketing a este prospecto
        continue;
      }

      const hoursSinceClient = (now.getTime() - tClienteRef.getTime()) / (1000 * 60 * 60);

      // Si han pasado 24 horas o más desde el último mensaje del cliente, ya no podemos enviarle mensajes por el bloqueo de sesión de WhatsApp
      if (hoursSinceClient >= 24) continue;

      const lastRemarketingMsg = totalRemarketingMsgsSent[0];
      const hoursSinceLastRemarketing = lastRemarketingMsg 
        ? (now.getTime() - new Date(lastRemarketingMsg.creadoEn).getTime()) / (1000 * 60 * 60)
        : hoursSinceClient;

      let isEligible = false;

      switch (stageToEvaluate) {
        case 1:
          // fase 1 - después de 1 hora del último mensaje
          if (hoursSinceClient >= 1) {
            isEligible = true;
          }
          break;

        case 2:
          // fase 2 - después de 3 horas del último mensaje
          if (hoursSinceClient >= 3 && hoursSinceLastRemarketing >= 1.5) {
            isEligible = true;
          }
          break;

        case 3:
          // fase 3 - después de 8 horas del último mensaje
          if (hoursSinceClient >= 8 && hoursSinceLastRemarketing >= 4.5) {
            isEligible = true;
          }
          break;

        case 4:
          // fase 4 - después de 12 horas del último mensaje
          if (hoursSinceClient >= 12 && hoursSinceLastRemarketing >= 3.5) {
            isEligible = true;
          }
          break;

        case 5:
          // fase 5 - después de 16 horas del último mensaje
          if (hoursSinceClient >= 16 && hoursSinceLastRemarketing >= 3.5) {
            isEligible = true;
          }
          break;

        case 6:
          // fase 6 - después de 20 horas del último mensaje
          if (hoursSinceClient >= 20 && hoursSinceLastRemarketing >= 3.5) {
            isEligible = true;
          }
          break;

        case 7:
          // fase 7 - después de 23 horas del último mensaje
          if (hoursSinceClient >= 23 && hoursSinceLastRemarketing >= 2.5) {
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
