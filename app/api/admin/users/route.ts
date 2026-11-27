import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth/api-guards";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Verificar permisos administrativos.
    const { user, response } = await requireApiAdmin();

    if (!user) {
      return response;
    }

    // 2. Consultar los perfiles y sus conversaciones.
    const profiles = await prisma.userProfile.findMany({
      select: {
        id: true,
        full_name: true,
        role: true,
        enabled: true,
        created_at: true,
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // 3. Consultar los usuarios de Supabase Auth.
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (authError) {
      console.error("Error consultando usuarios de Auth:", authError);

      return NextResponse.json(
        {
          success: false,
          message: "No fue posible consultar los correos de los usuarios.",
        },
        { status: 500 },
      );
    }

    // 4. Crear un mapa de correos electrónicos.
    const emailsById = new Map(
      authData.users.map((authUser) => [authUser.id, authUser.email ?? null]),
    );

    // 5. Combinar los perfiles con los datos de Auth.
    const users = profiles.map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      email: emailsById.get(profile.id) ?? null,
      role: profile.role,
      enabled: profile.enabled,
      createdAt: profile.created_at,
      conversationsCount: profile._count.conversations,
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ocurrió un error al consultar los usuarios.",
      },
      { status: 500 },
    );
  }
}
