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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gerente = await validateGerente(req);
    if (!gerente) {
      return NextResponse.json({ error: "No autorizado. Solo gerentes pueden realizar esta acción." }, { status: 403 });
    }

    const { nombre, email, password, rol, ciudad, estado, urlAvatar } = await req.json();

    const targetUser = await prisma.usuario.findUnique({
      where: { id: params.id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    // Evitar que el gerente se desactive a sí mismo o se quite el rol
    if (params.id === gerente.userId) {
      if (estado === "INACTIVE" || (rol !== undefined && rol !== "GERENTE")) {
        return NextResponse.json({ error: "No puedes desactivar tu propia cuenta de gerente ni cambiar tu propio rol." }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (email !== undefined) {
      // Check duplicate email if it's changing
      if (email.toLowerCase() !== targetUser.email.toLowerCase()) {
        const existing = await prisma.usuario.findUnique({
          where: { email: email.toLowerCase() }
        });
        if (existing) {
          return NextResponse.json({ error: "Ya existe otro usuario registrado con este correo." }, { status: 400 });
        }
      }
      updateData.email = email.toLowerCase();
    }
    if (password !== undefined && password.trim() !== "") {
      updateData.contrasenaHash = hashPassword(password);
    }
    if (rol !== undefined) {
      updateData.rol = rol;
      // Gerentes no tienen ciudad
      if (rol === "GERENTE") {
        updateData.ciudad = null;
      } else if (ciudad !== undefined) {
        updateData.ciudad = ciudad || null;
      }
    } else if (ciudad !== undefined) {
      updateData.ciudad = targetUser.rol === "GERENTE" ? null : (ciudad || null);
    }
    if (estado !== undefined) updateData.estado = estado;
    if (urlAvatar !== undefined) updateData.urlAvatar = urlAvatar || null;

    const updated = await prisma.usuario.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gerente = await validateGerente(req);
    if (!gerente) {
      return NextResponse.json({ error: "No autorizado. Solo gerentes pueden realizar esta acción." }, { status: 403 });
    }

    if (params.id === gerente.userId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta de gerente en uso." }, { status: 400 });
    }

    const targetUser = await prisma.usuario.findUnique({
      where: { id: params.id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    try {
      // Eliminar al usuario físicamente
      await prisma.usuario.delete({
        where: { id: params.id }
      });
      return NextResponse.json({ message: "Usuario eliminado con éxito de la base de datos." });
    } catch (dbError: any) {
      // Interceptar errores de restricción de clave foránea en PostgreSQL (P2003 en Prisma)
      if (dbError.code === "P2003") {
        return NextResponse.json({
          error: "No es posible eliminar físicamente al usuario porque tiene relaciones vinculadas en el CRM (ej: mensajes de chat o asignaciones). Te recomendamos cambiar su estado a INACTIVO desde la edición para bloquear su acceso de forma segura.",
          code: "FOREIGN_KEY_VIOLATION"
        }, { status: 409 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "Error al eliminar el usuario de la base de datos." }, { status: 500 });
  }
}
