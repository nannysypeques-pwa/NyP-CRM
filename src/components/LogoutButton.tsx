"use client";

import React, { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Failed to logout", error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
      title="Cerrar sesión"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
      ) : (
        <LogOut className="w-5 h-5" />
      )}
    </button>
  );
}
