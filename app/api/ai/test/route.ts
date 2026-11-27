import { NextResponse } from "next/server";
import { groq } from "@/lib/groq";
import { requireApiAdmin } from "@/lib/auth/api-guards";

export async function GET() {
  const auth = await requireApiAdmin();

  if (auth.response) {
    return auth.response;
  }

  try {
    await groq.models.list();

    return NextResponse.json({
      success: true,
      message: "Conexión con Groq establecida correctamente.",
    });
  } catch (error) {
    console.error("Error al conectar con Groq:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo establecer la conexión con Groq.",
      },
      { status: 502 },
    );
  }
}
