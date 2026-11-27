
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedApiUser } from "@/lib/auth/api-guards";

export const runtime = "nodejs";

export async function GET() {
  // 1. Validar la sesión y el perfil del usuario.
  const auth = await getAuthenticatedApiUser();

  if (!auth.user) {
    return auth.response;
  }

  try {
    // 2. Consultar exclusivamente las conversaciones del usuario.
    const conversations = await prisma.conversation.findMany({
      where: {
        user_id: auth.user.id,
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    // 3. Devolver los resultados.
    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Error al consultar conversaciones:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible consultar las conversaciones.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // 1. Validar la sesión y el perfil del usuario.
  const auth = await getAuthenticatedApiUser();

  if (!auth.user) {
    return auth.response;
  }

  try {
    // 2. Leer y validar el cuerpo de la petición.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "El cuerpo de la petición no contiene JSON válido.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El cuerpo de la petición no es válido.",
        },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    let title: string | undefined;

    if (data.title !== undefined) {
      if (typeof data.title !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "El título debe ser un texto.",
          },
          { status: 400 }
        );
      }

      title = data.title.trim();

      if (title.length === 0 || title.length > 150) {
        return NextResponse.json(
          {
            success: false,
            message: "El título debe tener entre 1 y 150 caracteres.",
          },
          { status: 400 }
        );
      }
    }

    // 3. Crear la conversación asociada al usuario autenticado.
    const conversation = await prisma.conversation.create({
      data: {
        user_id: auth.user.id,
        ...(title !== undefined ? { title } : {}),
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
      },
    });

    // 4. Devolver la conversación creada.
    return NextResponse.json(
      {
        success: true,
        conversation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear conversación:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible crear la conversación.",
      },
      { status: 500 }
    );
  }
}
