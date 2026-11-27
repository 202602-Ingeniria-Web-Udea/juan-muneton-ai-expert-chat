import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth/api-guards";

export const runtime = "nodejs";

// Campos que puede consultar el administrador.
const assistantConfigSelect = {
  id: true,
  name: true,
  description: true,
  specialty: true,
  system_prompt: true,
  enabled: true,
  created_at: true,
  updated_at: true,
};

// GET: consultar la configuración del asistente.
export async function GET() {
  const auth = await requireApiAdmin();

  if (!auth.user) {
    return auth.response;
  }

  try {
    const config = await prisma.assistantConfig.findUnique({
      where: {
        id: 1,
      },
      select: assistantConfigSelect,
    });

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message: "No se encontró la configuración del asistente.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        config,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Error al consultar la configuración:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible consultar la configuración del asistente.",
      },
      { status: 500 },
    );
  }
}

// PATCH: actualizar la configuración del asistente.
export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();

  if (!auth.user) {
    return auth.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "El cuerpo de la petición no contiene JSON válido.",
      },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      {
        success: false,
        message: "El cuerpo de la petición no es válido.",
      },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const allowedFields = [
    "name",
    "description",
    "specialty",
    "system_prompt",
    "enabled",
  ];

  if (
    Object.keys(data).length === 0 ||
    Object.keys(data).some((key) => !allowedFields.includes(key))
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Los campos enviados no son válidos.",
      },
      { status: 400 },
    );
  }

  const updateData: {
    name?: string;
    description?: string;
    specialty?: string;
    system_prompt?: string;
    enabled?: boolean;
  } = {};

  const textFields = [
    { key: "name", max: 100, label: "nombre" },
    { key: "description", max: 500, label: "descripción" },
    { key: "specialty", max: 150, label: "especialidad" },
  ] as const;

  for (const field of textFields) {
    if (field.key in data) {
      const value = data[field.key];

      if (
        typeof value !== "string" ||
        value.trim().length === 0 ||
        value.trim().length > field.max
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `${field.label === "nombre" ? "El" : "La"} ${field.label} debe tener entre 1 y ${field.max} caracteres.`,
          },
          { status: 400 },
        );
      }

      updateData[field.key] = value.trim();
    }
  }

  if ("system_prompt" in data) {
    if (
      typeof data.system_prompt !== "string" ||
      data.system_prompt.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El System Prompt no puede estar vacío.",
        },
        { status: 400 },
      );
    }

    updateData.system_prompt = data.system_prompt.trim();
  }

  if ("enabled" in data) {
    if (typeof data.enabled !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "El estado del asistente debe ser verdadero o falso.",
        },
        { status: 400 },
      );
    }

    updateData.enabled = data.enabled;
  }

  try {
    const config = await prisma.assistantConfig.update({
      where: {
        id: 1,
      },
      data: updateData,
      select: assistantConfigSelect,
    });

    return NextResponse.json(
      {
        success: true,
        message: "La configuración del asistente se actualizó correctamente.",
        config,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al actualizar la configuración:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible actualizar la configuración del asistente.",
      },
      { status: 500 },
    );
  }
}
