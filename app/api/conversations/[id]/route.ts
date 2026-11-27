import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedApiUser } from "@/lib/auth/api-guards";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await getAuthenticatedApiUser();

  if (!auth.user) {
    return auth.response;
  }

  const { id } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "El identificador de la conversación no es válido.",
      },
      { status: 400 },
    );
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        user_id: auth.user.id,
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        messages: {
          select: {
            id: true,
            role: true,
            content: true,
            created_at: true,
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversación no encontrada.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Error al consultar conversación:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible consultar la conversación.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  // 1. Validar la sesión y el perfil del usuario.
  const auth = await getAuthenticatedApiUser();

  if (!auth.user) {
    return auth.response;
  }

  // 2. Obtener y validar el identificador.
  const { id } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "El identificador de la conversación no es válido.",
      },
      { status: 400 },
    );
  }

  // 3. Leer y validar el cuerpo de la petición.
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

  if (typeof data.title !== "string") {
    return NextResponse.json(
      {
        success: false,
        message: "El título debe ser un texto.",
      },
      { status: 400 },
    );
  }

  const title = data.title.trim();

  if (title.length === 0 || title.length > 150) {
    return NextResponse.json(
      {
        success: false,
        message: "El título debe tener entre 1 y 150 caracteres.",
      },
      { status: 400 },
    );
  }

  try {
    // 4. Actualizar únicamente una conversación del usuario.
    const conversation = await prisma.$transaction(async (tx) => {
      const result = await tx.conversation.updateMany({
        where: {
          id,
          user_id: auth.user.id,
        },
        data: {
          title,
          updated_at: new Date(),
        },
      });

      if (result.count === 0) {
        return null;
      }

      return tx.conversation.findFirst({
        where: {
          id,
          user_id: auth.user.id,
        },
        select: {
          id: true,
          title: true,
          created_at: true,
          updated_at: true,
        },
      });
    });

    // 5. Verificar que la conversación exista y pertenezca al usuario.
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversación no encontrada.",
        },
        { status: 404 },
      );
    }

    // 6. Devolver la conversación actualizada.
    return NextResponse.json(
      {
        success: true,
        conversation,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al actualizar conversación:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible actualizar la conversación.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  // 1. Validar la sesión y el perfil del usuario.
  const auth = await getAuthenticatedApiUser();

  if (!auth.user) {
    return auth.response;
  }

  // 2. Obtener y validar el identificador.
  const { id } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "El identificador de la conversación no es válido.",
      },
      { status: 400 },
    );
  }

  try {
    // 3. Eliminar únicamente una conversación del usuario autenticado.
    const result = await prisma.conversation.deleteMany({
      where: {
        id,
        user_id: auth.user.id,
      },
    });

    // 4. Comprobar si se encontró y eliminó la conversación.
    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversación no encontrada.",
        },
        { status: 404 },
      );
    }

    // 5. Confirmar la eliminación.
    return NextResponse.json(
      {
        success: true,
        message: "La conversación se eliminó correctamente.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al eliminar conversación:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible eliminar la conversación.",
      },
      { status: 500 },
    );
  }
}
