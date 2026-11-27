import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAuthSessionValid } from "@/lib/auth/session-validation";

export type AuthenticatedApiUser = {
  id: string;
  email: string | undefined;
  fullName: string;
  role: "ADMIN" | "USER";
};

export async function getAuthenticatedApiUser(): Promise<
  | { user: AuthenticatedApiUser; response: null }
  | { user: null; response: NextResponse }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "No autenticado." },
        { status: 401 },
      ),
    };
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const claims = claimsData?.claims;

  if (claimsError || !claims || typeof claims.session_id !== "string") {
    await supabase.auth.signOut({ scope: "local" });

    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message:
            "No fue posible verificar la sesión. Inicia sesión nuevamente.",
        },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, enabled, session_invalidated_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Perfil de usuario no disponible." },
        { status: 403 },
      ),
    };
  }

  if (!profile.enabled) {
    await supabase.auth.signOut({ scope: "local" });

    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "La cuenta está deshabilitada." },
        { status: 403 },
      ),
    };
  }

  let validSession: boolean;

  try {
    validSession = await isAuthSessionValid({
      userId: user.id,
      sessionId: claims.session_id,
      invalidatedAt: profile.session_invalidated_at,
    });
  } catch {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "No fue posible verificar la sesión. Inténtalo nuevamente.",
        },
        { status: 503 },
      ),
    };
  }

  if (!validSession) {
    await supabase.auth.signOut({ scope: "local" });

    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Tu sesión ha sido invalidada. Inicia sesión nuevamente.",
        },
        { status: 401 },
      ),
    };
  }

  if (profile.role !== "ADMIN" && profile.role !== "USER") {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Rol de usuario no válido." },
        { status: 403 },
      ),
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: profile.full_name,
      role: profile.role,
    },
    response: null,
  };
}

export async function requireApiAdmin(): Promise<
  | { user: AuthenticatedApiUser; response: null }
  | { user: null; response: NextResponse }
> {
  const result = await getAuthenticatedApiUser();

  if (!result.user) {
    return result;
  }

  if (result.user.role !== "ADMIN") {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Permisos insuficientes." },
        { status: 403 },
      ),
    };
  }

  return result;
}
