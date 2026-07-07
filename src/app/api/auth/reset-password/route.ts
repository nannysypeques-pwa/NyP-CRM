import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Correo electrónico y nueva contraseña son requeridos." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    // Find the active user by email (case-insensitive search)
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

    // Hash new password and update user record
    const contrasenaHash = hashPassword(newPassword);

    await prisma.usuario.update({
      where: { id: user.id },
      data: { contrasenaHash }
    });

    return NextResponse.json({
      message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión."
    });
  } catch (error) {
    console.error("Reset password API error:", error);
    return NextResponse.json(
      { error: "Error en el servidor al restablecer la contraseña." },
      { status: 500 }
    );
  }
}
