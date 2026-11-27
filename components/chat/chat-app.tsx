"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Pencil, Trash2, X } from "lucide-react";
import LogoutButton from "@/components/logout-button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Link from "next/link";
import { normalizeMathContent } from "@/lib/utils/normalize-math-content";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  created_at: string;
};

type ChatAppProps = {
  fullName: string;
};

export default function ChatApp({ fullName }: ChatAppProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<
    string | null
  >(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editedConversationTitle, setEditedConversationTitle] = useState("");
  const [updatingConversationId, setUpdatingConversationId] = useState<
    string | null
  >(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingError, setSendingError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container || loadingMessages) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [messages, loadingMessages]);

  async function handleSelectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setMobileSidebarOpen(false);
    setMessages([]);
    setLoadingMessages(true);
    setMessageError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo cargar la conversación.");
      }

      setMessages(data.conversation.messages);
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar los mensajes.",
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleNewConversation() {
    setCreatingConversation(true);
    setCreationError(null);

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Nueva conversación",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo crear la conversación.");
      }

      const newConversation: Conversation = data.conversation;

      setConversations((previous) => [newConversation, ...previous]);

      setSelectedConversationId(newConversation.id);
      setMobileSidebarOpen(false);
      setMessages([]);
      setMessageError(null);
    } catch (err) {
      setCreationError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear la conversación.",
      );
    } finally {
      setCreatingConversation(false);
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    if (deletingConversationId) {
      return;
    }

    const confirmed = window.confirm(
      "¿Estás seguro de que deseas eliminar esta conversación? También se eliminarán todos sus mensajes. Esta acción no se puede deshacer.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingConversationId(conversationId);
    setDeletionError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo eliminar la conversación.");
      }

      // Eliminar la conversación del historial.
      setConversations((previous) =>
        previous.filter((conversation) => conversation.id !== conversationId),
      );

      // Si era la conversación seleccionada, limpiar el chat.
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setMessages([]);
        setMessageError(null);
        setNewMessage("");
        setSendingError(null);
      }
    } catch (err) {
      setDeletionError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al eliminar la conversación.",
      );
    } finally {
      setDeletingConversationId(null);
    }
  }

  async function handleRenameConversation(conversationId: string) {
    const title = editedConversationTitle.trim();

    if (title.length === 0 || title.length > 150) {
      setRenameError("El título debe tener entre 1 y 150 caracteres.");
      return;
    }

    setUpdatingConversationId(conversationId);
    setRenameError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo actualizar el título.");
      }

      setConversations((previous) =>
        previous
          .map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  title: data.conversation.title,
                  updated_at: data.conversation.updated_at,
                }
              : conversation,
          )
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime(),
          ),
      );

      setEditingConversationId(null);
      setEditedConversationTitle("");
    } catch (err) {
      setRenameError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al actualizar el título.",
      );
    } finally {
      setUpdatingConversationId(null);
    }
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = newMessage.trim();

    if (!content || !selectedConversationId || sendingMessage) {
      return;
    }

    setSendingMessage(true);
    setSendingError(null);

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        },
      );

      const data = await response.json();

      // Actualizar el mensaje y el título si el backend guardó el mensaje del usuario.
      if (data.userMessage) {
        const savedUserMessage: Message = data.userMessage;

        if (!response.ok) {
          setMessages((previous) => [...previous, savedUserMessage]);
          setNewMessage("");
        }
      }

      // Si el backend devolvió un título, actualizar el historial.
      if (typeof data.conversationTitle === "string") {
        setConversations((previous) =>
          previous
            .map((conversation) =>
              conversation.id === selectedConversationId
                ? {
                    ...conversation,
                    title: data.conversationTitle,
                    updated_at:
                      data.assistantMessage?.created_at ??
                      data.userMessage?.created_at ??
                      conversation.updated_at,
                  }
                : conversation,
            )
            .sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime(),
            ),
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "No se pudo enviar el mensaje.");
      }

      const savedUserMessage: Message = data.userMessage;
      const savedAssistantMessage: Message = data.assistantMessage;

      // Mostrar el mensaje del usuario y la respuesta de IA.
      setMessages((previous) => [
        ...previous,
        savedUserMessage,
        savedAssistantMessage,
      ]);

      setNewMessage("");

      setConversations((previous) =>
        previous
          .map((conversation) =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  title:
                    typeof data.conversationTitle === "string"
                      ? data.conversationTitle
                      : conversation.title,
                  updated_at: savedAssistantMessage.created_at,
                }
              : conversation,
          )
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime(),
          ),
      );
    } catch (err) {
      setSendingError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar el mensaje.",
      );
    } finally {
      setSendingMessage(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchConversations() {
      try {
        const response = await fetch("/api/conversations");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "No se pudieron cargar las conversaciones.",
          );
        }

        if (!cancelled) {
          setConversations(data.conversations);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Ocurrió un error al cargar las conversaciones.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchConversations();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex h-dvh overflow-hidden bg-[#faf9f6] text-[#202820]">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-[#e8e5dd] bg-white p-5 transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-none ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">AI Expert Chat</h1>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-2 text-[#73766f] transition hover:bg-[#f5f4f0] md:hidden"
            aria-label="Cerrar menú"
            title="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mt-2 text-sm text-[#73766f]">
          Tu asistente especializado en gastronomía.
        </p>

        <button
          type="button"
          onClick={() => void handleNewConversation()}
          disabled={creatingConversation}
          className="mt-8 rounded-xl bg-[#39765a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2f634a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingConversation
            ? "Creando conversación..."
            : "+ Nueva conversación"}
        </button>

        {creationError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {creationError}
          </p>
        )}

        {deletionError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {deletionError}
          </p>
        )}

        {renameError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {renameError}
          </p>
        )}

        <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-[#73766f]">
          Historial
        </h2>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[#73766f]">Cargando conversaciones...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-[#73766f]">
              Todavía no tienes conversaciones.
            </p>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className="flex items-center gap-1">
                {editingConversationId === conversation.id ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="text"
                      value={editedConversationTitle}
                      onChange={(event) =>
                        setEditedConversationTitle(event.target.value)
                      }
                      maxLength={150}
                      autoFocus
                      disabled={updatingConversationId !== null}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleRenameConversation(conversation.id);
                        }

                        if (event.key === "Escape") {
                          setEditingConversationId(null);
                          setEditedConversationTitle("");
                          setRenameError(null);
                        }
                      }}
                      className="w-full rounded-lg border border-[#dedbd2] bg-[#faf9f6] px-3 py-2 text-sm outline-none focus:border-[#39765a]"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleRenameConversation(conversation.id)
                        }
                        disabled={updatingConversationId !== null}
                        className="rounded-lg bg-[#39765a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2f634a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingConversationId === conversation.id
                          ? "Guardando..."
                          : "Guardar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingConversationId(null);
                          setEditedConversationTitle("");
                          setRenameError(null);
                        }}
                        disabled={updatingConversationId !== null}
                        className="rounded-lg px-3 py-2 text-xs text-[#73766f] transition hover:bg-[#f5f4f0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void handleSelectConversation(conversation.id)
                      }
                      aria-pressed={selectedConversationId === conversation.id}
                      className={`min-w-0 flex-1 rounded-lg px-3 py-3 text-left text-sm transition ${
                        selectedConversationId === conversation.id
                          ? "bg-[#e8f0e9] font-semibold text-[#39765a]"
                          : "hover:bg-[#f5f4f0]"
                      }`}
                    >
                      <span className="block truncate">
                        {conversation.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingConversationId(conversation.id);
                        setEditedConversationTitle(conversation.title);
                        setRenameError(null);
                      }}
                      disabled={deletingConversationId !== null}
                      title="Renombrar conversación"
                      aria-label={`Renombrar conversación: ${conversation.title}`}
                      className="shrink-0 rounded-lg p-2 text-[#73766f] transition hover:bg-[#e8f0e9] hover:text-[#39765a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil size={17} strokeWidth={2} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteConversation(conversation.id)
                      }
                      disabled={
                        deletingConversationId !== null ||
                        updatingConversationId !== null
                      }
                      aria-label={
                        deletingConversationId === conversation.id
                          ? `Eliminando conversación: ${conversation.title}`
                          : `Eliminar conversación: ${conversation.title}`
                      }
                      title={
                        deletingConversationId === conversation.id
                          ? "Eliminando conversación..."
                          : "Eliminar conversación"
                      }
                      className="shrink-0 rounded-lg p-2 text-[#73766f] transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={17} strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[#e8e5dd] pt-4">
          <p className="text-sm font-medium">{fullName}</p>

          <p className="mt-1 text-xs text-[#73766f]">
            Asistente de gastronomía
          </p>

          <div className="mt-4">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#e8e5dd] bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="rounded-lg p-2 text-[#73766f] transition hover:bg-[#f5f4f0] md:hidden"
            aria-label="Abrir historial de conversaciones"
            title="Abrir historial"
          >
            <Menu size={21} />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold">
              {selectedConversation?.title || "Nueva conversación"}
            </h2>

            <p className="truncate text-xs text-[#73766f]">
              Especialista en recetas y técnicas culinarias
            </p>
          </div>

          <Link
            href="/"
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[#294b36] transition hover:bg-[#eeece5]"
          >
            ← Volver al inicio
          </Link>
        </header>

        <div
          ref={messagesContainerRef}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-8"
        >
          {!selectedConversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f0e9] text-3xl">
                🍃
              </div>

              <h2 className="text-2xl font-bold">
                ¿Qué te gustaría cocinar hoy?
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-[#73766f]">
                Pregúntame sobre recetas, técnicas culinarias, ingredientes y
                sustituciones para tus preparaciones.
              </p>

              <p className="mt-6 rounded-xl border border-[#e8e5dd] bg-white px-4 py-3 text-xs text-[#73766f]">
                Estoy listo para ayudarte con recetas, técnicas culinarias,
                ingredientes y sustituciones. ¿Qué te gustaría preparar?
              </p>
            </div>
          ) : loadingMessages ? (
            <p className="text-center text-sm text-[#73766f]">
              Cargando mensajes...
            </p>
          ) : messageError ? (
            <p role="alert" className="text-center text-sm text-red-600">
              {messageError}
            </p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-[#73766f]">
              Esta conversación todavía no tiene mensajes.
            </p>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "USER" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                      message.role === "USER"
                        ? "bg-[#39765a] text-white"
                        : "border border-[#e8e5dd] bg-white text-[#202820]"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold opacity-75">
                      {message.role === "USER" ? "Tú" : "Asistente"}
                    </p>

                    {message.role === "USER" ? (
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.content}
                      </p>
                    ) : (
                      <div className="max-w-none text-sm leading-7 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_strong]:font-bold [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[#39765a] [&_blockquote]:pl-4 [&_blockquote]:text-[#73766f] [&_code]:rounded [&_code]:bg-[#f1f0eb] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#f1f0eb] [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_th]:border [&_th]:border-[#e8e5dd] [&_th]:bg-[#f5f4f0] [&_th]:p-2 [&_th]:font-semibold [&_td]:border [&_td]:border-[#e8e5dd] [&_td]:p-2 [&_hr]:my-4 [&_hr]:border-[#e8e5dd]">
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
            </div>
          )}
        </div>

        <form
          onSubmit={handleSendMessage}
          className="border-t border-[#e8e5dd] bg-white px-6 py-5"
        >
          <div className="mx-auto flex w-full max-w-3xl items-end gap-3">
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
              placeholder={
                selectedConversationId
                  ? "Escribe tu mensaje..."
                  : "Selecciona o crea una conversación para escribir."
              }
              disabled={!selectedConversationId || sendingMessage}
              rows={2}
              className="min-h-12 flex-1 resize-none rounded-xl border border-[#dedbd2] bg-[#faf9f6] px-4 py-3 text-sm outline-none transition placeholder:text-[#92948d] focus:border-[#39765a] disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={
                !selectedConversationId || !newMessage.trim() || sendingMessage
              }
              className="rounded-xl bg-[#39765a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f634a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingMessage ? "Enviando..." : "Enviar"}
            </button>
          </div>

          {sendingError && (
            <p
              role="alert"
              className="mx-auto mt-2 w-full max-w-3xl text-xs text-red-600"
            >
              {sendingError}
            </p>
          )}

          <p className="mx-auto mt-2 w-full max-w-3xl text-xs text-[#92948d]">
            Consulta recetas, técnicas culinarias y consejos gastronómicos.
          </p>
        </form>
      </section>
    </main>
  );
}
