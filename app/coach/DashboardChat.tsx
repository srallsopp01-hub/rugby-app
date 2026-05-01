"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  hidden?: boolean;
  ts?: string;
};

function timeLabel(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (d.toDateString() === now.toDateString()) return "Today";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function DashboardChat({
  contextString,
  initialMessage,
  initialHistory,
  onHistoryUpdate,
}: {
  contextString: string;
  initialMessage?: string;
  initialHistory?: ChatMessage[];
  onHistoryUpdate?: (messages: ChatMessage[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const init: ChatMessage[] = [];
    if (contextString) {
      init.push({ role: "user", content: contextString, hidden: true });
    }
    if (initialHistory && initialHistory.length > 0) {
      init.push(...initialHistory);
    } else if (initialMessage) {
      init.push({ role: "assistant", content: initialMessage, ts: new Date().toISOString() });
    }
    return init;
  });
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextInjected] = useState(!!contextString);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const check = () => {
      setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 60);
    };
    el.addEventListener("scroll", check);
    check();
    return () => el.removeEventListener("scroll", check);
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    if (!isStreaming) scrollToBottom();
  }, [messages, isStreaming]);

  async function send(text?: string) {
    const userText = (text ?? draft).trim();
    if (!userText || isStreaming) return;
    setDraft("");

    const userMsg: ChatMessage = { role: "user", content: userText, ts: new Date().toISOString() };
    const base = contextInjected
      ? messages
      : contextString
      ? [{ role: "user" as const, content: contextString, hidden: true }, ...messages]
      : messages;

    const nextMessages = [...base, userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "", ts: new Date().toISOString() }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
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
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && last.content === "") {
          updated[updated.length - 1] = { ...last, content: "Sorry, I couldn't get a response. Please try again." };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setMessages((prev) => {
        const visible = prev.filter((m) => !m.hidden);
        onHistoryUpdate?.(visible.slice(-30));
        return prev;
      });
    }
  }

  const visibleMessages = messages.filter((m) => !m.hidden);

  return (
    <section id="dashboard-chat" className="rounded-2xl border border-border bg-panel shadow-[var(--shadow-soft)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-sm font-semibold text-foreground-strong">Assistant coach</span>
        </div>
        <span className="text-xs text-muted">Knows your match data + training history</span>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="relative flex max-h-[400px] flex-col gap-3 overflow-y-auto px-5 py-4">
        {visibleMessages.length === 0 && (
          <p className="text-sm text-muted py-2">Ask me anything about your team&apos;s preparation or players.</p>
        )}
        {visibleMessages.map((msg, i) => {
          const isLast = i === visibleMessages.length - 1;
          return (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent text-white"
                  : "bg-panel-2 text-foreground"
              }`}>
                {msg.content || (isStreaming && isLast
                  ? <span className="flex gap-1 py-1"><span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:0ms]" /><span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" /><span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" /></span>
                  : null)}
              </div>
              {msg.ts && (
                <span className="mt-1 text-[10px] text-muted-2">{timeLabel(msg.ts)}</span>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <div className="flex justify-center pb-1">
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); scrollToBottom(); }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-panel-2 text-muted shadow hover:text-foreground transition"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-4 pb-4 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask your assistant coach…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted disabled:opacity-50 focus:outline-none focus:border-border-light"
          />
          <button
            type="button"
            onClick={(e) => { e.currentTarget.blur(); send(); }}
            disabled={!draft.trim() || isStreaming}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:opacity-90 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8l12-6-6 12V8H2z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
