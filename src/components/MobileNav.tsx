"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Kanban, 
  Users, 
  Inbox, 
  CalendarCheck, 
  FileText, 
  BookOpen, 
  HeartHandshake,
  Building,
  MoreHorizontal
} from "lucide-react";
import SidebarLink from "./SidebarLink";
import CitySelector from "./CitySelector";
import LogoutButton from "./LogoutButton";

interface MobileNavProps {
  user: {
    nombre: string;
    rol: string;
    ciudad?: string | null;
  };
  activeCity: string;
}

export default function MobileNav({ user, activeCity }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on path change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const hasAssignedCity = Boolean(
    user.ciudad && 
    user.ciudad.trim() !== "" && 
    user.ciudad.toUpperCase() !== "TODAS" && 
    user.ciudad.toUpperCase() !== "TODAS LAS CIUDADES"
  );
  
  const userInitials = user.nombre
    ? user.nombre.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const isTabActive = (href: string) => {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Top App Bar (Only visible on screens < lg) */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#e2edf6] flex-shrink-0 z-30 sticky top-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 text-[#026692] hover:bg-[#e8f4fd] rounded-xl transition-all active:scale-95"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#026692] rounded-lg flex items-center justify-center text-white shadow-sm">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-[#026692] text-base tracking-tight leading-none block">NyP CRM</span>
              <span className="text-[8px] uppercase font-extrabold tracking-wider text-[#5caad0] block">Mobile PWA</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          {hasAssignedCity ? (
            <span className="text-[10px] font-extrabold text-[#026692] bg-sky-50 px-2.5 py-1 rounded-full uppercase border border-[#d4e6f4]">
              {user.ciudad}
            </span>
          ) : null}
          
          <div className="w-7 h-7 rounded-full bg-[#026692] text-white flex items-center justify-center font-extrabold text-[10px] uppercase shadow-sm">
            {userInitials}
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Sidebar Content */}
          <div className="relative w-4/5 max-w-xs bg-[#e8f4fd] border-r border-[#d4e6f4] h-full flex flex-col justify-between shadow-2xl z-10 overflow-hidden animate-slide-right">
            {/* Header with Close button */}
            <div className="p-5 flex items-center justify-between border-b border-[#d4e6f4] bg-[#e8f4fd]">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-[#026692] rounded-xl flex items-center justify-center text-white shadow-md">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-[#026692] text-lg tracking-tight leading-none">NyP CRM</h2>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-[#5caad0] block mt-0.5">Menú Principal</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {/* City selector inside mobile drawer */}
              <div>
                {!hasAssignedCity ? (
                  <CitySelector activeCity={activeCity} />
                ) : (
                  <div className="flex items-center space-x-2.5 bg-white/80 px-3.5 py-2.5 rounded-xl border border-[#d4e6f4] shadow-sm">
                    <Building className="w-4 h-4 text-[#026692] flex-shrink-0" />
                    <div>
                      <span className="text-[9px] font-bold text-[#5caad0] uppercase tracking-wider block leading-none">Ciudad Asignada</span>
                      <span className="text-xs font-extrabold text-[#026692] uppercase block mt-1">{user.ciudad}</span>
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-[#d4e6f4]" />

              <nav className="space-y-1">
                <SidebarLink href="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
                <SidebarLink href="/embudo" icon={<Kanban className="w-5 h-5" />} label="Embudo" />
                <SidebarLink href="/leads" icon={<Users className="w-5 h-5" />} label="Leads" />
                <SidebarLink href="/inbox" icon={<Inbox className="w-5 h-5" />} label="Inbox" />
                <SidebarLink href="/follow-ups" icon={<CalendarCheck className="w-5 h-5" />} label="Seguimientos" />
                <SidebarLink href="/quotes" icon={<FileText className="w-5 h-5" />} label="Cotizaciones" />
                {user.rol === "GERENTE" && (
                  <>
                    <SidebarLink href="/knowledge" icon={<BookOpen className="w-5 h-5" />} label="Base de Conocimiento" />
                    <SidebarLink href="/users" icon={<Users className="w-5 h-5" />} label="Usuarios" />
                  </>
                )}
              </nav>
            </div>

            {/* Bottom Profile Footer */}
            <div className="p-4 border-t border-[#d4e6f4] bg-[#e8f4fd]">
              <div className="flex items-center space-x-3 p-2 bg-white/70 rounded-xl border border-white/40 shadow-sm">
                <div className="w-9 h-9 rounded-full bg-[#026692] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase shadow-sm">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.nombre}</p>
                  <p className="text-[9px] text-[#5caad0] font-bold uppercase truncate">{user.rol}</p>
                </div>
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Dock (Native App Bar for Mobile Phones) */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#e2edf6] z-40 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Link 
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition-all ${
            isTabActive("/") ? "text-[#026692] bg-sky-50" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Inicio</span>
        </Link>

        <Link 
          href="/embudo"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition-all ${
            isTabActive("/embudo") ? "text-[#026692] bg-sky-50" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Kanban className="w-5 h-5 mb-0.5" />
          <span>Embudo</span>
        </Link>

        <Link 
          href="/inbox"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition-all ${
            isTabActive("/inbox") ? "text-[#026692] bg-sky-50" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Inbox className="w-5 h-5 mb-0.5" />
          <span>Inbox</span>
        </Link>

        <Link 
          href="/leads"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition-all ${
            isTabActive("/leads") ? "text-[#026692] bg-sky-50" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Leads</span>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-extrabold text-slate-400 hover:text-[#026692] transition-all"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>Menú</span>
        </button>
      </nav>
    </>
  );
}
