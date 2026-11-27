
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        setErrorMessage("No fue posible cerrar la sesión.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage("Ocurrió un error al cerrar la sesión.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="rounded-lg border border-[#e8e5dd] px-4 py-2 text-sm font-medium transition hover:bg-[#eeece5] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>

      {errorMessage && (
        <p role="alert" className="text-xs text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
