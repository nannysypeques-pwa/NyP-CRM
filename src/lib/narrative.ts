export function buildNarrativeSummary(lead: any, updates: any, nuevosHijos?: any[]): string {
  // Merge current lead data with updates
  const data = { ...lead, ...updates };

  let text = "";

  if (data.nombreCompleto) {
    text += `El cliente se llama ${data.nombreCompleto} y`;
  } else {
    text += `El cliente`;
  }

  if (data.interesServicio && data.interesServicio !== "Por definir") {
    text += ` busca un servicio ${data.interesServicio.toLowerCase()}`;
  } else {
    text += ` busca un servicio`;
  }

  if (data.diasSolicitados && data.diasSolicitados !== "Por definir") {
    text += ` de ${data.diasSolicitados.toLowerCase()}`;
  }

  if (data.horaInicioSolicitada && data.horaFinSolicitada) {
    const formatTime = (t: string) => {
      const match = t.match(/^(\d+):(\d+)/);
      if (match) {
        let hour = parseInt(match[1], 10);
        const minute = match[2];
        const ampm = hour >= 12 ? "pm" : "am";
        hour = hour % 12;
        hour = hour ? hour : 12; // 0 should be 12
        return `${hour}${minute === "00" ? "" : ":" + minute}${ampm}`;
      }
      return t;
    };
    const start = formatTime(data.horaInicioSolicitada);
    const end = formatTime(data.horaFinSolicitada);
    text += ` en un horario de ${start} a ${end}`;
  }

  if (data.zona && data.zona !== "Por definir") {
    text += ` en la zona de ${data.zona}`;
  }

  if (data.ciudad && data.ciudad !== "Por definir") {
    text += `, ${data.ciudad}`;
  }

  // Children
  const childrenList: any[] = [];
  if (nuevosHijos && nuevosHijos.length > 0) {
    childrenList.push(...nuevosHijos);
  } else if (lead && lead.hijos && lead.hijos.length > 0) {
    childrenList.push(...lead.hijos);
  }

  if (childrenList.length > 0) {
    const kidsText = childrenList.map(h => {
      const name = h.nombre ? h.nombre : "";
      const age = h.textoEdad ? ` de ${h.textoEdad}` : "";
      
      if (name && !name.toLowerCase().startsWith("peque")) {
        return `${name}${age}`;
      } else {
        return `un peque${age}`;
      }
    });

    if (kidsText.length === 1) {
      text += `. Para su peque ${kidsText[0]}`;
    } else {
      const last = kidsText.pop();
      const allUnnamed = childrenList.every(h => !h.nombre || h.nombre.toLowerCase().startsWith("peque"));
      if (allUnnamed) {
        const ages = childrenList.map(h => h.textoEdad ? h.textoEdad.replace(/\s*años?\s*/g, "") : "").filter(Boolean);
        if (ages.length > 1) {
          const lastAge = ages.pop();
          text += `. Para sus peques de ${ages.join(", ")} y ${lastAge} años`;
        } else {
          text += `. Para sus peques`;
        }
      } else {
        text += `. Para sus peques ${kidsText.join(", ")} y ${last}`;
      }
    }
  } else if (data.cantidadHijos) {
    text += `. Para sus ${data.cantidadHijos} peques`;
  }

  // Reason
  if (data.razonContratacion) {
    let reason = data.razonContratacion.trim();
    if (reason) {
      const lowerReason = reason.toLowerCase();
      if (!lowerReason.startsWith("ya que") && !lowerReason.startsWith("porque") && !lowerReason.startsWith("debido a")) {
        reason = `ya que ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`;
      } else {
        reason = `${reason.charAt(0).toLowerCase()}${reason.slice(1)}`;
      }
      text += ` ${reason}`;
    }
  }

  // Clean double spaces
  text = text.replace(/\s+/g, " ").trim();

  // Ensure sentence ends with period
  if (text && !text.endsWith(".")) {
    text += ".";
  }

  return `[Extractor IA] ${text}`;
}
