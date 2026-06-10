"use client";

import React from "react";
import { HelpCircle, Mail, Phone, MessageSquare, ExternalLink } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto custom-scrollbar flex flex-col justify-center items-center max-w-lg mx-auto text-center">
      <div className="w-16 h-16 bg-[#026692]/10 rounded-full flex items-center justify-center text-[#026692] mb-4">
        <HelpCircle className="w-8 h-8" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-[#026692]">Centro de Soporte</h1>
        <p className="text-slate-500 text-sm">¿Tienes dudas o problemas técnicos con NyP CRM?</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6 w-full mt-6 text-left">
        <h3 className="font-extrabold text-slate-800 text-base">Contáctanos</h3>
        
        <div className="space-y-4 text-xs text-slate-600">
          <div className="flex items-center space-x-3">
            <Mail className="w-4 h-4 text-[#026692]" />
            <div>
              <span className="font-bold block">Correo de soporte técnico</span>
              <a href="mailto:soporte@nannysypeques.com" className="text-[#026692] hover:underline font-semibold">
                soporte@nannysypeques.com
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Phone className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="font-bold block">WhatsApp de ayuda comercial</span>
              <span className="font-semibold">+52 55 1234 5678</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mt-6 uppercase font-bold tracking-wider">
        NyP CRM v1.0 • Desarrollado para Nannys y Peques
      </p>
    </div>
  );
}
