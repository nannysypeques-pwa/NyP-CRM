import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = process.env.WHATSAPP_TOKEN;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!token || !businessAccountId || token === "mock-whatsapp-token" || businessAccountId === "mock-phone-id") {
    console.log("WhatsApp credentials not set or mock. Returning empty list.");
    return NextResponse.json({ data: [] });
  }

  const url = `https://graph.facebook.com/v19.0/${businessAccountId}/message_templates?limit=100`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      next: { revalidate: 15 } // Cache simple por 15 segundos para evitar saturación de API de Meta
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Meta API error fetching templates:", data);
      return NextResponse.json({ error: "Failed to fetch templates from Meta", details: data }, { status: response.status });
    }

    const templates = data.data || [];
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
