import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAuthSessionValid } from "@/lib/auth/session-validation";

export type AppRole = "ADMIN" | "USER";

export async function requireAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const claims = claimsData?.claims;

  if (claimsError || !claims || typeof claims.session_id !== "string") {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, enabled, session_invalidated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("No fue posible verificar el perfil del usuario.");
  }

  if (!profile) {
    redirect("/login?error=profile");
  }

  if (!profile.enabled) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=disabled");
  }

  let validSession: boolean;

  try {
    validSession = await isAuthSessionValid({
      userId: user.id,
      sessionId: claims.session_id,
      invalidatedAt: profile.session_invalidated_at,
    });
  } catch {
    throw new Error("No fue posible verificar la sesión del usuario.");
  }

  if (!validSession) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=session");
  }

  return {
    supabase,
    user,
    profile,
  };
}

export async function requireAdmin() {
  const context = await requireAuthenticatedUser();

  if (context.profile.role !== "ADMIN") {
    redirect("/chat?error=forbidden");
  }

  return context;
}
