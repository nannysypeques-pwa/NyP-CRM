"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

interface CitySelectorProps {
  activeCity: string;
}

export default function CitySelector({ activeCity }: CitySelectorProps) {
  const router = useRouter();
  
  // Normalizar para que si la cookie viene como "Querétaro" (con acento),
  // se asocie correctamente con el value "Queretaro" de nuestro selector.
  const initialCity = activeCity === "Querétaro" ? "Queretaro" : activeCity;
  const [selectedCity, setSelectedCity] = useState(initialCity);

  // Sincronizar el estado si la prop cambia
  useEffect(() => {
    const nextCity = activeCity === "Querétaro" ? "Queretaro" : activeCity;
    setSelectedCity(nextCity);
  }, [activeCity]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCity(val); // Actualización visual inmediata en el cliente
    
    // Guardar la cookie con la ciudad activa (usando "Queretaro" sin caracteres no-ASCII)
    document.cookie = `activeCity=${val}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    
    // Refrescar de manera reactiva y parcial sin hacer recarga dura de página
    router.refresh();
  };

  return (
    <div className="flex items-center space-x-2.5 bg-white/70 px-3.5 py-2 rounded-xl border border-[#d4e6f4] shadow-sm w-full">
      <MapPin className="w-4 h-4 text-[#026692] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-bold text-[#5caad0] uppercase tracking-wider block leading-none">Ciudad Activa</span>
        <select
          value={selectedCity}
          onChange={handleChange}
          className="bg-transparent border-0 text-xs font-extrabold text-[#026692] focus:outline-none focus:ring-0 cursor-pointer w-full py-0 mt-1 font-sans uppercase leading-none pl-0 pr-4"
        >
          <option value="Todas">Todas las ciudades</option>
          <option value="CDMX">CDMX</option>
          <option value="Puebla">Puebla</option>
          <option value="Queretaro">Querétaro</option>
          <option value="Xalapa">Xalapa</option>
        </select>
      </div>
    </div>
  );
}
