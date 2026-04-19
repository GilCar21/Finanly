import React, { useMemo } from "react";
import { Transaction } from "@/lib/firebase";
import { formatCurrency } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreditCard, AlertTriangle, CheckCircle2, TrendingDown, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface InstallmentsTrackerProps {
  transactions: Transaction[];
}

interface ParsedInstallment {
  tx: Transaction;
  current: number;
  total: number;
  remaining: number;
  monthlyAmount: number;
  progressPct: number;
}

/**
 * Parse the installments string. Accepts formats like:
 * "2 de 9", "2/9", "3 of 12", "4 de 10"
 * Returns { current, total } or null if unparseable.
 */
function parseInstallments(raw: string | undefined): { current: number; total: number } | null {
  if (!raw || raw.trim() === "") return null;
  // Match patterns: "N de M", "N/M", "N of M"
  const match = raw.match(/(\d+)\s*(?:de|of|\/)\s*(\d+)/i);
  if (!match) return null;
  const current = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (isNaN(current) || isNaN(total) || total === 0 || current > total) return null;
  return { current, total };
}

export default function InstallmentsTracker({ transactions }: InstallmentsTrackerProps) {
  // Parse all transactions that have valid installments
  const installments: ParsedInstallment[] = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "expense" && tx.installments)
      .map((tx) => {
        const parsed = parseInstallments(tx.installments);
        if (!parsed) return null;
        const { current, total } = parsed;
        const remaining = total - current;
        return {
          tx,
          current,
          total,
          remaining,
          monthlyAmount: tx.amount,
          progressPct: (current / total) * 100,
        };
      })
      .filter(Boolean) as ParsedInstallment[];
  }, [transactions]);

  // Sort: most remaining first (biggest burden), then by amount desc
  const sorted = useMemo(
    () =>
      [...installments].sort((a, b) => {
        if (b.remaining !== a.remaining) return b.remaining - a.remaining;
        return b.monthlyAmount - a.monthlyAmount;
      }),
    [installments]
  );

  // Projection: next 6 months
  const projection = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const projMonth = addMonths(now, i);
      const label = format(projMonth, "MMM/yy", { locale: ptBR });
      // For each installment, check if it will still be active in this month
      // "current" = parcela deste mês. Month +1 = parcela current+1, etc.
      const committed = installments.reduce((acc, inst) => {
        const futureParcel = inst.current + i;
        if (futureParcel <= inst.total) {
          return acc + inst.monthlyAmount;
        }
        return acc;
      }, 0);
      return { label, committed, month: i };
    });
  }, [installments]);

  const totalMonthlyCommitment = installments.reduce((acc, i) => acc + i.monthlyAmount, 0);
  const totalRemainingDebt = installments.reduce(
    (acc, i) => acc + i.monthlyAmount * i.remaining,
    0
  );
  const longestInstallment = sorted[0];

  // Color for progress bar based on how much is left
  function progressColor(pct: number) {
    if (pct >= 80) return "hsl(145, 63%, 45%)"; // green — almost done
    if (pct >= 50) return "hsl(47, 96%, 50%)";  // yellow — halfway
    return "hsl(0, 84%, 55%)";                  // red — still a lot left
  }

  // Color for projection bars
  function barColor(month: number) {
    if (month === 0) return "hsl(217, 91%, 50%)";
    const fade = Math.min(month * 15, 60);
    return `hsl(217, 91%, ${50 + fade}%)`;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-xl px-3 py-2 text-xs shadow-xl"
          style={{ background: "hsl(220,20%,15%)", color: "white", minWidth: 160 }}
        >
          <div className="font-semibold mb-1 text-white/80">{label}</div>
          <div className="flex justify-between gap-4">
            <span className="text-white/60">Parcelas comprometidas</span>
            <span className="font-bold text-blue-300">{formatCurrency(payload[0].value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="border-none shadow-sm overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(217,91%,25%), hsl(217,91%,45%))" }}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-blue-200 text-xs font-medium">Compromisso Mensal</p>
                <p className="text-white text-2xl font-bold">{formatCurrency(totalMonthlyCommitment)}</p>
                <p className="text-blue-300 text-xs mt-0.5">em {installments.length} parcelamento{installments.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-rose-50/80">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100">
                <TrendingDown className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-rose-500 text-xs font-medium">Dívida Restante Total</p>
                <p className="text-rose-700 text-2xl font-bold">{formatCurrency(totalRemainingDebt)}</p>
                <p className="text-rose-400 text-xs mt-0.5">soma de todas as parcelas futuras</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-amber-50/80">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <Layers className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-amber-600 text-xs font-medium">Maior Parcelamento</p>
                <p className="text-amber-800 text-lg font-bold truncate max-w-[160px]">
                  {longestInstallment ? longestInstallment.tx.description : "—"}
                </p>
                {longestInstallment && (
                  <p className="text-amber-500 text-xs mt-0.5">
                    {longestInstallment.remaining} parcela{longestInstallment.remaining !== 1 ? "s" : ""} restante{longestInstallment.remaining !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installments timeline */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            Linha do Tempo de Parcelamentos
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cada barra mostra o progresso de pagamento. Verde = quase quitado.
          </p>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-sm flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-zinc-300" />
              <p>Nenhum parcelamento encontrado.</p>
              <p className="text-xs">Adicione transações com o campo "Parcelas" preenchido (ex: "3 de 12").</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((inst) => {
                const pct = inst.progressPct;
                const color = progressColor(pct);
                return (
                  <div key={inst.tx.id || inst.tx.description} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-zinc-800 truncate max-w-[200px] md:max-w-xs">
                          {inst.tx.description}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ background: `${color}20`, color }}
                        >
                          {inst.current}/{inst.total}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-xs text-zinc-400">
                          {inst.remaining === 0
                            ? "✅ Quitado"
                            : `${inst.remaining} restante${inst.remaining !== 1 ? "s" : ""}`}
                        </span>
                        <span className="text-sm font-bold text-zinc-700">
                          {formatCurrency(inst.monthlyAmount)}/mês
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-3 rounded-full bg-zinc-100 overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}cc, ${color})`,
                        }}
                      />
                      {/* Tick marks */}
                      {inst.total <= 24 &&
                        Array.from({ length: inst.total - 1 }, (_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-white/60"
                            style={{ left: `${((i + 1) / inst.total) * 100}%` }}
                          />
                        ))}
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5 px-0.5">
                      <span>{format(parseISO(inst.tx.date), "dd/MM/yy")}</span>
                      <span>
                        Restam {formatCurrency(inst.monthlyAmount * inst.remaining)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6-month projection */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Impacto nos Próximos 6 Meses
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-0.5">
            Quanto das suas parcelas já assumidas comprometerá sua renda mês a mês.
          </p>
        </CardHeader>
        <CardContent>
          {installments.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-sm">
              Sem parcelamentos para projetar.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projection} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                    <XAxis
                      dataKey="label"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      style={{ textTransform: "capitalize" }}
                    />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(220,15%,96%)" }} />
                    <Bar dataKey="committed" radius={[6, 6, 0, 0]}>
                      {projection.map((entry) => (
                        <Cell key={entry.label} fill={barColor(entry.month)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Month-by-month breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {projection.map((p) => {
                  const dropping = p.month > 0 && p.committed < projection[p.month - 1]?.committed;
                  return (
                    <div
                      key={p.label}
                      className="rounded-xl px-3 py-2 flex justify-between items-center"
                      style={{
                        background: p.month === 0 ? "hsl(217,91%,97%)" : "hsl(220,15%,97%)",
                        border: `1px solid ${p.month === 0 ? "hsl(217,91%,88%)" : "hsl(220,15%,90%)"}`,
                      }}
                    >
                      <span
                        className="text-xs font-semibold capitalize"
                        style={{ color: p.month === 0 ? "hsl(217,91%,40%)" : "hsl(220,15%,45%)" }}
                      >
                        {p.label}
                        {p.month === 0 && (
                          <span className="ml-1 text-[9px] text-blue-400 font-normal">(atual)</span>
                        )}
                      </span>
                      <div className="text-right">
                        <span
                          className="text-sm font-bold"
                          style={{ color: p.month === 0 ? "hsl(217,91%,35%)" : "hsl(220,15%,30%)" }}
                        >
                          {formatCurrency(p.committed)}
                        </span>
                        {dropping && (
                          <div className="text-[10px] text-emerald-500 font-medium">
                            ↓ {formatCurrency(projection[p.month - 1].committed - p.committed)} menos
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Insight */}
              {projection[5].committed < projection[0].committed && (
                <div
                  className="rounded-xl p-3 flex items-start gap-3"
                  style={{
                    background: "hsl(145,60%,96%)",
                    border: "1px solid hsl(145,60%,85%)",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800 leading-snug">
                    <strong>Boa notícia!</strong> Seu compromisso vai cair{" "}
                    <strong>
                      {formatCurrency(projection[0].committed - projection[5].committed)}
                    </strong>{" "}
                    em 6 meses, de {formatCurrency(projection[0].committed)} para{" "}
                    {formatCurrency(projection[5].committed)}.
                  </p>
                </div>
              )}
              {projection[5].committed >= projection[0].committed && projection[0].committed > 0 && (
                <div
                  className="rounded-xl p-3 flex items-start gap-3"
                  style={{
                    background: "hsl(38,92%,96%)",
                    border: "1px solid hsl(38,92%,85%)",
                  }}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-snug">
                    <strong>Atenção!</strong> Seus parcelamentos permanecem altos pelos próximos 6 meses.
                    Pense bem antes de assumir novas parcelas.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
