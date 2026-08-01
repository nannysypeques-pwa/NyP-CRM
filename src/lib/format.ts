export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const raw = phone.trim();
  
  // Extraer sólo los dígitos numéricos
  const digits = raw.replace(/\D/g, "");
  
  if (digits.length >= 10) {
    const tenDigits = digits.slice(-10);
    const part1 = tenDigits.slice(0, 3);
    const part2 = tenDigits.slice(3, 6);
    const part3 = tenDigits.slice(6, 10);
    const formattedTen = `${part1} ${part2} ${part3}`;
    
    if (raw.includes("+521") || (digits.startsWith("521") && digits.length === 13)) {
      return `+52 1 ${formattedTen}`;
    }
    if (raw.includes("+52") || (digits.startsWith("52") && digits.length === 12)) {
      return `+52 ${formattedTen}`;
    }
    
    return formattedTen;
  }
  
  return raw;
}

export function formatLeadAges(lead?: any): string {
  if (!lead) return "Por definir";
  if (lead.hijos && Array.isArray(lead.hijos) && lead.hijos.length > 0) {
    const validHijos = lead.hijos.filter((h: any) => h.textoEdad || h.nombre);
    if (validHijos.length > 0) {
      if (validHijos.length === 1) {
        return validHijos[0].textoEdad || (lead.edadHijo !== undefined && lead.edadHijo !== null ? (lead.edadHijo === 0 ? "Menor a 1 año" : `${lead.edadHijo} años`) : "Por definir");
      }
      return validHijos.map((h: any, idx: number) => {
        const age = h.textoEdad || `${h.edad || ""} años`;
        const name = (h.nombre && !h.nombre.toLowerCase().startsWith("peque")) ? h.nombre : `Peque ${idx + 1}`;
        return `${name}: ${age}`;
      }).join(", ");
    }
  }
  if (lead.edadHijo !== undefined && lead.edadHijo !== null) {
    return lead.edadHijo === 0 ? "Menor a 1 año" : `${lead.edadHijo} años`;
  }
  return "Por definir";
}
