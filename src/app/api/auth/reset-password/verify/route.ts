import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: "Todos los campos (correo, código OTP y nueva contraseña) son requeridos." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Find the OTP record
    const otpRecord = await prisma.otp.findUnique({
      where: { email: emailLower }
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No se encontró una solicitud de restablecimiento para este correo o el código ha expirado." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > otpRecord.expiresAt) {
      // Clean up expired OTP record
      await prisma.otp.delete({ where: { id: otpRecord.id } }).catch(() => {});
      return NextResponse.json(
        { error: "El código OTP ha expirado. Por favor, solicita uno nuevo." },
        { status: 400 }
      );
    }

    // Check code matching
    if (otpRecord.code !== code.trim()) {
      return NextResponse.json(
        { error: "El código OTP ingresado es incorrecto." },
        { status: 400 }
      );
    }

    // Find the user to update
    const user = await prisma.usuario.findFirst({
      where: {
        email: {
          equals: emailLower,
          mode: "insensitive"
        },
        estado: "ACTIVE"
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "El usuario no existe o se encuentra inactivo." },
        { status: 404 }
      );
    }

    // Hash the new password and update the user record
    const contrasenaHash = hashPassword(newPassword);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: user.id },
        data: { contrasenaHash }
      }),
      prisma.otp.delete({
        where: { id: otpRecord.id }
      })
    ]);

    return NextResponse.json({
      message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión."
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Error en el servidor al verificar el código OTP." },
      { status: 500 }
    );
  }
}
