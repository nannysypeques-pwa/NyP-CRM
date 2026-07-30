"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, UserCheck, ChevronRight, X, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhoneNumber } from "@/lib/format";

interface NotificationItem {
  id: string;
  leadId: string;
  nombreCompleto: string;
  ciudad: string;
  telefono: string;
  tipo: "LISTO_CIERRE" | "ATENCION_HUMANA";
  titulo: string;
  mensaje: string;
  fecha: string;
  link: string;
}

const LOCAL_STORAGE_KEY = "nyp_read_notification_ids";

function loadReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveReadIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export default function HeaderNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "LISTO_CIERRE" | "ATENCION_HUMANA">("ALL");

  // Persistir IDs leídas en localStorage para sobrevivir recargas y polling
  const [readIds, setReadIdsState] = useState<string[]>([]);

  // IDs que conocíamos antes del último polling — para detectar IDs verdaderamente nuevas
  const knownIdsRef = useRef<Set<string>>(new Set());

  // Flag para saber si es la primera llamada al servidor (no detectar nuevas en el primer fetch)
  const isFirstFetchRef = useRef<boolean>(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cargar readIds desde localStorage al montar
  // También inicializar knownIdsRef con los IDs ya leídos para que en el primer fetch no se consideren nuevos
  useEffect(() => {
    const stored = loadReadIds();
    setReadIdsState(stored);
    // Pre-poblar knownIdsRef con los IDs leídos para que el primer fetch no los marque como nuevos
    // (se re-poblará con todos los IDs reales en el primer fetch)
  }, []);

  const setReadIds = (ids: string[]) => {
    setReadIdsState(ids);
    saveReadIds(ids);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data: NotificationItem[] = await res.json();
        const incomingIds = data.map(n => n.id);

        if (isFirstFetchRef.current) {
          // Primera carga: registrar IDs existentes como "ya conocidas" SIN tocar readIds.
          // Esto evita que notificaciones ya leídas vuelvan a aparecer como no leídas.
          knownIdsRef.current = new Set(incomingIds);
          isFirstFetchRef.current = false;
          setNotifications(data);
        } else {
          // Fetches posteriores: detectar solo IDs genuinamente nuevas
          const genuinelyNew = incomingIds.filter(id => !knownIdsRef.current.has(id));

          if (genuinelyNew.length > 0) {
            // Nuevas notificaciones que aparecieron DESPUÉS de la primera carga → marcarlas como no leídas
            setReadIdsState(prev => {
              const updated = prev.filter(id => !genuinelyNew.includes(id));
              saveReadIds(updated);
              return updated;
            });
          }

          // Actualizar el conjunto de IDs conocidas
          knownIdsRef.current = new Set(incomingIds);
          setNotifications(data);
        }
      }
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === "LISTO_CIERRE") return n.tipo === "LISTO_CIERRE";
    if (filter === "ATENCION_HUMANA") return n.tipo === "ATENCION_HUMANA";
    return true;
  });

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
  };

  const handleNotificationClick = (n: NotificationItem) => {
    markAsRead(n.id);
    setIsOpen(false);
    router.push(n.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de la Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-full transition-all relative flex items-center justify-center ${
          isOpen
            ? "bg-[#026692] text-white shadow-md"
            : "text-slate-600 hover:text-[#026692] hover:bg-[#f0f7fc]"
        }`}
        title="Notificaciones comerciales"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600 text-white text-[9px] font-extrabold items-center justify-center ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Dropdown de Notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl border border-[#e2edf6] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header del Popover */}
          <div className="p-4 bg-gradient-to-r from-[#026692] to-[#2587b3] text-white flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <h3 className="font-extrabold text-sm tracking-wide">Notificaciones Comerciales</h3>
            </div>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              {unreadCount} nuevas
            </span>
          </div>

          {/* Filtros rápidos */}
          <div className="flex border-b border-[#e2edf6] bg-[#f8fbfe] p-1.5 gap-1 text-[11px] font-bold text-slate-500">
            <button
              onClick={() => setFilter("ALL")}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filter === "ALL" ? "bg-white text-[#026692] shadow-sm font-extrabold" : "hover:text-slate-700"
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("LISTO_CIERRE")}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filter === "LISTO_CIERRE" ? "bg-emerald-50 text-emerald-700 shadow-sm font-extrabold" : "hover:text-emerald-700"
              }`}
            >
              🟢 Cierre ({notifications.filter(n => n.tipo === "LISTO_CIERRE").length})
            </button>
            <button
              onClick={() => setFilter("ATENCION_HUMANA")}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filter === "ATENCION_HUMANA" ? "bg-indigo-50 text-indigo-700 shadow-sm font-extrabold" : "hover:text-indigo-700"
              }`}
            >
              🟣 Humana ({notifications.filter(n => n.tipo === "ATENCION_HUMANA").length})
            </button>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-[#f0f7fc]">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                Cargando notificaciones...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Sin notificaciones pendientes</p>
                <p className="text-[11px] text-slate-400">
                  Aparecerán alertas cuando los leads lleguen a &quot;Listos para Cierre&quot; o &quot;Atención Humana&quot;.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isRead = readIds.includes(item.id);
                const isListoCierre = item.tipo === "LISTO_CIERRE";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 hover:bg-[#f4f9fd] cursor-pointer transition-all flex items-start space-x-3 group relative ${
                      !isRead ? "bg-sky-50/40" : ""
                    }`}
                  >
                    {/* Icono de Estado */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5 ${
                        isListoCierre ? "bg-emerald-500" : "bg-indigo-500"
                      }`}
                    >
                      {isListoCierre ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <UserCheck className="w-5 h-5" />
                      )}
                    </div>

                    {/* Indicador de no leído */}
                    {!isRead && (
                      <span className="absolute top-4 right-10 w-2 h-2 bg-emerald-500 rounded-full"></span>
                    )}

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wide ${
                            isListoCierre
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {isListoCierre ? "Listo para Cierre" : "Atención Humana"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(item.fecha).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className={`text-xs font-bold mt-1 truncate group-hover:text-[#026692] transition-colors ${isRead ? "text-slate-500" : "text-slate-800"}`}>
                        {item.nombreCompleto}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mt-0.5 font-medium">
                        {item.mensaje}
                      </p>

                      <div className="flex items-center space-x-2 mt-1.5 text-[10px] font-semibold text-slate-400">
                        <span>📍 {item.ciudad}</span>
                        {item.telefono && <span>• 📞 {formatPhoneNumber(item.telefono)}</span>}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#026692] group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center" />
                  </div>
                );
              })
            )}
          </div>

          {/* Footer del Popover */}
          <div className="p-2.5 bg-[#f8fbfe] border-t border-[#e2edf6] flex justify-between items-center text-[11px]">
            <Link
              href="/embudo"
              onClick={() => setIsOpen(false)}
              className="text-[#026692] font-extrabold hover:underline px-2"
            >
              Ir al Embudo Kanban →
            </Link>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 hover:bg-slate-100 rounded-lg transition-all"
              >
                Marcar leídas
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
