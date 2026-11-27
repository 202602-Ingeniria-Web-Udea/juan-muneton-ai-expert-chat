import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth/api-guards";

export const runtime = "nodejs";

type UpdateUserBody = {
  role?: "ADMIN" | "USER";
  enabled?: boolean;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, response } = await requireApiAdmin();
    if (!user) return response;

    const { id } = await params;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, message: "Identificador de usuario inválido." },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Los datos enviados no son válidos." },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;
    const allowedFields = ["role", "enabled"];
    const receivedFields = Object.keys(data);

    if (
      receivedFields.length === 0 ||
      receivedFields.some((field) => !allowedFields.includes(field))
    ) {
      return NextResponse.json(
        { success: false, message: "Debes enviar un rol o un estado válido." },
        { status: 400 },
      );
    }

    const updates: UpdateUserBody = {};

    if ("role" in data) {
      if (data.role !== "ADMIN" && data.role !== "USER") {
        return NextResponse.json(
          { success: false, message: "El rol debe ser ADMIN o USER." },
          { status: 400 },
        );
      }

      updates.role = data.role;
    }

    if ("enabled" in data) {
      if (typeof data.enabled !== "boolean") {
        return NextResponse.json(
          { success: false, message: "El estado debe ser verdadero o falso." },
          { status: 400 },
        );
      }

      updates.enabled = data.enabled;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.userProfile.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          enabled: true,
        },
      });

      if (!targetUser) {
        throw new Error("USER_NOT_FOUND");
      }

      const finalRole = updates.role ?? targetUser.role;
      const finalEnabled = updates.enabled ?? targetUser.enabled;

      if (
        targetUser.id === user.id &&
        (finalRole !== "ADMIN" || !finalEnabled)
      ) {
        throw new Error("CANNOT_MODIFY_OWN_ADMIN_ACCESS");
      }

      const isRemovingActiveAdmin =
        targetUser.role === "ADMIN" &&
        targetUser.enabled &&
        (finalRole !== "ADMIN" || !finalEnabled);

      if (isRemovingActiveAdmin) {
        const activeAdmins = await tx.userProfile.count({
          where: {
            role: "ADMIN",
            enabled: true,
          },
        });

        if (activeAdmins <= 1) {
          throw new Error("LAST_ACTIVE_ADMIN");
        }
      }

      return tx.userProfile.update({
        where: { id },
        data: {
          ...updates,

          ...(updates.enabled === false
            ? { session_invalidated_at: new Date() }
            : {}),
        },
        select: {
          id: true,
          full_name: true,
          role: true,
          enabled: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado correctamente.",
      user: {
        id: updatedUser.id,
        fullName: updatedUser.full_name,
        role: updatedUser.role,
        enabled: updatedUser.enabled,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json(
          { success: false, message: "El usuario no existe." },
          { status: 404 },
        );
      }

      if (error.message === "CANNOT_MODIFY_OWN_ADMIN_ACCESS") {
        return NextResponse.json(
          {
            success: false,
            message:
              "No puedes quitarte tus propios permisos de administrador ni deshabilitar tu cuenta.",
          },
          { status: 403 },
        );
      }

      if (error.message === "LAST_ACTIVE_ADMIN") {
        return NextResponse.json(
          {
            success: false,
            message:
              "No puedes quitar el rol o deshabilitar al último administrador habilitado.",
          },
          { status: 409 },
        );
      }
    }

    console.error("Error actualizando usuario:", error);

    return NextResponse.json(
      { success: false, message: "Ocurrió un error al actualizar el usuario." },
      { status: 500 },
    );
  }
}
