import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import SidebarLink from "@/components/SidebarLink";
import ScrollReset from "@/components/ScrollReset";
import { 
  LayoutDashboard, 
  Users, 
  Inbox, 
  CalendarCheck, 
  FileText, 
  BookOpen, 
  Settings, 
  HelpCircle,
  Search,
  Bell,
  History,
  HeartHandshake,
  Kanban
} from "lucide-react";


export const metadata: Metadata = {
  title: "NyP CRM - Premium Care CRM",
  description: "Sistema Integral Comercial y Operativo de Nannys y Peques",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="flex h-screen bg-[#f3f8fc] text-slate-800 overflow-hidden font-sans">
        <ScrollReset />
        {/* Sidebar */}
        <aside className="w-64 bg-[#e8f4fd] border-r border-[#d4e6f4] flex flex-col justify-between flex-shrink-0">
          <div>
            {/* Logo area */}
            <div className="p-6 flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#026692] rounded-xl flex items-center justify-center text-white shadow-md">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-extrabold text-[#026692] text-xl tracking-tight leading-none">NyP CRM</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#5caad0] block mt-0.5">Premium Care CRM</span>
              </div>
            </div>

            {/* Main Menu Links */}
            <nav className="px-4 space-y-1 mt-4">
              <SidebarLink href="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
              <SidebarLink href="/embudo" icon={<Kanban className="w-5 h-5" />} label="Embudo" />
              <SidebarLink href="/leads" icon={<Users className="w-5 h-5" />} label="Leads" />
              <SidebarLink href="/inbox" icon={<Inbox className="w-5 h-5" />} label="Inbox" />
              <SidebarLink href="/follow-ups" icon={<CalendarCheck className="w-5 h-5" />} label="Seguimientos" />
              <SidebarLink href="/quotes" icon={<FileText className="w-5 h-5" />} label="Cotizaciones" />
              <SidebarLink href="/knowledge" icon={<BookOpen className="w-5 h-5" />} label="Base de Conocimiento" />
            </nav>
          </div>

          {/* Bottom Settings / Profile */}
          <div className="p-4 border-t border-[#d4e6f4] space-y-4">
            <nav className="space-y-1">
              <SidebarLink href="/settings" icon={<Settings className="w-5 h-5" />} label="Configuración" />
              <SidebarLink href="/support" icon={<HelpCircle className="w-5 h-5" />} label="Soporte" />
            </nav>

            {/* Profile widget */}
            <div className="flex items-center space-x-3 p-2 bg-white/50 rounded-xl border border-white/20">
              <img 
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" 
                alt="Laura Méndez" 
                className="w-10 h-10 rounded-full object-cover border border-[#b2d4e7]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">Laura Méndez</p>
                <p className="text-[10px] text-[#5caad0] font-bold uppercase truncate">Agente Senior</p>
              </div>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-[#e8f4fd]" title="En línea"></span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-[#e2edf6] flex items-center justify-between px-8 flex-shrink-0">
            {/* Global Search Bar */}
            <div className="relative w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                placeholder="Buscar prospectos o chats..."
                className="w-full bg-[#f0f7fc] border-0 rounded-full pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] transition-all"
              />
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center space-x-5">
              <button className="p-2 text-slate-500 hover:text-[#026692] hover:bg-[#f0f7fc] rounded-full transition-all relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white"></span>
              </button>
              <button className="p-2 text-slate-500 hover:text-[#026692] hover:bg-[#f0f7fc] rounded-full transition-all">
                <History className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-slate-200"></div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-700">Laura Méndez</p>
                  <p className="text-[10px] text-slate-400">Agente de Ventas</p>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" 
                  alt="Laura Méndez" 
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
              </div>
            </div>
          </header>

          {/* Children View */}
          <main className="flex-1 overflow-hidden relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
