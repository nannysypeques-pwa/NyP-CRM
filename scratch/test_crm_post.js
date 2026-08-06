const convId = "a1002764-7380-4e54-9211-bad50d5c98ff";

async function sendMsg(contenido, idMensajeRespondido = null, textoCitado = null) {
  const url = `http://localhost:3000/api/conversations/${convId}/messages`;
  const body = {
    direccion: "OUTBOUND",
    tipoRemitente: "AGENT",
    idRemitente: "gerente-gerardo",
    contenido,
    idMensajeRespondido,
    textoCitado
  };

  console.log(`Enviando POST a ${url} con contenido "${contenido}"...`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log("Respuesta status:", res.status);
    console.log("Respuesta body:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

async function main() {
  // Test direct message
  await sendMsg("Prueba sin respuesta");
}

main();
