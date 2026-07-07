import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mail";
import { randomInt } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "El correo electrónico es requerido." },
        { status: 400 }
      );
    }

    // Verify if user exists and is active
    const user = await prisma.usuario.findFirst({
      where: {
        email: {
          equals: email.toLowerCase(),
          mode: "insensitive"
        },
        estado: "ACTIVE"
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "El correo electrónico no está registrado o el usuario está inactivo." },
        { status: 404 }
      );
    }

    // Generate a secure 6-digit numeric code
    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save or update the OTP in the database
    await prisma.otp.upsert({
      where: { email: email.toLowerCase() },
      create: {
        email: email.toLowerCase(),
        code,
        expiresAt
      },
      update: {
        code,
        expiresAt,
        createdAt: new Date()
      }
    });

    // Send the OTP email
    const mailResult = await sendOtpEmail(email.toLowerCase(), code);

    return NextResponse.json({
      message: "Código de verificación enviado con éxito. Revisa tu bandeja de entrada.",
      localLog: mailResult.method === "local-log"
    });
  } catch (error) {
    console.error("Request OTP error:", error);
    return NextResponse.json(
      { error: "Error en el servidor al generar el código OTP." },
      { status: 500 }
    );
  }
}
