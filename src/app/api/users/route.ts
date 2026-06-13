import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSession, hashPassword } from "@/lib/session";

// Helper function to validate Gerente role
async function validateGerente(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) return null;
  const user = decryptSession(sessionCookie);
  if (!user || user.rol !== "GERENTE") return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const gerente = await validateGerente(req);
    if (!gerente) {
      return NextResponse.json({ error: "No autorizado. Solo gerentes pueden realizar esta acción." }, { status: 403 });
    }

    const users = await prisma.usuario.findMany({
      orderBy: { creadoEn: "desc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
        ciudad: true,
        urlAvatar: true,
        creadoEn: true,
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gerente = await validateGerente(req);
    if (!gerente) {
      return NextResponse.json({ error: "No autorizado. Solo gerentes pueden realizar esta acción." }, { status: 403 });
    }

    const { nombre, email, password, rol, ciudad, urlAvatar } = await req.json();

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json({ error: "Todos los campos obligatorios (nombre, email, contraseña, rol) son requeridos." }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Ya existe un usuario con este correo electrónico." }, { status: 400 });
    }

    const contrasenaHash = hashPassword(password);

    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        email: email.toLowerCase(),
        contrasenaHash,
        rol,
        ciudad: rol === "GERENTE" ? null : (ciudad || null),
        estado: "ACTIVE",
        urlAvatar: urlAvatar || null
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
        ciudad: true,
        urlAvatar: true,
        creadoEn: true,
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
