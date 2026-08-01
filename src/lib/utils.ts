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
      return `👫 *Nombre del peque${label}:*
${hijo.nombre || `Peque ${index + 1}`}
👶🏻 *Edad/Fecha de nacimiento:*
${hijo.textoEdad || (hijo.fechaNacimiento ? hijo.fechaNacimiento : "")}
🗣 *Alergias:*
${hijo.alergias || ""}
🫀 *Condición médica o especificaciones adicionales:*
${hijo.condicionMedica || ""}
🩺 *Estado de salud actual:*
${hijo.estadoSalud || ""}
🌈 *Preferencias o actividades favoritas:*
${hijo.preferencias || ""}
❤️ *Indicaciones generales para la nanny:*
${hijo.indicacionesNanny || hijo.instrucciones || ""}`;
    }).join("\n\n");
  } else {
    pequesSection = `👫 *Nombre del peque:*

👶🏻 *Edad/Fecha de nacimiento:*
${lead.edadHijo ? `${lead.edadHijo} años` : ""}
🗣 *Alergias:*

🫀 *Condición médica o especificaciones adicionales:*

🩺 *Estado de salud actual:*

🌈 *Preferencias o actividades favoritas:*

❤️ *Indicaciones generales para la nanny:*`;
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
${pequesSection}
🐶🐱 *No de mascotas:* 
${lead.mascotas || ""}`;
}
