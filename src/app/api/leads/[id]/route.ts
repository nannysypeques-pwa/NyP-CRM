import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSession } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lead = await db.getLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const sessionCookie = req.cookies.get("session")?.value;
    const sessionUser = sessionCookie ? decryptSession(sessionCookie) : null;
    const agentName = sessionUser ? sessionUser.nombre : "Sistema / AI";

    // Get current lead before update
    const currentLead = await db.getLeadById(params.id);
    const updatedLead = await db.updateLead(params.id, body);

    // If status changed, log a note with the user name
    if (body.estado && currentLead && currentLead.estado !== body.estado) {
      await db.addNota(
        params.id,
        `[CAMBIO_ESTADO] Ficha movida de ${currentLead.estado} a ${body.estado} por ${agentName}.`,
        agentName
      );
    }

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("PATCH /api/leads/[id] error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.deleteLead(params.id);
    return NextResponse.json({ message: "Lead deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
