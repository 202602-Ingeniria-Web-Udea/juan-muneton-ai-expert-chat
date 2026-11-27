import { NextResponse } from "next/server";
import { groq } from "@/lib/groq";
import { getAssistantConfig } from "@/lib/ai/assistant-config";
import { chatDemoRateLimit } from "@/lib/ratelimit";
import { isIP } from "node:net";

export const runtime = "nodejs";

type DemoMessage = {
  role: "user" | "assistant";
  content: string;
};

// Límites del chat de visitantes.
const MAX_CONTEXT_MESSAGES = 12;
const MAX_CONTEXT_CHARS = 20_000;
const MAX_USER_MESSAGE_CHARS = 4_000;
const MAX_ASSISTANT_MESSAGE_CHARS = 16_000;
const MAX_REQUEST_BYTES = 64_000;
const MAX_COMPLETION_TOKENS = 2_000;

async function readRequestBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();

  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

function validateMessages(value: unknown): DemoMessage[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_CONTEXT_MESSAGES
  ) {
    return null;
  }

  const messages: DemoMessage[] = [];
  let totalChars = 0;

  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return null;
    }

    const message = item as Record<string, unknown>;

    if (message.role !== "user" && message.role !== "assistant") {
      return null;
    }

    if (typeof message.content !== "string") {
      return null;
    }

    const content = message.content.trim();

    const maxMessageChars =
      message.role === "user"
        ? MAX_USER_MESSAGE_CHARS
        : MAX_ASSISTANT_MESSAGE_CHARS;

    if (content.length === 0 || content.length > maxMessageChars) {
      return null;
    }

    totalChars += content.length;

    if (totalChars > MAX_CONTEXT_CHARS) {
      return null;
    }

    messages.push({
      role: message.role,
      content,
    });
  }

  // El último mensaje siempre debe ser del visitante.
  if (messages[messages.length - 1].role !== "user") {
    return null;
  }

  // Evitar mensajes consecutivos con el mismo rol.
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role) {
      return null;
    }
  }

  return messages;
}

function getClientIp(request: Request): string | null {
  // En desarrollo local, todos utilizan el mismo identificador.
  if (process.env.VERCEL !== "1") {
    return "local-development";
  }

  // En Vercel utilizamos el encabezado proporcionado por la plataforma.
  const ip = request.headers.get("x-vercel-forwarded-for")?.trim();

  // Rechazar valores ausentes o que no sean direcciones IP válidas.
  if (!ip || isIP(ip) === 0) {
    return null;
  }

  return ip;
}

export async function POST(request: Request) {
  // 1. Limitar las solicitudes del visitante.
  const ip = getClientIp(request);

  if (!ip) {
    return NextResponse.json(
      {
        success: false,
        message: "No fue posible identificar la solicitud.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const { success, reset } = await chatDemoRateLimit.limit(ip);

    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

      return NextResponse.json(
        {
          success: false,
          message:
            "Has alcanzado el límite de mensajes de la demostración. Inténtalo nuevamente más tarde.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "Cache-Control": "no-store",
          },
        },
      );
    }
  } catch (error) {
    console.error("Error al verificar el límite de solicitudes:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible procesar la solicitud en este momento.",
      },
      { status: 503 },
    );
  }

  // 2. Comprobar la configuración del modelo.
  const model = process.env.GROQ_MODEL;

  if (!model) {
    return NextResponse.json(
      {
        success: false,
        message: "No está configurado el modelo de inteligencia artificial.",
      },
      { status: 500 },
    );
  }

  // 3. Leer el cuerpo de la petición y limitar su tamaño.
  let rawBody: string | null;

  try {
    rawBody = await readRequestBody(request);
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "No fue posible leer el cuerpo de la petición.",
      },
      { status: 400 },
    );
  }

  if (rawBody === null) {
    return NextResponse.json(
      {
        success: false,
        message: "La solicitud supera el tamaño permitido.",
      },
      { status: 413 },
    );
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "El cuerpo de la petición no contiene JSON válido.",
      },
      { status: 400 },
    );
  }

  // 4. Validar la estructura de la solicitud.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      {
        success: false,
        message: "El cuerpo de la petición no es válido.",
      },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const messages = validateMessages(data.messages);

  if (!messages) {
    return NextResponse.json(
      {
        success: false,
        message: "Los mensajes enviados no cumplen los límites permitidos.",
      },
      { status: 400 },
    );
  }

  // 5. Obtener la configuración del asistente desde Supabase.
  let assistantConfig;

  try {
    assistantConfig = await getAssistantConfig();
  } catch (error) {
    console.error("Error al obtener la configuración del asistente:", error);

    const isDisabled =
      error instanceof Error && error.message.includes("deshabilitado");

    return NextResponse.json(
      {
        success: false,
        message: isDisabled
          ? "El asistente se encuentra temporalmente deshabilitado."
          : "No fue posible cargar la configuración del asistente.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  // 5. Consultar el modelo de inteligencia artificial.
  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: assistantConfig.system_prompt,
        },
        ...messages,
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    });

    const assistantContent = completion.choices[0]?.message?.content;

    if (
      typeof assistantContent !== "string" ||
      assistantContent.trim().length === 0
    ) {
      throw new Error("Groq no devolvió una respuesta válida.");
    }

    // 6. Devolver la respuesta sin guardar mensajes ni conversaciones.
    return NextResponse.json(
      {
        success: true,
        assistantMessage: {
          role: "assistant",
          content: assistantContent.trim(),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Error al procesar el mensaje de demostración:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible generar una respuesta. Inténtalo nuevamente.",
      },
      { status: 502 },
    );
  }
}
