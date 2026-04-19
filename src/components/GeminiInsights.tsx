import React, { useState, useCallback } from "react";
import { Transaction } from "@/lib/firebase";
import { generateInsights, Insight } from "@/services/geminiInsightsService";
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";

interface GeminiInsightsProps {
  transactions: Transaction[];
  userName: string;
}

const TYPE_CONFIG = {
  warning: {
    icon: AlertTriangle,
    bg: "hsl(38, 92%, 97%)",
    border: "hsl(38, 92%, 85%)",
    iconColor: "hsl(38, 92%, 45%)",
    titleColor: "hsl(38, 60%, 30%)",
    textColor: "hsl(38, 30%, 35%)",
    badge: "hsl(38, 92%, 50%)",
    badgeBg: "hsl(38, 92%, 92%)",
    label: "Atenção",
  },
  success: {
    icon: CheckCircle2,
    bg: "hsl(145, 60%, 97%)",
    border: "hsl(145, 60%, 82%)",
    iconColor: "hsl(145, 63%, 40%)",
    titleColor: "hsl(145, 45%, 25%)",
    textColor: "hsl(145, 20%, 35%)",
    badge: "hsl(145, 63%, 40%)",
    badgeBg: "hsl(145, 60%, 90%)",
    label: "Ótimo",
  },
  info: {
    icon: Info,
    bg: "hsl(217, 91%, 98%)",
    border: "hsl(217, 91%, 87%)",
    iconColor: "hsl(217, 91%, 50%)",
    titleColor: "hsl(217, 60%, 28%)",
    textColor: "hsl(217, 25%, 38%)",
    badge: "hsl(217, 91%, 50%)",
    badgeBg: "hsl(217, 91%, 92%)",
    label: "Info",
  },
  tip: {
    icon: Lightbulb,
    bg: "hsl(270, 70%, 98%)",
    border: "hsl(270, 70%, 85%)",
    iconColor: "hsl(270, 70%, 55%)",
    titleColor: "hsl(270, 50%, 30%)",
    textColor: "hsl(270, 20%, 38%)",
    badge: "hsl(270, 70%, 55%)",
    badgeBg: "hsl(270, 70%, 92%)",
    label: "Dica",
  },
};

// Typing animation component
function TypewriterText({ text }: { text: string }) {
  return (
    <span className="leading-relaxed">
      {text}
      <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
    </span>
  );
}

// Skeleton loader for a single insight card
function InsightSkeleton() {
  return (
    <div
      className="rounded-2xl p-4 flex gap-3 animate-pulse"
      style={{ background: "hsl(220,15%,96%)", border: "1px solid hsl(220,15%,90%)" }}
    >
      <div className="w-8 h-8 rounded-xl bg-zinc-200 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-zinc-200 rounded w-1/3" />
        <div className="h-3 bg-zinc-200 rounded w-full" />
        <div className="h-3 bg-zinc-200 rounded w-4/5" />
      </div>
    </div>
  );
}

export default function GeminiInsights({ transactions, userName }: GeminiInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setInsights([]);
    setError(null);
    setStreamText("");
    setGenerated(false);

    try {
      const result = await generateInsights(
        transactions,
        userName,
        (text) => setStreamText(text)
      );

      if (result.length === 0) {
        setError(
          transactions.length === 0
            ? "Adicione algumas transações para que o Gemini possa analisá-las."
            : "Não foi possível gerar insights no momento. Verifique a API Key e tente novamente."
        );
      } else {
        setInsights(result);
        setGenerated(true);
      }
    } catch {
      setError("Erro ao conectar com o Gemini. Tente novamente.");
    } finally {
      setLoading(false);
      setStreamText("");
    }
  }, [transactions, userName]);

  return (
    <Card className="border-zinc-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, hsl(270,70%,22%) 0%, hsl(217,91%,35%) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base leading-tight">Dicas do Gemini</h3>
            <p className="text-purple-200 text-xs mt-0.5">
              Análise inteligente dos seus dados financeiros
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          style={{
            background: loading ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(8px)",
          }}
          title={generated ? "Gerar novos insights" : "Analisar meus dados"}
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Analisando..." : generated ? "Atualizar" : "Analisar"}
        </button>
      </div>

      <CardContent className="p-5">
        {/* Initial state */}
        {!loading && !generated && !error && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(270,70%,96%)" }}
            >
              <Sparkles className="w-7 h-7" style={{ color: "hsl(270,70%,55%)" }} />
            </div>
            <div>
              <p className="text-zinc-700 font-medium text-sm">
                Descubra padrões nos seus gastos
              </p>
              <p className="text-zinc-400 text-xs mt-0.5 max-w-xs">
                O Gemini analisa suas transações e gera insights personalizados sobre seus hábitos financeiros.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(270,70%,45%), hsl(217,91%,50%))",
              }}
            >
              ✨ Gerar Insights Agora
            </button>
          </div>
        )}

        {/* Streaming / loading state */}
        {loading && (
          <div className="space-y-3">
            {streamText ? (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "hsl(270,70%,98%)",
                  border: "1px solid hsl(270,70%,88%)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" style={{ color: "hsl(270,70%,55%)" }} />
                  <span className="text-xs font-semibold" style={{ color: "hsl(270,60%,40%)" }}>
                    Gemini está pensando...
                  </span>
                </div>
                <TypewriterText text="Analisando seus dados financeiros e gerando insights personalizados..." />
              </div>
            ) : (
              <>
                <InsightSkeleton />
                <InsightSkeleton />
                <InsightSkeleton />
              </>
            )}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{
              background: "hsl(0,84%,98%)",
              border: "1px solid hsl(0,84%,88%)",
            }}
          >
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700">Não foi possível gerar insights</p>
              <p className="text-xs text-rose-500 mt-0.5">{error}</p>
              <button
                onClick={handleGenerate}
                className="mt-2 text-xs font-semibold text-rose-600 underline underline-offset-2 hover:text-rose-800"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Insights */}
        {!loading && insights.length > 0 && (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const cfg = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.info;
              const Icon = cfg.icon;

              return (
                <div
                  key={i}
                  className="rounded-2xl p-4 flex gap-3 transition-all"
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: cfg.badgeBg }}
                    aria-hidden
                  >
                    {insight.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: cfg.badge }}
                      >
                        {cfg.label}
                      </span>
                      <span
                        className="font-semibold text-sm"
                        style={{ color: cfg.titleColor }}
                      >
                        {insight.title}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: cfg.textColor }}>
                      {insight.message}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Footer note */}
            <div className="flex items-center gap-1.5 pt-1">
              <Sparkles className="w-3 h-3 text-zinc-300" />
              <p className="text-xs text-zinc-400">
                Gerado pelo Gemini com base nas suas transações •{" "}
                <button
                  onClick={handleGenerate}
                  className="underline underline-offset-2 hover:text-zinc-600 transition-colors"
                >
                  atualizar
                </button>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
