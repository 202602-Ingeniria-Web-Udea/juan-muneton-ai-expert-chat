"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ChefHat } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { normalizeMathContent } from "@/lib/utils/normalize-math-content";

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGE_CHARS = 4_000;
const MAX_ASSISTANT_MESSAGE_CHARS = 16_000;
const MAX_CONTEXT_MESSAGES = 12;
const MAX_CONTEXT_CHARS = 20_000;

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTerms(text: string): string[] {
  const stopWords = new Set([
    "que",
    "cual",
    "cuales",
    "como",
    "cuando",
    "donde",
    "quien",
    "porque",
    "para",
    "por",
    "con",
    "una",
    "uno",
    "unos",
    "unas",
    "los",
    "las",
    "del",
    "este",
    "esta",
    "eso",
    "esa",
    "fue",
    "han",
    "has",
    "he",
    "hicimos",
    "hice",
    "dime",
    "dicho",
    "sobre",
    "anterior",
    "anteriores",
    "conversacion",
  ]);

  return normalizeSearchText(text)
    .split(" ")
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function selectDemoContextMessages(
  conversationHistory: DemoMessage[],
): DemoMessage[] {
  const currentMessage = conversationHistory[conversationHistory.length - 1];

  if (!currentMessage || currentMessage.role !== "user") {
    return [];
  }

  const previousMessages = conversationHistory.slice(0, -1);

  const pairs: {
    index: number;
    user: DemoMessage;
    assistant: DemoMessage;
  }[] = [];

  // Identificar los intercambios completos anteriores.
  for (let i = 0; i + 1 < previousMessages.length; i += 2) {
    const user = previousMessages[i];
    const assistant = previousMessages[i + 1];

    if (user.role !== "user" || assistant.role !== "assistant") {
      continue;
    }

    pairs.push({
      index: i,
      user,
      assistant,
    });
  }

  const query = normalizeSearchText(currentMessage.content);

  const asksForFirstQuestion =
    /(primera|primero|inicial|inicio|comienzo|empezamos|empezo)/.test(query) &&
    /(pregunta|mensaje|conversacion|pregunte|pregunte)/.test(query);

  const asksForOriginalRecipe =
    /(original|inicial|antes de ajustar|receta base|ingredientes base|cantidades iniciales)/.test(
      query,
    );

  const asksForChanges =
    /(cambio|cambios|modificacion|modificaciones|ajuste|ajustes|ajustamos|factor|proporcion|escala|duplicar|triplicar)/.test(
      query,
    );

  const queryTerms = new Set(getSearchTerms(currentMessage.content));

  const selectedIndexes = new Set<number>();

  // Priorizar el primer intercambio si preguntan por el inicio.
  if ((asksForFirstQuestion || asksForOriginalRecipe) && pairs.length > 0) {
    selectedIndexes.add(pairs[0].index);
  }

  // Buscar el intercambio relacionado con ajustes o modificaciones.
  if (asksForChanges) {
    const adjustmentPair = [...pairs]
      .reverse()
      .find(({ user, assistant }) =>
        /(ajust|modific|factor|proporcion|multiplic|duplic|triplic|porciones)/.test(
          normalizeSearchText(user.content + " " + assistant.content),
        ),
      );

    if (adjustmentPair) {
      selectedIndexes.add(adjustmentPair.index);
    }
  }

  // Buscar intercambios que compartan términos relevantes con la pregunta.
  const scoredPairs = pairs
    .map((pair) => {
      const pairText = normalizeSearchText(
        pair.user.content + " " + pair.assistant.content,
      );

      const pairTerms = new Set(getSearchTerms(pairText));

      let score = 0;

      for (const term of queryTerms) {
        if (pairTerms.has(term)) {
          score += 1;
        }
      }

      return {
        index: pair.index,
        score,
      };
    })
    .filter((pair) => pair.score >= 2)
    .sort((a, b) => b.score - a.score);

  // Incorporar el intercambio más relevante.
  if (scoredPairs.length > 0) {
    selectedIndexes.add(scoredPairs[0].index);
  }

  // Agregar los intercambios recientes sin superar los límites.
  const selectedMessages: DemoMessage[] = [currentMessage];
  let totalChars = currentMessage.content.length;

  const addPair = (index: number) => {
    if (selectedIndexes.has(index)) {
      return;
    }

    const pair = pairs.find((item) => item.index === index);

    if (!pair) {
      return;
    }

    if (
      pair.user.content.length > MAX_MESSAGE_CHARS ||
      pair.assistant.content.length > MAX_ASSISTANT_MESSAGE_CHARS
    ) {
      return;
    }

    if (selectedMessages.length + 2 > MAX_CONTEXT_MESSAGES) {
      return;
    }

    const pairChars = pair.user.content.length + pair.assistant.content.length;

    if (totalChars + pairChars > MAX_CONTEXT_CHARS) {
      return;
    }

    selectedIndexes.add(index);
    selectedMessages.push(pair.user, pair.assistant);
    totalChars += pairChars;
  };

  // Primero se incorporan los intercambios prioritarios.
  for (const pair of pairs) {
    if (selectedIndexes.has(pair.index)) {
      const pairChars =
        pair.user.content.length + pair.assistant.content.length;

      if (
        pair.user.content.length <= MAX_MESSAGE_CHARS &&
        pair.assistant.content.length <= MAX_ASSISTANT_MESSAGE_CHARS &&
        selectedMessages.length + 2 <= MAX_CONTEXT_MESSAGES &&
        totalChars + pairChars <= MAX_CONTEXT_CHARS
      ) {
        selectedMessages.push(pair.user, pair.assistant);
        totalChars += pairChars;
      } else {
        selectedIndexes.delete(pair.index);
      }
    }
  }

  // Después se agregan los intercambios más recientes.
  for (const pair of [...pairs].reverse()) {
    addPair(pair.index);
  }

  // El contexto debe enviarse en orden cronológico.
  // El mensaje actual siempre debe quedar al final.
  const previousSelectedMessages = selectedMessages.filter(
    (message) => message.id !== currentMessage.id,
  );

  previousSelectedMessages.sort((a, b) => {
    const indexA = conversationHistory.findIndex(
      (message) => message.id === a.id,
    );

    const indexB = conversationHistory.findIndex(
      (message) => message.id === b.id,
    );

    return indexA - indexB;
  });

  return [...previousSelectedMessages, currentMessage];
}

export default function ChatDemo() {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingError, setSendingError] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Desplazar el chat hasta el último mensaje.
  useEffect(() => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sendingMessage]);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = newMessage.trim();

    if (!content || sendingMessage) {
      return;
    }

    if (content.length > MAX_MESSAGE_CHARS) {
      setSendingError("El mensaje supera los 4000 caracteres permitidos.");
      return;
    }

    setSendingMessage(true);
    setSendingError("");
    setNewMessage("");

    const userMessage: DemoMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    // Construir el contexto temporal de la conversación.
    const conversationHistory = [...messages, userMessage];

    // Recuperar intercambios relevantes y recientes.
    const recentMessages = selectDemoContextMessages(conversationHistory);

    // Mostrar el mensaje del visitante inmediatamente.
    setMessages(conversationHistory);

    try {
      const response = await fetch("/api/chat-demo/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: recentMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No fue posible enviar el mensaje.");
      }

      if (
        typeof data.assistantMessage?.content !== "string" ||
        data.assistantMessage.content.trim().length === 0
      ) {
        throw new Error("El asistente no devolvió una respuesta válida.");
      }

      const assistantMessage: DemoMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.assistantMessage.content,
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      console.error("Error en el chat de demostración:", error);

      // Retirar el mensaje para que el visitante pueda intentarlo otra vez.
      setMessages((previous) =>
        previous.filter((message) => message.id !== userMessage.id),
      );

      setNewMessage(content);

      setSendingError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al procesar tu mensaje.",
      );
    } finally {
      setSendingMessage(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#faf9f6] text-[#202820]">
      {/* Encabezado */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e8e5dd] bg-white px-4 sm:px-6">
        <div>
          <h1 className="text-lg font-bold sm:text-xl">AI Expert Chat</h1>

          <p className="text-xs text-[#73766f]">
            Especialista en recetas y técnicas culinarias
          </p>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#294b36] transition hover:bg-[#eeece5]"
          >
            ← Volver al inicio
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-[#294b36] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#203d2b]"
          >
            Registrarme
          </Link>
        </nav>
      </header>

      {/* Área de conversación */}
      <section className="flex min-h-0 flex-1 flex-col">
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8"
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            {messages.length === 0 && (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8eee8]">
                  <ChefHat size={32} className="text-[#294b36]" />
                </div>

                <h2 className="mb-3 text-2xl font-semibold">
                  ¿Qué te gustaría cocinar hoy?
                </h2>

                <p className="max-w-md text-sm leading-6 text-[#73766f]">
                  Pregúntame sobre recetas, técnicas culinarias, ingredientes o
                  sustituciones. Estoy aquí para ayudarte.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[85%] ${
                    message.role === "user"
                      ? "bg-[#294b36] text-white"
                      : "border border-[#e8e5dd] bg-white text-[#202820]"
                  }`}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : (
                    <div className="break-words [&_a]:text-[#315f43] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[#cbd5cb] [&_blockquote]:pl-4 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-3 [&_p:last-child]:mb-0 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#f4f3ef] [&_pre]:p-3 [&_strong]:font-semibold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#e8e5dd] [&_td]:p-2 [&_th]:border [&_th]:border-[#e8e5dd] [&_th]:bg-[#f4f3ef] [&_th]:p-2 [&_ul]:mb-3">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {normalizeMathContent(message.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sendingMessage && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-[#e8e5dd] bg-white px-4 py-3 text-sm text-[#73766f]">
                  Preparando tu respuesta...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Área de escritura */}
        <div className="shrink-0 border-t border-[#e8e5dd] bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-3 rounded-lg border border-[#e8d9b5] bg-[#faf6eb] px-3 py-2 text-xs leading-5 text-[#75613a]">
              <strong>Modo de demostración:</strong> esta conversación es
              temporal y no se guardará. Regístrate para conservar tus
              conversaciones y acceder a tu historial.
            </div>

            {sendingError && (
              <div
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {sendingError}
              </div>
            )}

            <form
              onSubmit={handleSendMessage}
              className="flex items-end gap-3 rounded-xl border border-[#e8e5dd] bg-[#faf9f6] p-2"
            >
              <textarea
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Escribe tu pregunta gastronómica..."
                rows={2}
                maxLength={MAX_MESSAGE_CHARS}
                disabled={sendingMessage}
                className="max-h-40 min-h-12 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[#999b94] disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMessage}
                aria-label="Enviar mensaje"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#294b36] text-white transition hover:bg-[#203d2b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={20} />
              </button>
            </form>

            <p className="mt-2 text-center text-xs text-[#999b94]">
              Puedes enviar mensajes de hasta 4000 caracteres.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
