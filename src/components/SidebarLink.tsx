"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [clicked, setClicked] = useState(false);

  // Reset clicked state when navigation completes
  useEffect(() => {
    setClicked(false);
  }, [pathname]);

  const realIsActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const isActive = realIsActive || clicked;

  return (
    <Link
      href={href}
      onMouseEnter={() => {
        try {
          router.prefetch(href);
        } catch (e) {}
      }}
      onClick={() => {
        setClicked(true);
      }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 group cursor-pointer ${
        isActive
          ? "bg-white text-[#026692] shadow-sm font-bold border-l-4 border-[#026692] rounded-l-none"
          : "text-slate-600 hover:bg-white/50 hover:text-[#026692]"
      }`}
    >
      <span className={`transition-transform duration-150 group-hover:scale-110 ${isActive ? "text-[#026692]" : "text-slate-400 group-hover:text-[#026692]"}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
