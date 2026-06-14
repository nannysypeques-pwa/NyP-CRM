export function formatIntencionComercial(lead: any): string {
  if (!lead) return "";
  
  const primerHijo = lead.hijos && lead.hijos.length > 0 ? lead.hijos[0] : null;
  
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
👫 *Nombre del peque:* 
${primerHijo?.nombre || ""}
👶🏻 *Edad/Fecha de nacimiento:*
${primerHijo?.textoEdad || (primerHijo?.fechaNacimiento ? primerHijo.fechaNacimiento : (lead.edadHijo ? `${lead.edadHijo} años` : ""))}
🗣 *Alergias:*
${primerHijo?.alergias || ""}
🫀 *Condición médica o especificaciones adicionales:*
${primerHijo?.condicionMedica || ""}
🩺 *Estado de salud actual:*
${primerHijo?.estadoSalud || ""}
🌈 *Preferencias o actividades favoritas:*
${primerHijo?.preferencias || ""}
🐶🐱 *No de mascotas:* 
${lead.mascotas || ""}
❤️ *Indicaciones generales para la nanny* 
${primerHijo?.indicacionesNanny || primerHijo?.instrucciones || ""}`;
}
