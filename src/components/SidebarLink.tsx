"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  const pathname = usePathname();
  // Check if active: exact match for /, otherwise check start of pathname
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
        isActive
          ? "bg-white text-[#026692] shadow-sm font-bold border-l-4 border-[#026692] rounded-l-none"
          : "text-slate-600 hover:bg-white/50 hover:text-[#026692]"
      }`}
    >
      <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-[#026692]" : "text-slate-400 group-hover:text-[#026692]"}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
