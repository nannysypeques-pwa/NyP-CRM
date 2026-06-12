"use client";

import React, { useState } from "react";
import { Lock, Mail, HeartHandshake, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Algo salió mal. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }

      // Successful login -> Redirect to dashboard
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setError("Error de conexión. Inténtalo más tarde.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#e8f4fd] via-[#f3f8fc] to-[#d4e6f4] p-4 relative overflow-hidden font-sans">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-[#5caad0]/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-[#026692]/10 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl p-8 rounded-[2.5rem] border border-[#e2edf6] shadow-2xl space-y-8 relative z-10">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 bg-[#026692] rounded-2xl items-center justify-center text-white shadow-lg shadow-[#026692]/20">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#026692] tracking-tight">Iniciar Sesión</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Ingresa tus credenciales para acceder a NyP CRM</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 text-rose-600 border border-rose-100 px-4 py-3 rounded-2xl text-xs font-semibold text-center animate-shake">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Correo Electrónico</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f4f8fc]/80 border border-[#d4e6f4] rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] focus:bg-white transition-all placeholder-slate-400"
                placeholder="ejemplo@nannysypeques.com"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f4f8fc]/80 border border-[#d4e6f4] rounded-2xl pl-10 pr-10 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#026692] focus:bg-white transition-all placeholder-slate-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#026692] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#026692] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#1d4359] focus:outline-none focus:ring-4 focus:ring-[#026692]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-[#026692]/10 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Ingresar al Portal"
            )}
          </button>
        </form>

        {/* Help Note */}
        <div className="pt-4 border-t border-[#f0f7fc] text-center">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            ¿No tienes cuenta o perdiste tu acceso?<br />
            Contacta al Coordinador o Administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
