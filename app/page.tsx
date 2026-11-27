import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";

const features = [
  {
    title: "Recetas",
    description:
      "Descubre preparaciones, ingredientes y nuevas ideas para cocinar.",
    icon: "📖",
  },
  {
    title: "Técnicas culinarias",
    description: "Aprende métodos de cocción, cortes y procesos gastronómicos.",
    icon: "🔥",
  },
  {
    title: "Sustitución de ingredientes",
    description:
      "Encuentra alternativas cuando no tengas un ingrediente disponible.",
    icon: "🥑",
  },
];

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = profile?.role === "ADMIN";
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#faf9f6] text-[#202820]">
      {/* Navegación principal */}
      <header className="flex items-center justify-between border-b border-[#e8e5dd] px-6 py-4 md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173f35] text-xl">
            👨‍🍳
          </div>

          <span className="text-lg font-bold tracking-tight">
            AI Expert Chat
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-[#73766f]">Sesión iniciada</p>

                <p className="text-sm font-semibold">{user.email}</p>
              </div>

              <span
                className="h-2.5 w-2.5 rounded-full bg-green-500"
                title="Usuario autenticado"
                aria-label="Usuario autenticado"
              />

              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-[#d8e4d9] px-4 py-2 text-sm font-semibold text-[#285b43] transition hover:bg-[#edf4ed]"
                >
                  Panel administrativo
                </Link>
              )}

              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium transition hover:bg-[#eeece5]"
              >
                Iniciar sesión
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-[#173f35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#245747]"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Presentación principal */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-6 rounded-full border border-[#d8e4d9] bg-[#edf4ed] px-4 py-2 text-sm font-medium text-[#285b43]">
          Tu asistente gastronómico inteligente
        </span>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          La cocina, con <span className="text-[#39765a]">inteligencia.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-8 text-[#73766f] md:text-lg">
          Resuelve tus dudas, explora nuevas recetas y aprende técnicas
          culinarias. Un asistente especializado que te acompaña en cada
          preparación.
        </p>

        {user ? (
          <>
            <div className="mt-10 rounded-xl border border-[#d8e4d9] bg-[#edf4ed] px-6 py-4">
              <p className="font-semibold text-[#285b43]">
                ¡Bienvenido a AI Expert Chat!
              </p>

              <p className="mt-1 text-sm text-[#73766f]">
                Has iniciado sesión correctamente. Tu espacio de conversación
                está listo.
              </p>
            </div>

            <Link
              href="/chat"
              className="mt-6 inline-flex items-center gap-3 rounded-xl bg-[#173f35] px-7 py-4 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#245747]"
            >
              Ir al chat
              <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <Link
            href="/chat-demo"
            className="mt-10 inline-flex items-center gap-3 rounded-xl bg-[#173f35] px-7 py-4 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#245747]"
          >
            Comenzar a conversar
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </section>

      {/* Funcionalidades */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            Todo lo que necesitas para explorar la gastronomía
          </h2>

          <p className="mt-3 text-[#73766f]">
            Conocimiento culinario disponible cuando lo necesites.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[#e8e5dd] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden="true">
                {feature.icon}
              </span>

              <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>

              <p className="mt-3 text-sm leading-7 text-[#73766f]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Pie de página */}
      <footer className="border-t border-[#e8e5dd] px-6 py-6 text-center text-sm text-[#73766f]">
        AI Expert Chat · Tu compañero inteligente en la cocina.
      </footer>
    </main>
  );
}
