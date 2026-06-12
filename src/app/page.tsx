import React from "react";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { 
  Users, 
  Inbox, 
  Clock, 
  TrendingUp, 
  ChevronRight, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle,
  FileText
} from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface ActivityItem {
  id: string;
  type: 'MESSAGE' | 'LEAD' | 'QUOTE';
  title: string;
  description: string;
  timestamp: Date;
}

export default async function Dashboard() {
  // Cargar todos los datos en paralelo para reducir drásticamente la latencia de red con Supabase
  const [leads, conversations, recentLeads, recentMessages, recentQuotes] = await Promise.all([
    db.getLeads(),
    db.getConversations(),
    prisma.lead.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 5
    }),
    prisma.mensaje.findMany({
      include: {
        conversacion: {
          include: {
            lead: true
          }
        }
      },
      orderBy: { creadoEn: 'desc' },
      take: 5
    }),
    prisma.cotizacion.findMany({
      include: {
        lead: true
      },
      orderBy: { creadoEn: 'desc' },
      take: 5
    })
  ]);

  // Calculate stats based on db
  const totalLeads = leads.length;
  const activeConversations = conversations.filter(c => c.estado !== "CERRADA").length;
  const pendingFollowups = leads.reduce((acc, lead) => {
    return acc + (lead.seguimientos?.filter(f => f.estado === "PENDIENTE").length || 0);
  }, 0);
  
  const wonLeadsCount = leads.filter(l => l.estado === "GANADO").length;
  const contactedLeadsCount = leads.filter(l => l.estado === "CONTACTADO").length;
  const quotedLeadsCount = leads.filter(l => l.estado === "COTIZADO").length;
  const newLeadsCount = leads.filter(l => l.estado === "NUEVO").length;

  const conversionRate = totalLeads > 0 ? ((wonLeadsCount / totalLeads) * 100).toFixed(1) + '%' : '0.0%';

  const contactedPercent = totalLeads > 0 ? Math.round((contactedLeadsCount / totalLeads) * 100) : 0;
  const quotedPercent = totalLeads > 0 ? Math.round((quotedLeadsCount / totalLeads) * 100) : 0;
  const wonPercent = totalLeads > 0 ? Math.round((wonLeadsCount / totalLeads) * 100) : 0;

  const activities: ActivityItem[] = [];

  recentLeads.forEach(l => {
    activities.push({
      id: `lead-${l.id}`,
      type: 'LEAD',
      title: l.nombreCompleto,
      description: `Nuevo Lead capturado vía ${l.origen}.`,
      timestamp: l.creadoEn
    });
  });

  recentMessages.forEach(m => {
    if (m.direccion === 'INBOUND') {
      const senderName = m.conversacion.lead?.nombreCompleto || m.conversacion.telefono;
      activities.push({
        id: `msg-${m.id}`,
        type: 'MESSAGE',
        title: senderName,
        description: `Envió un WhatsApp: "${m.contenido}"`,
        timestamp: m.creadoEn
      });
    }
  });

  recentQuotes.forEach(q => {
    activities.push({
      id: `quote-${q.id}`,
      type: 'QUOTE',
      title: q.lead.nombreCompleto,
      description: `Cotización de ${q.tipoServicio} generada por $${q.total} MXN.`,
      timestamp: q.creadoEn
    });
  });

  // Sort and take top 5
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const displayActivities = activities.slice(0, 5);

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#026692]">Panel de Control</h1>
        <p className="text-slate-500 text-sm mt-1">Bienvenido a NyP CRM. Aquí tienes el rendimiento comercial de hoy.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl border border-[#e2edf6] shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Leads</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-800">{totalLeads}</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-[#026692]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl border border-[#e2edf6] shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Conversaciones Abiertas</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-800">{activeConversations}</span>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Activas</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Inbox className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl border border-[#e2edf6] shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Seguimientos Pendientes</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-800">{pendingFollowups}</span>
              <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">Urgente</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl border border-[#e2edf6] shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Conversión Mensual</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-800">{conversionRate}</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Funnel & Hot Leads on Left, Activity Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Funnel + Hot Leads */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Conversion Funnel */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Embudo de Conversión</h2>
              <span className="text-xs font-semibold text-[#026692] bg-[#e1eff8] px-3 py-1 rounded-full">Progreso mensual</span>
            </div>
            
            {/* Funnel chart */}
            <div className="space-y-4 pt-2">
              {/* Step 1: Leads */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>LEADS NUEVOS</span>
                  <span>{newLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#b2d4e7] rounded-xl transition-all" style={{ width: totalLeads > 0 ? '100%' : '0%' }}></div>
                  <span className="relative text-xs font-bold text-[#026692] z-10">{totalLeads > 0 ? '100% de prospección' : 'Sin leads'}</span>
                </div>
              </div>

              {/* Step 2: Contacted */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>CONTACTADOS</span>
                  <span>{contactedLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#83b8d7] rounded-xl transition-all" style={{ width: `${contactedPercent}%` }}></div>
                  <span className="relative text-xs font-bold text-[#026692] z-10">{contactedPercent}% contactabilidad</span>
                </div>
              </div>

              {/* Step 3: Quoted */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>COTIZADOS</span>
                  <span>{quotedLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#4c97c1] rounded-xl transition-all" style={{ width: `${quotedPercent}%` }}></div>
                  <span className="relative text-xs font-bold text-slate-700 z-10">{quotedPercent}% cotización</span>
                </div>
              </div>

              {/* Step 4: Won */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>GANADOS</span>
                  <span>{wonLeadsCount}</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-xl transition-all" style={{ width: `${wonPercent}%` }}></div>
                  <span className="relative text-xs font-bold text-slate-700 z-10">{wonPercent}% conversión final</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hot Leads */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                Leads Recientes
              </h2>
              <Link href="/leads" className="text-xs font-semibold text-[#026692] hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              {leads.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay prospectos en la base de datos.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#f0f7fc] text-slate-400 text-xs font-bold uppercase tracking-wider pb-3">
                      <th className="pb-3">Nombre / Contacto</th>
                      <th className="pb-3">Origen</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Creado El</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f7fc] text-sm">
                    {leads.slice(0, 3).map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#f8fbfe] transition-all">
                        <td className="py-3 font-semibold text-slate-800">
                          <Link href={`/leads/${lead.id}`} className="hover:text-[#026692] block">
                            {lead.nombreCompleto}
                            <span className="text-xs text-slate-400 font-normal block">{lead.telefono}</span>
                          </Link>
                        </td>
                        <td className="py-3 text-slate-500">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e1eff8] text-[#026692]">
                            {lead.origen}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            lead.estado === "NUEVO" ? "bg-sky-50 text-[#026692]" :
                            lead.estado === "CONTACTADO" ? "bg-amber-50 text-amber-600" :
                            lead.estado === "COTIZADO" ? "bg-blue-50 text-blue-600" :
                            lead.estado === "GANADO" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          }`}>
                            {lead.estado}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 text-xs">
                          {new Date(lead.creadoEn).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Activity Timeline */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-6">Actividad Reciente</h2>
              
              {displayActivities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">No hay actividad reciente registrada en el sistema.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
                  {displayActivities.map((act) => (
                    <div key={act.id} className="flex space-x-4 relative">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center relative z-10 border-4 border-white shadow-sm ${
                        act.type === 'MESSAGE' ? 'bg-sky-100 text-[#026692]' :
                        act.type === 'QUOTE' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {act.type === 'MESSAGE' ? <MessageSquare className="w-3 h-3" /> :
                         act.type === 'QUOTE' ? <FileText className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">{act.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs text-slate-600 ${act.type === 'MESSAGE' ? 'bg-[#f4f8fc] p-3 rounded-2xl italic border border-[#e8f2fa]' : ''}`}>
                          {act.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Call to Action card */}
            <div className="mt-8 bg-gradient-to-r from-[#026692] to-[#388dbb] text-white p-5 rounded-2xl relative overflow-hidden shadow-md">
              <div className="relative z-10 space-y-2">
                <h3 className="font-bold text-sm">¿Nuevos mensajes en WhatsApp?</h3>
                <p className="text-xs text-sky-100">Accede a la bandeja multiagente interactiva para responder y activar el bot de IA.</p>
                <Link href="/inbox" className="inline-block bg-white text-[#026692] text-xs font-extrabold px-4 py-2 rounded-xl hover:bg-sky-50 transition-all shadow-sm">
                  Ir al Inbox
                </Link>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                <Inbox className="w-32 h-32" />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
