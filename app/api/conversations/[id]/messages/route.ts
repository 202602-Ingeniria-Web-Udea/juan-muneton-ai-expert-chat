import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedApiUser } from "@/lib/auth/api-guards";
import { groq } from "@/lib/groq";
import { getAssistantConfig } from "@/lib/ai/assistant-config";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Límites de contexto enviados al modelo.
const MAX_CONTEXT_MESSAGES = 12;
const MAX_CONTEXT_CHARS = 20_000;
const MAX_USER_MESSAGE_CHARS = 8_000;
const MAX_COMPLETION_TOKENS = 2_000;

async function generateConversationTitle(
  content: string,
  model: string,
): Promise<string> {
  const normalizedContent = content.replace(/\s+/g, " ").trim();

  const fallbackTitle =
    normalizedContent.length > 60
      ? `${normalizedContent.slice(0, 57).trimEnd()}...`
      : normalizedContent;

  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `
Genera títulos breves y descriptivos para conversaciones de un asistente gastronómico.

Reglas:
- Identifica el tema principal del mensaje.
- Escribe el título en español.
- Utiliza entre 3 y 8 palabras, siempre que sea posible.
- Resume la intención del usuario, no copies simplemente el comienzo de su pregunta.
- No respondas la pregunta ni agregues explicaciones.
- No utilices comillas.
- Devuelve únicamente el título.
          `.trim(),
        },
        {
          role: "user",
          content: normalizedContent.slice(0, 1000),
        },
      ],
      max_completion_tokens: 50,
      reasoning_effort: "low",
      temperature: 0.3,
    });

    const generatedTitle = completion.choices[0]?.message?.content
      ?.trim()
      .replace(/^["'“”]+|["'“”]+$/g, "")
      .replace(/\s+/g, " ");

    if (!generatedTitle) {
      return fallbackTitle;
    }

    return generatedTitle.length > 60
      ? `${generatedTitle.slice(0, 57).trimEnd()}...`
      : generatedTitle;
  } catch (error) {
    console.error("Error al generar el título de la conversación:", error);
    return fallbackTitle;
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  // 1. Validar la sesión y el perfil del usuario.
  const auth = await getAuthenticatedApiUser();

  if (!auth.user) {
    return auth.response;
  }

  // 2. Obtener y validar el identificador de la conversación.
  const { id } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "El identificador de la conversación no es válido.",
      },
      { status: 400 },
    );
  }

  // 3. Leer y validar el contenido del mensaje.
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "El cuerpo de la petición no contiene JSON válido.",
      },
      { status: 400 },
    );
  }

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

  if ("role" in data) {
    return NextResponse.json(
      {
        success: false,
        message: "El rol del mensaje es asignado por el servidor.",
      },
      { status: 400 },
    );
  }

  if (typeof data.content !== "string") {
    return NextResponse.json(
      {
        success: false,
        message: "El contenido del mensaje debe ser un texto.",
      },
      { status: 400 },
    );
  }

  const content = data.content.trim();

  if (content.length === 0 || content.length > MAX_USER_MESSAGE_CHARS) {
    return NextResponse.json(
      {
        success: false,
        message: "El mensaje debe tener entre 1 y 8000 caracteres.",
      },
      { status: 400 },
    );
  }

  // 4. Comprobar que el modelo esté configurado.
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

  try {
    // 5. Comprobar que la conversación pertenece al usuario.
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        user_id: auth.user.id,
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversación no encontrada.",
        },
        { status: 404 },
      );
    }

    // 6. Obtener la configuración del asistente desde Supabase.
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
        { status: 503 },
      );
    }

    // 6. Generar un título inteligente a partir del primer mensaje.
    const conversationTitle =
      conversation.title === "Nueva conversación" &&
      conversation._count.messages === 0
        ? await generateConversationTitle(content, model)
        : conversation.title;

    // 7. Guardar el mensaje del usuario y actualizar el título.
    const userMessage = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          conversation_id: conversation.id,
          role: "USER",
          content,
        },
        select: {
          id: true,
          role: true,
          content: true,
          created_at: true,
        },
      });

      await tx.conversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          title: conversationTitle,
          updated_at: new Date(),
        },
      });

      return createdMessage;
    });

    try {
      // 7. Recuperar el historial completo de la conversación desde la base de datos.
      const history = await prisma.message.findMany({
        where: {
          conversation_id: conversation.id,
        },
        select: {
          role: true,
          content: true,
        },
        orderBy: {
          created_at: "asc",
        },
      });

      // 8. Preparar la búsqueda de mensajes históricos relevantes.
      const normalizeText = (text: string) =>
        text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\p{L}\p{N}\s]/gu, " ");

      const normalizedQuery = normalizeText(content);

      const stopWords = new Set([
        "para",
        "como",
        "esta",
        "este",
        "eso",
        "esa",
        "que",
        "con",
        "por",
        "una",
        "uno",
        "los",
        "las",
        "del",
        "desde",
        "sobre",
        "cuando",
        "donde",
        "cual",
        "cuales",
        "quiero",
        "puedes",
        "podrias",
        "dime",
        "hablamos",
        "conversacion",
        "fue",
        "mi",
        "me",
        "te",
        "el",
        "la",
        "lo",
      ]);

      const searchTerms = [
        ...new Set(
          normalizedQuery
            .split(/\s+/)
            .filter((word) => word.length >= 4 && !stopWords.has(word)),
        ),
      ];

      // 9. Detectar la intención de la pregunta actual.
      const asksAboutBeginning =
        /\b(primera|primero|inicial|inicio|comienzo|empezo|empezamos)\b/.test(
          normalizedQuery,
        );

      const asksAboutOriginalRecipe =
        /\b(original|originales|al principio|inicial|iniciales)\b/.test(
          normalizedQuery,
        ) ||
        (/\b(receta|ingredientes|cantidades)\b/.test(normalizedQuery) &&
          /\b(principio|inicial|original)\b/.test(normalizedQuery));

      const asksAboutChanges =
        /\b(cambio|cambios|modificacion|modificaciones|modifique|modificar|ajuste|ajustar|sustitucion|sustituir)\b/.test(
          normalizedQuery,
        );

      // 10. Administrar los mensajes seleccionados y sus límites.
      const selectedIndices = new Set<number>();
      let totalChars = 0;

      const addMessageGroup = (indices: number[]) => {
        const newIndices = [...new Set(indices)]
          .filter(
            (index) =>
              index >= 0 &&
              index < history.length &&
              !selectedIndices.has(index),
          )
          .sort((a, b) => a - b);

        const additionalChars = newIndices.reduce(
          (total, index) => total + history[index].content.length,
          0,
        );

        if (
          selectedIndices.size + newIndices.length > MAX_CONTEXT_MESSAGES ||
          totalChars + additionalChars > MAX_CONTEXT_CHARS
        ) {
          return false;
        }

        for (const index of newIndices) {
          selectedIndices.add(index);
        }

        totalChars += additionalChars;
        return true;
      };

      // Incluir siempre el mensaje actual.
      const currentIndex = history.length - 1;
      addMessageGroup([currentIndex]);

      // 11. Priorizar los mensajes históricos según la intención.
      // La búsqueda se realiza sobre los mensajes del usuario,
      // no sobre las respuestas del asistente.
      const userMessageCandidates = history
        .map((message, index) => {
          if (index === currentIndex || message.role !== "USER") {
            return null;
          }

          const normalizedMessage = normalizeText(message.content);

          const keywordScore = searchTerms.reduce(
            (score, term) => score + (normalizedMessage.includes(term) ? 1 : 0),
            0,
          );

          const actionWords = [
            "ajustar",
            "ajuste",
            "cambiar",
            "cambio",
            "modificar",
            "modificacion",
            "sustituir",
            "sustitucion",
            "reducir",
            "aumentar",
            "agregar",
            "quitar",
            "reemplazar",
          ];

          const actionScore = asksAboutChanges
            ? actionWords.reduce(
                (score, word) =>
                  score + (normalizedMessage.includes(word) ? 1 : 0),
                0,
              )
            : 0;

          return {
            index,
            score: keywordScore + actionScore * 2,
          };
        })
        .filter(
          (item): item is { index: number; score: number } =>
            item !== null && item.score > 0,
        )
        .sort((a, b) => b.score - a.score || a.index - b.index);

      // Recuperar primero el intercambio inicial cuando corresponda.
      if (
        (asksAboutBeginning || asksAboutOriginalRecipe) &&
        history.length >= 2
      ) {
        addMessageGroup([0, 1]);
      }

      // Recuperar las solicitudes anteriores más relevantes.
      for (const candidate of userMessageCandidates) {
        if (selectedIndices.size >= MAX_CONTEXT_MESSAGES) {
          break;
        }

        // Incorporar el mensaje del usuario y su respuesta asociada.
        addMessageGroup([candidate.index, candidate.index + 1]);
      }

      // 12. Completar con los intercambios recientes.
      for (
        let i = history.length - 2;
        i >= 0 && selectedIndices.size < MAX_CONTEXT_MESSAGES;
        i--
      ) {
        if (
          history[i].role === "USER" &&
          history[i + 1]?.role === "ASSISTANT"
        ) {
          addMessageGroup([i, i + 1]);
        }
      }

      // Recuperar el orden cronológico.
      const recentHistory = [...selectedIndices]
        .sort((a, b) => a - b)
        .map((index) => history[index]);

      // Preparar los mensajes para Groq.
      const chatMessages = [
        {
          role: "system" as const,
          content: assistantConfig.system_prompt,
        },
        ...recentHistory.map((message) => ({
          role:
            message.role === "USER"
              ? ("user" as const)
              : ("assistant" as const),
          content: message.content,
        })),
      ];
      // 9. Solicitar una respuesta al modelo de inteligencia artificial.
      const completion = await groq.chat.completions.create({
        model,
        messages: chatMessages,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
      });

      const assistantContent = completion.choices[0]?.message?.content;

      if (
        typeof assistantContent !== "string" ||
        assistantContent.trim().length === 0
      ) {
        throw new Error("Groq no devolvió una respuesta válida.");
      }

      // 10. Guardar la respuesta del asistente.
      const assistantMessage = await prisma.$transaction(async (tx) => {
        const createdMessage = await tx.message.create({
          data: {
            conversation_id: conversation.id,
            role: "ASSISTANT",
            content: assistantContent.trim(),
          },
          select: {
            id: true,
            role: true,
            content: true,
            created_at: true,
          },
        });

        await tx.conversation.update({
          where: {
            id: conversation.id,
          },
          data: {
            updated_at: new Date(),
          },
        });

        return createdMessage;
      });

      // 11. Devolver los dos mensajes al frontend.
      return NextResponse.json(
        {
          success: true,
          userMessage,
          assistantMessage,
          conversationTitle,
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Error al generar o guardar respuesta de Groq:", error);

      // El mensaje del usuario ya quedó guardado.
      return NextResponse.json(
        {
          success: false,
          message:
            "Tu mensaje se guardó, pero no fue posible generar una respuesta. Puedes intentarlo nuevamente.",
          userMessage,
          conversationTitle,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Error al procesar el mensaje:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible procesar el mensaje.",
      },
      { status: 500 },
    );
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  // 1. Validar la sesión y el perfil del usuario.
  const auth = await getAuthenticatedApiUser();

  if (!auth.user) {
    return auth.response;
  }

  // 2. Obtener y validar el identificador de la conversación.
  const { id } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "El identificador de la conversación no es válido.",
      },
      { status: 400 },
    );
  }

  try {
    // 3. Buscar la conversación verificando su propietario.
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        user_id: auth.user.id,
      },
      select: {
        id: true,
        messages: {
          select: {
            id: true,
            role: true,
            content: true,
            created_at: true,
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
    });

    // 4. No revelar conversaciones de otros usuarios.
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversación no encontrada.",
        },
        { status: 404 },
      );
    }

    // 5. Devolver los mensajes en orden cronológico.
    return NextResponse.json(
      {
        success: true,
        conversation_id: conversation.id,
        messages: conversation.messages,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al consultar mensajes:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible consultar los mensajes.",
      },
      { status: 500 },
    );
  }
}
