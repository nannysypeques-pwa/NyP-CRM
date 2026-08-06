const token = "EAAQkmn0WZA7wBRj9arJMAJRnqlS9Qn9jJP5cAdlcUrRziqelQ9kozzpgw1to0zFPKnEKKcVEwyPw8gf60ueRUAKeKaZBO0zBO7XjkgCrKItYxqfbIerqlhtmUpDM4euHJrvXGueOBQEb8AI0IkJy3YpVlbSgzuZBZBBgq11v3EYUyl6ZB6O6zfcfZBab1bpQZDZD";
const businessAccountId = "1293441426106442";

async function main() {
  const url = `https://graph.facebook.com/v19.0/${businessAccountId}/message_templates?limit=100`;
  console.log(`Consultando plantillas en Meta: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    const data = await res.json();
    console.log("Respuesta status:", res.status);
    console.log("Plantillas encontradas:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
