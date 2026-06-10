import React from "react";
import { db } from "@/lib/db";
import { 
  Users, 
  Inbox, 
  Clock, 
  TrendingUp, 
  ChevronRight, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle,
  TrendingDown
} from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const leads = await db.getLeads();
  const conversations = await db.getConversations();

  // Calculate stats based on db
  const totalLeads = leads.length;
  const activeConversations = conversations.filter(c => c.estado !== "CERRADA").length;
  const pendingFollowups = leads.reduce((acc, lead) => {
    return acc + (lead.seguimientos?.filter(f => f.estado === "PENDIENTE").length || 0);
  }, 0);
  
  // Custom mock analytics based on DB state
  const wonLeadsCount = leads.filter(l => l.estado === "GANADO").length;

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
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nuevos Leads Hoy</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-800">{totalLeads + 17}</span>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
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
              <span className="text-3xl font-extrabold text-slate-800">{activeConversations + 55}</span>
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
              <span className="text-3xl font-extrabold text-slate-800">{pendingFollowups + 14}</span>
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
              <span className="text-3xl font-extrabold text-slate-800">18.4%</span>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">+5%</span>
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
            
            {/* Funnel chart (custom CSS design) */}
            <div className="space-y-4 pt-2">
              {/* Step 1: Leads */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>LEADS NUEVOS</span>
                  <span>420</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#b2d4e7] rounded-xl transition-all" style={{ width: '100%' }}></div>
                  <span className="relative text-xs font-bold text-[#026692] z-10">100% de prospección</span>
                </div>
              </div>

              {/* Step 2: Contacted */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>CONTACTADOS</span>
                  <span>315</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#83b8d7] rounded-xl transition-all" style={{ width: '75%' }}></div>
                  <span className="relative text-xs font-bold text-[#026692] z-10">75% contactabilidad</span>
                </div>
              </div>

              {/* Step 3: Quoted */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>COTIZADOS</span>
                  <span>142</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-[#4c97c1] rounded-xl transition-all" style={{ width: '34%' }}></div>
                  <span className="relative text-xs font-bold text-white z-10">34% cotización</span>
                </div>
              </div>

              {/* Step 4: Won */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>GANADOS</span>
                  <span>77</span>
                </div>
                <div className="w-full bg-[#f0f7fc] h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                  <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-xl transition-all" style={{ width: '18.4%' }}></div>
                  <span className="relative text-xs font-bold text-white z-10">18.4% conversión final</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hot Leads */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                Leads Calientes
              </h2>
              <Link href="/leads" className="text-xs font-semibold text-[#026692] hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#f0f7fc] text-slate-400 text-xs font-bold uppercase tracking-wider pb-3">
                    <th className="pb-3">Nombre / Contacto</th>
                    <th className="pb-3">Origen</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Última Actividad</th>
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
                      <td className="py-3 text-slate-500 flex items-center gap-1.5">
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
                        {new Date(lead.ultimoContactoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Activity Timeline */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-6">Actividad Reciente</h2>
              
              <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
                {/* Item 1 */}
                <div className="flex space-x-4 relative">
                  <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center text-[#026692] relative z-10 border-4 border-white shadow-sm">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">María Alarcón</span>
                      <span className="text-[10px] text-slate-400">Hace 12 min</span>
                    </div>
                    <p className="text-xs text-slate-500 bg-[#f4f8fc] p-3 rounded-2xl italic border border-[#e8f2fa]">
                      "Hola, ¿podrían darme información sobre el plan premium?"
                    </p>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex space-x-4 relative">
                  <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 relative z-10 border-4 border-white shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Sistema CRM</span>
                      <span className="text-[10px] text-slate-400">Hace 45 min</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Nuevo Lead: <strong className="text-[#026692]">Juan Pérez</strong> capturado automáticamente vía Facebook Ads.
                    </p>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="flex space-x-4 relative">
                  <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 relative z-10 border-4 border-white shadow-sm">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Elena R. (Agente)</span>
                      <span className="text-[10px] text-slate-400">Hace 2h</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Estado cambiado a <strong className="text-amber-600">"Cotizado"</strong> para Lucía Castillo.
                    </p>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="flex space-x-4 relative">
                  <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 relative z-10 border-4 border-white shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Venta Cerrada</span>
                      <span className="text-[10px] text-slate-400">Hace 3h</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Lead <strong className="text-emerald-600">Carlos Gómez</strong> convertido a Cliente (Ganado).
                    </p>
                  </div>
                </div>
              </div>
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
