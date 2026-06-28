// Use native fetch

const token = process.env.WHATSAPP_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const toPhone = "522223211930"; // Perla's phone

async function sendImage(url, label) {
  console.log(`Sending image (${label}): ${url}`);
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhone,
        type: "image",
        image: {
          link: url,
          caption: `Test image sending (${label})`
        },
      }),
    });

    const data = await response.json();
    console.log(`Response (${label}):`, data);
  } catch (error) {
    console.error(`Error (${label}):`, error);
  }
}

async function run() {
  if (!token || !phoneId) {
    console.error("Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID in env.");
    return;
  }
  // Test 1: Public mock image
  await sendImage("https://raw.githubusercontent.com/otavio/mock-media/main/image.png", "GitHub PNG");

  // Test 2: Our actual route on vercel
  await sendImage("https://nyp-crm.vercel.app/api/cotizaciones/138823a6-756b-4ac3-a4d8-fe11f45e9abe/image", "Our Vercel PNG");
}

run();
