"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, 
  User, 
  MapPin, 
  DollarSign, 
  Check, 
  Eye, 
  HelpCircle,
  Clock
} from "lucide-react";

interface QuoteItem {
  id: string;
  idLead: string;
  leadName: string;
  tipoServicio: string;
  ciudad: string;
  total: number;
  estado: string;
  validoHasta: string;
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch("/api/leads");
        if (res.ok) {
          const leads = await res.json();
          const allQuotes: QuoteItem[] = [];
          
          leads.forEach((l: any) => {
            if (l.cotizaciones) {
              l.cotizaciones.forEach((q: any) => {
                allQuotes.push({
                  ...q,
                  leadId: l.id,
                  leadName: l.nombreCompleto
                });
              });
            }
          });
          
          setQuotes(allQuotes);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto custom-scrollbar">
      <div>
        <h1 className="text-3xl font-extrabold text-[#026692]">Cotizaciones Generadas</h1>
        <p className="text-slate-500 text-sm mt-1">Presupuestos comerciales creados para prospectos activos.</p>
      </div>

      <div className="bg-white rounded-3xl border border-[#e2edf6] shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-12 text-center text-slate-400 animate-pulse">Cargando cotizaciones...</p>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-bold">No hay cotizaciones registradas</p>
            <p className="text-xs">Ve a la ficha comercial de un lead o a la bandeja de entrada para cotizar un servicio.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#f0f7fc] bg-[#f8fbfe] text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Servicio</th>
                  <th className="px-6 py-4">Prospecto</th>
                  <th className="px-6 py-4">Ciudad</th>
                  <th className="px-6 py-4">Vence</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f7fc] text-sm">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-[#f8fbfe] transition-all">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {quote.tipoServicio}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/leads/${quote.idLead}`} className="text-[#026692] font-semibold hover:underline flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> {quote.leadName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {quote.ciudad}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(quote.validoHasta).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-slate-800">
                      ${quote.total.toLocaleString()} MXN
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-600">
                        {quote.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/leads/${quote.idLead}`}
                        className="text-slate-500 hover:text-[#026692] flex items-center gap-1 font-bold text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver Ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
