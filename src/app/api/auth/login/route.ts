import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, encryptSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || user.estado !== "ACTIVE") {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    // Verify password hash
    const inputHash = hashPassword(password);
    if (inputHash !== user.contrasenaHash) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    // Create secure session token
    const token = encryptSession({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol as any,
      ciudad: user.ciudad || undefined,
      urlAvatar: user.urlAvatar || undefined
    });

    // Create the response and set HTTP-only cookie
    const response = NextResponse.json({
      message: "Inicio de sesión exitoso",
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        ciudad: user.ciudad,
        urlAvatar: user.urlAvatar
      }
    });

    // Session cookie configuration (7 days)
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: secure,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    // Reset selected city to default on login
    response.cookies.set("activeCity", "Todas", {
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Error en el servidor de autenticación" }, { status: 500 });
  }
}
