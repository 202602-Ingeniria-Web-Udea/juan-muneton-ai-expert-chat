
import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#faf9f6]">
          <p className="text-sm text-[#73766f]">
            Cargando formulario...
          </p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
