"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I'm your FYNL Whistle assistant. Ask me anything about how to use the app — capturing matches, understanding grades, setting up your squad, or reading your stats.",
};

export function FloatingHelpChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isCapture = pathname?.includes("/capture");

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...nextMessages, assistantMsg]);

    try {
      const res = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && last.content === "") {
          updated[updated.length - 1] = {
            ...last,
            content: "Sorry, I couldn't connect right now. Please try again.",
          };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open help chat"
        className={`fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-border-light bg-panel-3 text-muted shadow-[var(--shadow-panel)] transition-all duration-150 hover:-translate-y-0.5 hover:text-foreground hover:shadow-[var(--shadow-soft)] ${isCapture ? "opacity-60" : ""}`}
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5a7.5 7.5 0 1 0 7.5 7.5A7.5 7.5 0 0 0 9 1.5zm0 11.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm.75-3.75a.75.75 0 0 1-1.5 0V8.25a.75.75 0 0 1 1.5 0v.75zm-.75-4.5a2.25 2.25 0 0 0-2.03 3.22.75.75 0 1 1-1.35.66A3.75 3.75 0 1 1 12.75 9a.75.75 0 0 1-1.5 0 2.25 2.25 0 0 0-2.25-4.5z" fill="currentColor"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[480px] w-[360px] flex-col rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground-strong">FYNL Whistle Help</p>
              <p className="text-[10px] text-muted">Ask anything about the app</p>
            </div>
            <button
              onClick={close}
              aria-label="Close chat"
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-panel-3 text-foreground"
                      : "bg-panel-2 text-foreground"
                  }`}
                >
                  {msg.content || (
                    <span className="animate-pulse text-muted">Thinking…</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question…"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-foreground placeholder:text-muted-2 focus:border-border-light focus:outline-none disabled:opacity-50"
                style={{ maxHeight: 96 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || streaming}
                aria-label="Send message"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-panel-3 text-muted transition-colors hover:text-foreground disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-[9px] text-muted-2">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </>
  );
}
