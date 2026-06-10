"use client";

import React, { useState } from "react";
import { 
  Key, 
  Database, 
  Phone, 
  HelpCircle, 
  Save, 
  Copy, 
  Check, 
  Info,
  ExternalLink,
  Lock
} from "lucide-react";

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState("sk-mock-key-for-development");
  const [copiedText, setCopiedText] = useState("");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#026692]">Configuración de Integraciones</h1>
        <p className="text-slate-500 text-sm mt-1">Guías paso a paso para configurar tu base de datos, API de WhatsApp e Inteligencia Artificial.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Integration Guides */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* OpenAI Key Guide */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#026692]" />
              1. Cómo generar y configurar tu API Key de OpenAI
            </h2>
            
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>El Asistente de IA comercial requiere una API Key de OpenAI para funcionar. Sigue estos pasos para crearla:</p>
              
              <ol className="list-decimal pl-5 space-y-2.5">
                <li>
                  Ve al sitio oficial de desarrolladores de OpenAI:{" "}
                  <a 
                    href="https://platform.openai.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#026692] hover:underline font-bold inline-flex items-center gap-0.5"
                  >
                    platform.openai.com <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Registra una cuenta o inicia sesión si ya tienes una.</li>
                <li>
                  Ve al menú izquierdo y selecciona <strong>API Keys</strong> (o navega a{" "}
                  <code>platform.openai.com/api-keys</code>).
                </li>
                <li>
                  Haz clic en el botón <strong>+ Create new secret key</strong>.
                </li>
                <li>Asigna un nombre a la llave (ej. <code>NyP CRM Dev</code>) y haz clic en crear.</li>
                <li>
                  <strong className="text-rose-600">¡Copia la llave inmediatamente!</strong> OpenAI no te permitirá verla de nuevo por razones de seguridad.
                </li>
                <li>
                  Pega la llave en tu archivo local <code>.env</code> en la variable <code>OPENAI_API_KEY</code>.
                </li>
              </ol>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-1">
                <span className="font-bold text-amber-700 block">Nota sobre facturación:</span>
                <p className="text-amber-800">
                  OpenAI requiere asociar un método de pago en la sección de <strong>Settings &gt; Billing</strong> y cargar un saldo mínimo (ej. $5 USD) para que tu API Key responda solicitudes. Las llaves sin saldo activo darán un error <code>429 (Quota exceeded)</code>.
                </p>
              </div>
            </div>

            {/* Input field mock */}
            <div className="pt-2 border-t border-[#f0f7fc] space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Prueba tu llave local temporalmente</label>
                <div className="flex space-x-2">
                  <input 
                    type="password" 
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="flex-1 bg-[#f4f8fc] border border-[#d4e6f4] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    placeholder="sk-..."
                  />
                  <button className="bg-[#026692] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1d4359] transition-all flex items-center gap-1.5 shadow-sm">
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Supabase Guide */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              2. Cómo conectar tu base de datos Supabase
            </h2>
            
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>NyP CRM está preparado para sincronizarse con Supabase de forma nativa utilizando Prisma ORM. Sigue estos pasos:</p>
              
              <ol className="list-decimal pl-5 space-y-2.5">
                <li>
                  Crea un proyecto en{" "}
                  <a 
                    href="https://supabase.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5"
                  >
                    supabase.com <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Ve a la configuración del proyecto: <strong>Project Settings &gt; Database</strong>.</li>
                <li>
                  Ubica la sección <strong>Connection string</strong> y selecciona la pestaña <strong>URI</strong>.
                </li>
                <li>
                  Copia la URL del **Transaction Pooler** (puerto 6543) y pégala en tu archivo <code>.env</code> en <code>DATABASE_URL</code>.
                </li>
                <li>
                  Copia la URL del **Direct Connection** (puerto 5432) y pégala en tu archivo <code>.env</code> en <code>DIRECT_URL</code>.
                </li>
                <li>
                  Ejecuta en tu terminal el comando de migración de Prisma para crear todas las tablas automáticamente:
                  <div className="bg-[#f4f8fc] p-3 rounded-xl border border-[#d4e6f4] font-mono mt-1.5 relative flex items-center justify-between">
                    <code>npx prisma migrate dev --name init</code>
                    <button 
                      onClick={() => handleCopy("npx prisma migrate dev --name init", "PRISMA_MIGRATE")}
                      className="text-slate-400 hover:text-[#026692] p-1"
                    >
                      {copiedText === "PRISMA_MIGRATE" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          {/* WhatsApp API Guide */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-500" />
              3. Cómo conectar tu WhatsApp Cloud API (Oficial)
            </h2>
            
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>Para recibir los mensajes de tus clientes directamente en tu bandeja de NyP CRM:</p>
              
              <ol className="list-decimal pl-5 space-y-2.5">
                <li>
                  Regístrate como desarrollador de Meta en{" "}
                  <a 
                    href="https://developers.facebook.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#026692] hover:underline font-bold inline-flex items-center gap-0.5"
                  >
                    developers.facebook.com <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Crea una app del tipo **Business** o **Negocios**.</li>
                <li>Añade el producto **WhatsApp** a tu aplicación.</li>
                <li>
                  Genera una clave temporal de WhatsApp y copia el <strong>Phone Number ID</strong> y el <strong>WhatsApp Business Account ID</strong>.
                </li>
                <li>
                  Configura tu Webhook en Meta indicando:
                  <ul className="list-disc pl-5 mt-1 space-y-1.5">
                    <li>
                      <strong>Callback URL:</strong> La URL de tu servidor desplegado más el endpoint del webhook, ej:{" "}
                      <code>https://tu-dominio.com/api/whatsapp/webhook</code>
                    </li>
                    <li>
                      <strong>Verify Token:</strong> La palabra secreta que definiste en tu archivo <code>.env</code> en <code>WHATSAPP_VERIFY_TOKEN</code>.
                    </li>
                  </ul>
                </li>
                <li>
                  Suscríbete al campo del webhook llamado <code>messages</code> para que Meta notifique al CRM cada vez que un cliente te escriba.
                </li>
              </ol>
            </div>
          </div>

        </div>

        {/* Right Column: Key Summary & Security */}
        <div className="space-y-8">
          
          {/* Security Banner */}
          <div className="bg-gradient-to-br from-[#102b3c] to-[#1e4f6a] text-white p-6 rounded-3xl shadow-sm space-y-4 relative overflow-hidden">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-sky-300">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-sky-200">Seguridad Zero Trust</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Todas las llaves privadas de OpenAI, Supabase y WhatsApp se procesan exclusivamente del lado del servidor. Ningún token sensible se expone en el navegador del usuario para prevenir riesgos de filtración.
              </p>
            </div>
          </div>

          {/* Quick Config check */}
          <div className="bg-white p-6 rounded-3xl border border-[#e2edf6] shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Estado del Sistema</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">Base de datos local:</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  SQLite Activo
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">API de OpenAI:</span>
                <span className="text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full">
                  Modo Simulado
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#f0f7fc]">
                <span className="text-slate-500 font-semibold">Webhook WhatsApp:</span>
                <span className="text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full">
                  Por Conectar
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
