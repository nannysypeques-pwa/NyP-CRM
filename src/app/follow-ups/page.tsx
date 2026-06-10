"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle, 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  Check, 
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface Seguimiento {
  id: string;
  idLead: string;
  leadName: string;
  titulo: string;
  descripcion?: string;
  fechaVencimiento: string;
  estado: string;
}

export default function FollowUpsPage() {
  const [tasks, setTasks] = useState<Seguimiento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const leads = await res.json();
        // Extract all follow-ups
        const allTasks: Seguimiento[] = [];
        leads.forEach((l: any) => {
          if (l.seguimientos) {
            l.seguimientos.forEach((f: any) => {
              allTasks.push({
                ...f,
                leadId: l.id,
                leadName: l.nombreCompleto
              });
            });
          }
        });
        
        // Sort by date ascending
        allTasks.sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());
        setTasks(allTasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCompleteTask = async (leadId: string, taskId: string) => {
    try {
      // Mock local completion update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, estado: "COMPLETADO" } : t));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto custom-scrollbar">
      <div>
        <h1 className="text-3xl font-extrabold text-[#026692]">Seguimientos Comerciales</h1>
        <p className="text-slate-500 text-sm mt-1">Llamadas, visitas guiadas y tareas programadas por tu equipo de ventas.</p>
      </div>

      <div className="bg-white rounded-3xl border border-[#e2edf6] shadow-sm overflow-hidden p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Tareas Pendientes</h2>
        
        {loading ? (
          <p className="text-xs text-slate-400 animate-pulse text-center py-8">Cargando tareas...</p>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-bold">No tienes seguimientos pendientes</p>
            <p className="text-xs">Usa la ficha comercial de un prospecto para programar una llamada o cita.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                  task.estado === "COMPLETADO" 
                    ? "bg-slate-50 border-slate-100 opacity-60" 
                    : "bg-white border-[#e2edf6] hover:shadow-md"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-slate-800 text-sm">{task.titulo}</h4>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                      task.estado === "COMPLETADO" ? "bg-slate-100 text-slate-400" : "bg-rose-50 text-rose-500"
                    }`}>
                      {task.estado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{task.descripcion || "Sin descripción adicional"}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Prospecto:{" "}
                      <Link href={`/leads/${task.idLead}`} className="text-[#026692] hover:underline font-bold">
                        {task.leadName}
                      </Link>
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" /> Vence:{" "}
                      {new Date(task.fechaVencimiento).toLocaleDateString()} a las{" "}
                      {new Date(task.fechaVencimiento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div>
                  {task.estado !== "COMPLETADO" && (
                    <button 
                      onClick={() => handleCompleteTask(task.idLead, task.id)}
                      className="bg-[#e1eff8] hover:bg-emerald-500 text-[#026692] hover:text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm border border-[#c3dfef] hover:border-transparent"
                    >
                      <Check className="w-4 h-4" /> Completar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
