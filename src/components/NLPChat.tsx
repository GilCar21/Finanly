import React, { useState, useRef, useEffect, useCallback } from "react";
import { Transaction } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { processNaturalLanguage, NLPResult, ParsedTransaction } from "@/services/nlpService";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/constants";
import {
  Sparkles,
  Send,
  X,
  CheckCircle2,
  Receipt,
  MessageSquare,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  StopCircle,
} from "lucide-react";
import { toast } from "sonner";

// ── Web Speech API types ─────────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ── Voice hook ───────────────────────────────────────────────────────────────
type VoiceState = "idle" | "listening" | "processing" | "unsupported";

// How long (ms) to wait after the last speech fragment before auto-sending
const SILENCE_TIMEOUT_MS = 1500;

function useVoiceInput(onTranscript: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Accumulate all final chunks across continuous results
  const accumulatedRef = useRef("");
  // Timer that fires when user pauses long enough
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  /** Stop recognition and dispatch the accumulated transcript */
  const commitAndSend = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    const text = accumulatedRef.current.trim();
    accumulatedRef.current = "";
    setInterimText("");
    if (text) {
      setVoiceState("processing");
      onTranscript(text);
    } else {
      setVoiceState("idle");
    }
  }, [onTranscript]);

  /** Called by the mic button to manually stop and send */
  const stopListening = useCallback(() => {
    commitAndSend();
  }, [commitAndSend]);

  /** Reset back to idle — called externally after processing finishes */
  const resetVoiceState = useCallback(() => {
    setVoiceState("idle");
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }

    // Clean up any previous instance
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try { recognitionRef.current.abort(); } catch {}
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    accumulatedRef.current = "";

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "pt-BR";
    // continuous keeps the mic open across pauses
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setVoiceState("listening");
      setInterimText("");
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          accumulatedRef.current += (accumulatedRef.current ? " " : "") + transcript;
        } else {
          interim += transcript;
        }
      }
      // Show what we have so far + interim in the input preview
      const preview = (accumulatedRef.current + (interim ? " " + interim : "")).trim();
      setInterimText(preview);

      // Reset the silence timer on every new result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        commitAndSend();
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      // "no-speech" fires when continuous mode detects nothing — ignore it
      if (e.error !== "no-speech") {
        if (e.error === "not-allowed") {
          toast.error("Permissão de microfone negada. Autorize nas configurações do navegador.");
        } else {
          toast.error(`Erro de voz: ${e.error}`);
        }
        setVoiceState("idle");
        setInterimText("");
        accumulatedRef.current = "";
      }
    };

    recognition.onend = () => {
      // Only reset if we're NOT waiting for processing (commitAndSend sets "processing")
      setVoiceState((s) => (s === "listening" ? "idle" : s));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, commitAndSend]);

  return { voiceState, interimText, startListening, stopListening, resetVoiceState, isSupported };
}

// ── Sound wave animation ─────────────────────────────────────────────────────
function SoundWave() {
  return (
    <div className="flex items-center justify-center gap-0.5 h-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            background: "hsl(0,84%,60%)",
            animation: `soundwave 0.8s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.1}s`,
            height: `${8 + (i % 3) * 6}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes soundwave {
          0%   { transform: scaleY(0.4); opacity: 0.6; }
          100% { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

// ── Props & Message types ────────────────────────────────────────────────────
interface NLPChatProps {
  transactions: Transaction[];
  userId: string;
  sharedWith: string[];
  userName: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  type?: "query_answer" | "transaction_preview" | "error" | "unknown";
  pendingTx?: ParsedTransaction;
  timestamp: Date;
  /** true when this message was sent via voice */
  viaVoice?: boolean;
}

const SUGGESTIONS = [
  "Gastei 45 reais no posto hoje",
  "Quanto gastei com lazer este mês?",
  "Recebi 3500 de salário hoje",
];

// ── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full animate-bounce"
          style={{
            background: "hsl(270,70%,60%)",
            animationDelay: `${i * 150}ms`,
            animationDuration: "800ms",
          }}
        />
      ))}
    </div>
  );
}

// ── Transaction preview card ─────────────────────────────────────────────────
function TransactionPreviewCard({
  tx,
  onConfirm,
  onCancel,
  confirmationText,
  saving,
}: {
  tx: ParsedTransaction;
  onConfirm: () => void;
  onCancel: () => void;
  confirmationText?: string;
  saving: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ border: "1px solid hsl(217,91%,88%)", background: "hsl(217,91%,98%)" }}
    >
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "hsl(217,91%,93%)" }}>
        <Receipt className="w-4 h-4" style={{ color: "hsl(217,91%,45%)" }} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "hsl(217,91%,35%)" }}>
          Nova Transação Detectada
        </span>
      </div>

      <div className="px-4 py-3 space-y-1.5">
        {[
          ["Descrição", tx.description],
          ["Valor", formatCurrency(tx.amount)],
          ["Data", format(parseISO(tx.date), "dd/MM/yyyy", { locale: ptBR })],
          ["Categoria", tx.category],
          ["Tipo", tx.type === "expense" ? "💸 Despesa" : "💰 Receita"],
          ["Pagamento", tx.paymentMethod],
          ...(tx.installments ? [["Parcelas", tx.installments]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center text-sm">
            <span className="text-zinc-500 text-xs">{label}</span>
            <span className="font-semibold text-zinc-800">{value}</span>
          </div>
        ))}
      </div>

      {confirmationText && (
        <p className="px-4 pb-2 text-xs" style={{ color: "hsl(217,60%,40%)" }}>
          {confirmationText}
        </p>
      )}

      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "hsl(145,63%,42%)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? "Salvando..." : "Confirmar e Salvar"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-2 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function NLPChat({ transactions, userId, sharedWith, userName }: NLPChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstName = userName.split(" ")[0];

  // ── Voice ──
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInput(text);
      // Auto-send after a short delay so the user can see what was transcribed
      setTimeout(() => {
        handleSend(text);
      }, 600);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, userName]
  );

  const { voiceState, interimText, startListening, stopListening, resetVoiceState, isSupported } =
    useVoiceInput(handleVoiceTranscript);

  const isListening = voiceState === "listening";
  const isVoiceProcessing = voiceState === "processing";

  // ── Welcome ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            text: `Olá, ${firstName}! 👋 Sou seu assistente financeiro.\n\nDigite ou 🎤 **fale** uma mensagem — posso **registrar transações** ou **responder perguntas** sobre seus dados!`,
            type: "query_answer",
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [isOpen]);

  // ── Scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, interimText]);

  // ── Send ──
  const handleSend = useCallback(
    async (text?: string) => {
      const userText = (text ?? input).trim();
      if (!userText || loading) return;

      setInput("");
      const userMsg: Message = {
        id: Date.now() + "-user",
        role: "user",
        text: userText,
        timestamp: new Date(),
        viaVoice: voiceState === "processing",
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const result: NLPResult = await processNaturalLanguage(userText, transactions, userName);

        let assistantMsg: Message;
        if (result.intent === "create_transaction" && result.transaction) {
          assistantMsg = {
            id: Date.now() + "-assistant",
            role: "assistant",
            text: result.confirmationText ?? "Encontrei os dados da transação. Confirma?",
            type: "transaction_preview",
            pendingTx: result.transaction,
            timestamp: new Date(),
          };
        } else if (result.intent === "query" && result.answer) {
          assistantMsg = {
            id: Date.now() + "-assistant",
            role: "assistant",
            text: result.answer,
            type: "query_answer",
            timestamp: new Date(),
          };
        } else {
          assistantMsg = {
            id: Date.now() + "-assistant",
            role: "assistant",
            text:
              result.suggestion ??
              "Não entendi bem. Tente: 'Gastei R$ 50 no mercado hoje' ou 'Quanto gastei com lazer?'",
            type: "unknown",
            timestamp: new Date(),
          };
        }
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + "-err",
            role: "assistant",
            text: "Erro ao processar sua mensagem. Tente novamente.",
            type: "error",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
        // Always unlock the mic so the user can record again
        resetVoiceState();
      }
    },
    [input, loading, transactions, userName, voiceState, resetVoiceState]
  );

  // ── Confirm / Cancel transaction ──
  const handleConfirmTransaction = useCallback(
    async (msgId: string, tx: ParsedTransaction) => {
      setSavingId(msgId);
      try {
        await addDoc(collection(db, "transactions"), { ...tx, userId, sharedWith });
        toast.success(`✅ "${tx.description}" salvo com sucesso!`);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  type: "query_answer" as const,
                  text: `✅ Pronto! Registrei **${formatCurrency(tx.amount)}** em **${tx.description}** (${tx.category}) no dia ${format(parseISO(tx.date), "dd/MM", { locale: ptBR })}.`,
                  pendingTx: undefined,
                }
              : m
          )
        );
      } catch {
        toast.error("Erro ao salvar transação");
      } finally {
        setSavingId(null);
      }
    },
    [userId, sharedWith]
  );

  const handleCancelTransaction = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              type: "query_answer" as const,
              text: "Tudo bem! Cancelei o registro. Posso ajudar com mais alguma coisa?",
              pendingTx: undefined,
            }
          : m
      )
    );
  }, []);

  // ── Mic button handler ──
  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ── Render message ──
  function renderMessage(msg: Message) {
    if (msg.role === "user") {
      return (
        <div key={msg.id} className="flex justify-end items-end gap-1.5">
          {msg.viaVoice && (
            <span className="text-[10px] text-zinc-400 mb-1 flex items-center gap-0.5">
              <Mic className="w-2.5 h-2.5" /> voz
            </span>
          )}
          <div
            className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm text-white"
            style={{ background: "linear-gradient(135deg, hsl(270,70%,45%), hsl(217,91%,50%))" }}
          >
            {msg.text}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className="flex justify-start gap-2">
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1"
          style={{ background: "linear-gradient(135deg, hsl(270,70%,45%), hsl(217,91%,50%))" }}
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="max-w-[80%] space-y-2">
          {msg.type !== "transaction_preview" || !msg.pendingTx ? (
            <div
              className="px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed"
              style={{
                background:
                  msg.type === "error"
                    ? "hsl(0,84%,97%)"
                    : msg.type === "unknown"
                    ? "hsl(38,92%,97%)"
                    : "hsl(220,15%,96%)",
                color:
                  msg.type === "error"
                    ? "hsl(0,60%,40%)"
                    : msg.type === "unknown"
                    ? "hsl(38,60%,35%)"
                    : "hsl(220,15%,25%)",
                border:
                  msg.type === "error"
                    ? "1px solid hsl(0,84%,88%)"
                    : msg.type === "unknown"
                    ? "1px solid hsl(38,92%,85%)"
                    : "none",
              }}
            >
              {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={i}>{part.slice(2, -2)}</strong>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </div>
          ) : null}

          {msg.type === "transaction_preview" && msg.pendingTx && (
            <TransactionPreviewCard
              tx={msg.pendingTx}
              onConfirm={() => handleConfirmTransaction(msg.id, msg.pendingTx!)}
              onCancel={() => handleCancelTransaction(msg.id)}
              confirmationText={msg.text}
              saving={savingId === msg.id}
            />
          )}

          <span className="text-[10px] text-zinc-400 pl-1">
            {format(msg.timestamp, "HH:mm")}
          </span>
        </div>
      </div>
    );
  }

  // ── JSX ──
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, hsl(270,70%,45%), hsl(217,91%,50%))",
          boxShadow: "0 8px 32px hsla(270,70%,45%,0.4)",
        }}
        aria-label="Assistente Financeiro"
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            height: "540px",
            border: "1px solid hsl(220,15%,88%)",
            background: "white",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(270,70%,28%), hsl(217,91%,38%))" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Assistente Financeiro</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-purple-200 text-xs">Powered by Gemini</p>
                  {isSupported && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(255,255,255,0.2)", color: "hsl(145,60%,80%)" }}
                    >
                      🎤 voz ativada
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Listening overlay banner */}
          {isListening && (
            <div
              className="flex items-center justify-between px-4 py-2 flex-shrink-0"
              style={{ background: "hsl(0,84%,97%)", borderBottom: "1px solid hsl(0,84%,88%)" }}
            >
              <div className="flex items-center gap-2">
                <SoundWave />
                <span className="text-xs font-semibold text-rose-600">
                  {interimText ? `"${interimText}"` : "Ouvindo... fale agora"}
                </span>
              </div>
              <button
                onClick={stopListening}
                className="text-xs text-rose-500 font-semibold flex items-center gap-1 hover:text-rose-700"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Parar
              </button>
            </div>
          )}

          {/* Processing voice banner */}
          {isVoiceProcessing && (
            <div
              className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
              style={{ background: "hsl(270,70%,97%)", borderBottom: "1px solid hsl(270,70%,88%)" }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "hsl(270,70%,55%)" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(270,60%,40%)" }}>
                Processando áudio...
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
            {messages.map(renderMessage)}

            {loading && (
              <div className="flex justify-start gap-2">
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(270,70%,45%), hsl(217,91%,50%))" }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-bl-md" style={{ background: "hsl(220,15%,96%)" }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && !loading && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all hover:bg-zinc-50 whitespace-nowrap"
                  style={{ border: "1px solid hsl(220,15%,88%)", color: "hsl(220,15%,45%)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div
            className="px-3 pb-3 pt-2 flex-shrink-0"
            style={{ borderTop: "1px solid hsl(220,15%,92%)" }}
          >
            <div
              className="flex items-center gap-2 rounded-2xl px-3 py-2 transition-all"
              style={{
                background: isListening ? "hsl(0,84%,98%)" : "hsl(220,15%,97%)",
                border: isListening
                  ? "1px solid hsl(0,84%,80%)"
                  : "1px solid hsl(220,15%,88%)",
              }}
            >
              {/* Mic button */}
              {isSupported && (
                <button
                  onClick={handleMicClick}
                  disabled={loading || isVoiceProcessing}
                  title={isListening ? "Parar gravação" : "Falar para o assistente"}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 hover:opacity-90 disabled:opacity-40"
                  style={{
                    background: isListening
                      ? "hsl(0,84%,55%)"
                      : "hsl(270,70%,95%)",
                  }}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4" style={{ color: "hsl(270,70%,50%)" }} />
                  )}
                </button>
              )}

              <input
                ref={inputRef}
                value={isListening ? interimText : input}
                onChange={(e) => !isListening && setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isListening) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isListening
                    ? "Ouvindo..."
                    : isSupported
                    ? "Digite ou clique no 🎤 para falar..."
                    : "Ex: Gastei 45 reais no posto hoje..."
                }
                className="flex-1 bg-transparent text-sm outline-none text-zinc-800 placeholder:text-zinc-400"
                disabled={loading || isListening}
                readOnly={isListening}
              />

              {/* Send button */}
              <button
                onClick={() => handleSend()}
                disabled={(!input.trim() && !isListening) || loading || isListening}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                style={{
                  background:
                    input.trim() && !isListening
                      ? "linear-gradient(135deg, hsl(270,70%,45%), hsl(217,91%,50%))"
                      : "hsl(220,15%,88%)",
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-zinc-400 mt-1.5">
              {isSupported
                ? "🎤 Fale ou digite • Gemini pode cometer erros, confirme antes de salvar"
                : "Gemini pode cometer erros. Confirme antes de salvar."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
