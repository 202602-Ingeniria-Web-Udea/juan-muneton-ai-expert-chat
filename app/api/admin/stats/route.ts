import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/auth/api-guards";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { user, response } = await requireApiAdmin();

    if (!user) return response;

    const [
      totalUsers,
      totalAdmins,
      enabledUsers,
      disabledUsers,
      totalConversations,
      totalMessages,
    ] = await Promise.all([
      prisma.userProfile.count(),

      prisma.userProfile.count({
        where: { role: "ADMIN" },
      }),

      prisma.userProfile.count({
        where: { enabled: true },
      }),

      prisma.userProfile.count({
        where: { enabled: false },
      }),

      prisma.conversation.count(),

      prisma.message.count(),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        totalEnabledUsers: enabledUsers,
        totalDisabledUsers: disabledUsers,
        totalConversations,
        totalMessages,
      },
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ocurrió un error al consultar las estadísticas.",
      },
      { status: 500 },
    );
  }
}
