
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    console.error("[Auth Confirm] No se recibió el código de confirmación.");

    return NextResponse.redirect(
      new URL("/login?error=confirmation", origin)
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[Auth Confirm] Error al intercambiar el código:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    return NextResponse.redirect(
      new URL("/login?error=confirmation", origin)
    );
  }

  return NextResponse.redirect(
    new URL("/login?verified=1", origin)
  );
}
