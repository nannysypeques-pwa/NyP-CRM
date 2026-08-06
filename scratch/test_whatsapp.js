const token = "EAAQkmn0WZA7wBRj9arJMAJRnqlS9Qn9jJP5cAdlcUrRziqelQ9kozzpgw1to0zFPKnEKKcVEwyPw8gf60ueRUAKeKaZBO0zBO7XjkgCrKItYxqfbIerqlhtmUpDM4euHJrvXGueOBQEb8AI0IkJy3YpVlbSgzuZBZBBgq11v3EYUyl6ZB6O6zfcfZBab1bpQZDZD";
const phoneId = "1211316508722228";

async function testSend(to) {
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: {
      body: `Prueba de envío a ${to} desde script de diagnóstico.`,
    },
  };

  console.log(`Enviando a ${to}...`);
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(`Respuesta para ${to} (status ${response.status}):`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error para ${to}:`, error);
  }
}

async function main() {
  await testSend("522224552596");
  await testSend("5212224552596");
}

main();
