import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import SidebarLink from "@/components/SidebarLink";
import ScrollReset from "@/components/ScrollReset";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { decryptSession } from "@/lib/session";
import CitySelector from "@/components/CitySelector";
import LogoutButton from "@/components/LogoutButton";
import AlertsBanner from "@/components/AlertsBanner";
import HeaderNotifications from "@/components/HeaderNotifications";
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
  Kanban,
  Building
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
  // 1. Session verification
  const sessionCookie = cookies().get("session")?.value;
  const user = sessionCookie ? decryptSession(sessionCookie) : null;

  const pathname = headers().get("x-pathname") || "";

  // Si no hay una sesión válida y la ruta solicitada no es login, forzar redirección de cierre de sesión
  if (!user && pathname !== "/login") {
    redirect("/api/auth/logout");
  }

  // If not logged in, render basic layout for login screen
  if (!user) {
    return (
      <html lang="es" className="h-full overflow-hidden">
        <body className="flex h-full bg-[#f3f8fc] text-slate-800 overflow-hidden font-sans">
          <main className="flex-1 overflow-hidden relative">
            {children}
          </main>
        </body>
      </html>
    );
  }

  // Determine active city filter
  const activeCity = cookies().get("activeCity")?.value || "Todas";
  const userRole = user.rol;
  const hasAssignedCity = Boolean(user.ciudad && user.ciudad.trim() !== "" && user.ciudad.toUpperCase() !== "TODAS" && user.ciudad.toUpperCase() !== "TODAS LAS CIUDADES");
  const userInitials = user.nombre ? user.nombre.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U";

  return (
    <html lang="es" className="h-full overflow-hidden">
      <body className="flex h-full bg-[#f3f8fc] text-slate-800 overflow-hidden font-sans">
        <ScrollReset />
        
        {/* Sidebar */}
        <aside className="w-64 bg-[#e8f4fd] border-r border-[#d4e6f4] flex flex-col justify-between flex-shrink-0 h-full overflow-hidden">
          {/* Logo - Fijo arriba */}
          <div className="p-6 flex items-center space-x-3 flex-shrink-0">
            <div className="w-10 h-10 bg-[#026692] rounded-xl flex items-center justify-center text-white shadow-md">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-[#026692] text-xl tracking-tight leading-none">NyP CRM</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5caad0] block mt-0.5">Premium Care CRM</span>
            </div>
          </div>

          {/* Área Intermedia de Navegación - Scrollable si se desborda */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 space-y-4 custom-scrollbar">
            {/* Selector de Ciudad */}
            <div>
              {!hasAssignedCity ? (
                <CitySelector activeCity={activeCity} />
              ) : (
                <div className="flex items-center space-x-2.5 bg-white/70 px-3.5 py-2.5 rounded-xl border border-[#d4e6f4] shadow-sm">
                  <Building className="w-4 h-4 text-[#026692] flex-shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-[#5caad0] uppercase tracking-wider block leading-none">Ciudad Asignada</span>
                    <span className="text-xs font-extrabold text-[#026692] uppercase block mt-1">{user.ciudad}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Línea divisoria */}
            <hr className="border-[#d4e6f4]" />

            {/* Enlaces del Menú Principal */}
            <nav className="space-y-1">
              <SidebarLink href="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
              <SidebarLink href="/embudo" icon={<Kanban className="w-5 h-5" />} label="Embudo" />
              <SidebarLink href="/leads" icon={<Users className="w-5 h-5" />} label="Leads" />
              <SidebarLink href="/inbox" icon={<Inbox className="w-5 h-5" />} label="Inbox" />
              <SidebarLink href="/follow-ups" icon={<CalendarCheck className="w-5 h-5" />} label="Seguimientos" />
              <SidebarLink href="/quotes" icon={<FileText className="w-5 h-5" />} label="Cotizaciones" />
              {userRole === "GERENTE" && (
                <>
                  <SidebarLink href="/knowledge" icon={<BookOpen className="w-5 h-5" />} label="Base de Conocimiento" />
                  <SidebarLink href="/users" icon={<Users className="w-5 h-5" />} label="Usuarios" />
                </>
              )}
            </nav>


          </div>

          {/* Pie del Sidebar (Solo Perfil y Logout) - Fijo abajo */}
          <div className="p-4 border-t border-[#d4e6f4] flex-shrink-0 bg-[#e8f4fd]">
            {/* Widget de Perfil */}
            <div className="flex items-center space-x-3 p-2 bg-white/50 rounded-xl border border-white/20">
              <div className="w-10 h-10 rounded-full bg-[#026692] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase border border-[#b2d4e7] shadow-sm">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">{user.nombre}</p>
                <p className="text-[9px] text-[#5caad0] font-bold uppercase truncate">{user.rol}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-[#ffffff] border-b border-[#e2edf6] flex items-center justify-between px-8 flex-shrink-0">
            {/* Empty Left Placeholder */}
            <div></div>

            {/* Header Right Actions */}
            <div className="flex items-center space-x-5">
              <HeaderNotifications />

              <div className="h-8 w-px bg-slate-200"></div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-700">{user.nombre}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user.rol.toLowerCase()}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#026692] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase border border-slate-200 shadow-sm">
                  {userInitials}
                </div>
              </div>
            </div>
          </header>

          <AlertsBanner />

          {/* Children View */}
          <main className="flex-1 overflow-hidden relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
