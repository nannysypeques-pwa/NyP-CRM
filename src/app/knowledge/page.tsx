"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  Search, 
  Plus, 
  FileText, 
  ExternalLink,
  Sparkles,
  Database
} from "lucide-react";

interface Doc {
  id: string;
  title: string;
  category: string;
  content: string;
  status: string;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<Doc[]>([
    {
      id: "kd-dif",
      title: "Diferencia entre Nanny y Miss Nanny",
      category: "Servicios",
      content: "Las Nannys se enfocan en cuidado básico y asistencia diaria, mientras que las Miss Nannys tienen carrera en educación o psicología infantil y se enfocan en estimulación oportuna y apoyo académico.",
      status: "ACTIVO"
    },
    {
      id: "kd-canc",
      title: "Políticas de Cancelación de Servicios",
      category: "Políticas",
      content: "Los servicios eventuales cancelados con menos de 24 horas de anticipación generan un cargo del 50% de la tarifa contratada. Los servicios mensuales fijos requieren un preaviso de 15 días.",
      status: "ACTIVO"
    },
    {
      id: "kd-emerg",
      title: "Protocolos de Emergencia Médica",
      category: "Emergencias",
      content: "Todas nuestras nannys cuentan con certificación activa en Primeros Auxilios Pediátricos. En caso de incidente, el protocolo inmediato es: 1) Brindar soporte inicial, 2) Contactar al pediatra de cabecera del cliente, 3) Avisar a los padres y 4) Coordinar traslado a centro médico si es necesario.",
      status: "ACTIVO"
    }
  ]);

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto custom-scrollbar">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#026692]">Base de Conocimientos (AI)</h1>
          <p className="text-slate-500 text-sm mt-1">Sube documentos para entrenar al Asistente de IA comercial sobre tus servicios.</p>
        </div>
        <button className="flex items-center space-x-2 bg-[#026692] text-white hover:bg-[#1d4359] px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">
          <Plus className="w-4 h-4" />
          <span>Añadir Documento</span>
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: documents list */}
        <div className="lg:col-span-2 space-y-6">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-3 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-sky-50 text-[#026692]">
                    {doc.category}
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-base">{doc.title}</h3>
                </div>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                  {doc.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium bg-[#f8fbfe] p-4 rounded-2xl border border-[#f0f7fc]">
                "{doc.content}"
              </p>
            </div>
          ))}
        </div>

        {/* Right column: training summary */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#026692] to-[#388dbb] text-white p-6 rounded-3xl shadow-md space-y-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-sky-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-sky-100">Entrenamiento Contextual</h3>
              <p className="text-xs leading-relaxed text-sky-50">
                El bot de WhatsApp utiliza estos documentos para responder dudas específicas del cliente sin inventar información, garantizando una atención segura y alineada a las políticas de Nannys y Peques.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Resumen de Indexación</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">Documentos Cargados:</span>
                <span className="font-bold text-slate-700">{docs.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">Palabras Indexadas:</span>
                <span className="font-bold text-slate-700">350 palabras</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">Último re-entrenamiento:</span>
                <span className="font-bold text-slate-400">Hace 3 horas</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
