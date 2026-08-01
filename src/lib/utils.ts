export function formatIntencionComercial(lead: any): string {
  if (!lead) return "";
  
  const hijos = lead.hijos && lead.hijos.length > 0 ? lead.hijos : [];
  
  let preCotizacion = "";
  if (lead.cotizaciones && lead.cotizaciones.length > 0) {
    // Buscar la última cotización no eliminada
    const ultimaCotizacion = [...lead.cotizaciones]
      .filter((q: any) => !q.deleted)
      .pop();
    if (ultimaCotizacion) {
      preCotizacion = `$${ultimaCotizacion.total.toLocaleString()} MXN`;
    }
  }

  let pequesSection = "";
  if (hijos.length > 0) {
    pequesSection = hijos.map((hijo: any, index: number) => {
      const label = hijos.length > 1 ? ` (Peque ${index + 1})` : "";
      const nombre = hijo.nombre || `Peque ${index + 1}`;
      const edad = hijo.textoEdad || (hijo.fechaNacimiento ? hijo.fechaNacimiento : "");
      return `👫 *Nombre del peque${label}:*
${nombre}
👶🏻 *Edad/Fecha de nacimiento:*
${edad}`;
    }).join("\n\n");
  } else {
    let edadStr = "";
    if (lead.edadHijo !== undefined && lead.edadHijo !== null) {
      edadStr = lead.edadHijo === 0 ? "Menor a 1 año" : `${lead.edadHijo} años`;
    }
    pequesSection = `👫 *Nombre del peque:*
Peque 1
👶🏻 *Edad/Fecha de nacimiento:*
${edadStr}`;
  }

  return `*Tipo de servicio*
${lead.interesServicio || ""}

📆 *Día o días de servicio*
${lead.diasSolicitados || ""}
🕗 *horario del servicio*
${lead.horaInicioSolicitada && lead.horaFinSolicitada ? `${lead.horaInicioSolicitada} a ${lead.horaFinSolicitada}` : ""}
📍*zona o colonia:*
${lead.zona || ""}
📍*Link de ubicación:*
${lead.linkUbicacion || ""}
💲 Precotización: **${preCotizacion}** 
🗒📌: *Razón de Contratación*
${lead.razonContratacion || ""}
📲Contacto:
${lead.telefono || ""}
${pequesSection}`;
}

