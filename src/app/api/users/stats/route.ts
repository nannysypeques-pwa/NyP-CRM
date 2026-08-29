import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    const sessionUser = sessionCookie ? decryptSession(sessionCookie) : null;
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "TODOS";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let start = new Date();
    let end = new Date();
    let useDateFilter = false;

    // Helper to get local date boundaries
    const getLocalMidnight = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const getLocalEndDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    if (filter === "HOY") {
      start = getLocalMidnight(new Date());
      end = getLocalEndDay(new Date());
      useDateFilter = true;
    } else if (filter === "AYER") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      start = getLocalMidnight(yesterday);
      end = getLocalEndDay(yesterday);
      useDateFilter = true;
    } else if (filter === "ESTA_SEMANA") {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      start = getLocalMidnight(monday);
      
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      end = getLocalEndDay(sunday);
      useDateFilter = true;
    } else if (filter === "LA_SEMANA_PASADA") {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const lastMonday = new Date(now.setDate(diff));
      start = getLocalMidnight(lastMonday);
      
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      end = getLocalEndDay(lastSunday);
      useDateFilter = true;
    } else if (filter === "ESTE_MES") {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      useDateFilter = true;
    } else if (filter === "PERSONALIZADO" && startDateParam && endDateParam) {
      start = getLocalMidnight(new Date(startDateParam));
      end = getLocalEndDay(new Date(endDateParam));
      useDateFilter = true;
    }

    // Get active users
    const users = await prisma.usuario.findMany({
      where: { estado: "ACTIVE" },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        actualizadoEn: true
      }
    });

    const stats = [];

    for (const user of users) {
      // --- LOST LEADS COUNT ---
      // 1. Historical transition notes
      const lostQuery: any = {
        nombreAgente: user.nombre,
        contenido: {
          contains: "a PERDIDO"
        }
      };
      if (useDateFilter) {
        lostQuery.creadoEn = { gte: start, lte: end };
      }
      const lostNotesCount = await prisma.notaLead.count({ where: lostQuery });

      // 2. Current workload: leads currently in PERDIDO assigned to user
      const currentLostQuery: any = {
        idUsuarioAsignado: user.id,
        estado: "PERDIDO",
        deleted: false
      };
      if (useDateFilter) {
        currentLostQuery.creadoEn = { gte: start, lte: end };
      }
      const baseLostCount = await prisma.lead.count({ where: currentLostQuery });
      const lostCount = lostNotesCount + baseLostCount;

      // --- CONTACTED LEADS COUNT ---
      // 1. Historical transition notes
      const contactedQuery: any = {
        nombreAgente: user.nombre,
        contenido: {
          contains: "a CONTACTADO"
        }
      };
      if (useDateFilter) {
        contactedQuery.creadoEn = { gte: start, lte: end };
      }
      const contactedNotesCount = await prisma.notaLead.count({ where: contactedQuery });

      // 2. Current workload: leads currently in CONTACTADO assigned to user
      const currentContactedQuery: any = {
        idUsuarioAsignado: user.id,
        estado: "CONTACTADO",
        deleted: false
      };
      if (useDateFilter) {
        currentContactedQuery.creadoEn = { gte: start, lte: end };
      }
      const baseContactedCount = await prisma.lead.count({ where: currentContactedQuery });
      const contactedCount = contactedNotesCount + baseContactedCount;

      // --- LAST ACTIVITY TIMESTAMP ---
      const lastMessage = await prisma.mensaje.findFirst({
        where: { idRemitente: user.id },
        orderBy: { creadoEn: "desc" },
        select: { creadoEn: true }
      });

      const lastQuote = await prisma.cotizacion.findFirst({
        where: { creadoPor: user.nombre },
        orderBy: { creadoEn: "desc" },
        select: { creadoEn: true }
      });

      const lastNote = await prisma.notaLead.findFirst({
        where: { nombreAgente: user.nombre },
        orderBy: { creadoEn: "desc" },
        select: { creadoEn: true }
      });

      // Filter and compare activity dates
      const dates = [
        user.actualizadoEn, // page click / session check time
        lastMessage?.creadoEn,
        lastQuote?.creadoEn,
        lastNote?.creadoEn
      ].filter(Boolean) as Date[];

      const lastActivity = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      stats.push({
        userId: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        lostCount,
        contactedCount,
        lastActivity: lastActivity ? lastActivity.toISOString() : null
      });
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/users/stats error:", error);
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
}
