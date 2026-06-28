async function run() {
  const url = "https://nyp-crm.vercel.app/api/cotizaciones/138823a6-756b-4ac3-a4d8-fe11f45e9abe/image";
  console.log("Fetching:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:");
    res.headers.forEach((val, key) => {
      console.log(`  ${key}: ${val}`);
    });
    console.log("Body length:", (await res.arrayBuffer()).byteLength);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
