import React, { useState, useMemo } from "react";
import { Transaction } from "@/lib/firebase";
import { formatCurrency } from "@/lib/constants";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
  subMonths,
  addMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Flame, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface SpendingHeatmapProps {
  transactions: Transaction[];
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getHeatColor(ratio: number): string {
  // ratio: 0 (no spending) to 1 (max spending)
  if (ratio === 0) return "hsl(220, 15%, 94%)";
  if (ratio <= 0.2) return "hsl(217, 91%, 88%)";
  if (ratio <= 0.4) return "hsl(217, 91%, 75%)";
  if (ratio <= 0.6) return "hsl(217, 91%, 60%)";
  if (ratio <= 0.8) return "hsl(217, 91%, 45%)";
  return "hsl(217, 91%, 30%)";
}

function getHeatLabel(ratio: number): string {
  if (ratio === 0) return "Sem gastos";
  if (ratio <= 0.2) return "Muito baixo";
  if (ratio <= 0.4) return "Baixo";
  if (ratio <= 0.6) return "Moderado";
  if (ratio <= 0.8) return "Alto";
  return "Muito alto";
}

export default function SpendingHeatmap({ transactions }: SpendingHeatmapProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tooltip, setTooltip] = useState<{
    day: Date;
    amount: number;
    txCount: number;
    x: number;
    y: number;
  } | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Expenses only
  const monthTransactions = useMemo(() =>
    transactions.filter((tx) => {
      const d = parseISO(tx.date);
      return isSameMonth(d, currentDate) && tx.type === "expense";
    }), [transactions, currentDate]);

  // Map each day to its total spending
  const daySpending = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of monthTransactions) {
      const key = tx.date.slice(0, 10);
      map[key] = (map[key] || 0) + tx.amount;
    }
    return map;
  }, [monthTransactions]);

  const maxSpending = useMemo(
    () => Math.max(0, ...(Object.values(daySpending) as number[])),
    [daySpending]
  );

  // Day-of-week pattern analysis
  const weekdayPattern = useMemo(() => {
    const totals = Array(7).fill(0);
    const counts = Array(7).fill(0);
    for (const tx of monthTransactions) {
      const d = parseISO(tx.date);
      const dow = getDay(d);
      totals[dow] += tx.amount;
      counts[dow]++;
    }
    return totals.map((total, i) => ({ day: WEEKDAYS[i], total, avg: counts[i] > 0 ? total / counts[i] : 0 }));
  }, [monthTransactions]);

  const maxWeekdayTotal = Math.max(0, ...weekdayPattern.map((d) => d.total));

  // Calendar grid: pad start
  const startDow = getDay(monthStart); // 0 = Sunday
  const calendarCells: (Date | null)[] = [
    ...Array(startDow).fill(null),
    ...daysInMonth,
  ];

  // Stats
  const totalMonthExpense = (Object.values(daySpending) as number[]).reduce((a, b) => a + b, 0);
  const highestDay = (Object.entries(daySpending) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
  const avgPerDay = totalMonthExpense / (daysInMonth.length || 1);

  function handleMouseEnter(e: React.MouseEvent, day: Date) {
    const key = format(day, "yyyy-MM-dd");
    const amount = daySpending[key] || 0;
    const txCount = monthTransactions.filter((tx) => isSameDay(parseISO(tx.date), day)).length;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const parentRect = (e.currentTarget as HTMLElement).closest(".heatmap-grid")?.getBoundingClientRect();
    setTooltip({
      day,
      amount,
      txCount,
      x: rect.left - (parentRect?.left || 0) + rect.width / 2,
      y: rect.top - (parentRect?.top || 0),
    });
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div
          style={{
            background: "linear-gradient(135deg, hsl(217,91%,25%) 0%, hsl(217,91%,45%) 100%)",
          }}
          className="px-6 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
              className="p-2 rounded-xl"
            >
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Mapa de Calor de Gastos</h2>
              <p className="text-blue-200 text-xs">Identifique padrões de comportamento financeiro</p>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate((d) => subMonths(d, 1))}
              className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-semibold text-sm min-w-[130px] text-center capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentDate((d) => addMonths(d, 1))}
              className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 divide-x divide-zinc-100">
          <div className="px-4 py-3">
            <p className="text-xs text-zinc-400 font-medium">Total do Mês</p>
            <p className="text-lg font-bold text-zinc-800 mt-0.5">{formatCurrency(totalMonthExpense)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-zinc-400 font-medium">Maior Gasto</p>
            <p className="text-lg font-bold text-zinc-800 mt-0.5">
              {highestDay ? formatCurrency(highestDay[1]) : "—"}
            </p>
            {highestDay && (
              <p className="text-xs text-zinc-400">
                {format(parseISO(highestDay[0]), "dd/MM", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-zinc-400 font-medium">Média por Dia</p>
            <p className="text-lg font-bold text-zinc-800 mt-0.5">{formatCurrency(avgPerDay)}</p>
          </div>
        </div>

        <CardContent className="pb-5 pt-2 px-5">
          {/* Calendar grid */}
          <div className="heatmap-grid relative">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="text-center text-xs text-zinc-400 font-medium py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} />;
                }
                const key = format(day, "yyyy-MM-dd");
                const amount = daySpending[key] || 0;
                const ratio = maxSpending > 0 ? amount / maxSpending : 0;
                const isToday = isSameDay(day, new Date());
                const bg = getHeatColor(ratio);

                return (
                  <div
                    key={key}
                    className="relative aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110"
                    style={{
                      background: bg,
                      boxShadow: isToday ? "0 0 0 2px hsl(217,91%,45%)" : undefined,
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, day)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <span
                      className="text-xs font-semibold leading-none"
                      style={{ color: ratio > 0.5 ? "white" : "hsl(220,15%,35%)" }}
                    >
                      {format(day, "d")}
                    </span>
                    {amount > 0 && (
                      <div
                        className="w-1 h-1 rounded-full mt-0.5"
                        style={{ background: ratio > 0.5 ? "rgba(255,255,255,0.7)" : "hsl(217,91%,50%)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  left: tooltip.x,
                  top: tooltip.y - 8,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div
                  className="rounded-xl px-3 py-2 text-xs shadow-xl border border-white/10 min-w-[150px]"
                  style={{
                    background: "hsl(220,20%,15%)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div className="font-semibold text-white/90 mb-1">
                    {format(tooltip.day, "EEEE, dd/MM", { locale: ptBR })}
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">Gastos</span>
                    <span className="font-bold text-blue-300">{formatCurrency(tooltip.amount)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">Transações</span>
                    <span className="font-semibold">{tooltip.txCount}</span>
                  </div>
                  <div className="mt-1 text-center">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        color: "hsl(217,91%,75%)",
                      }}
                    >
                      {getHeatLabel(maxSpending > 0 ? tooltip.amount / maxSpending : 0)}
                    </span>
                  </div>
                </div>
                <div
                  className="w-2 h-2 mx-auto -mt-1 rotate-45"
                  style={{ background: "hsl(220,20%,15%)" }}
                />
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-xs text-zinc-400">Menor</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
              <div
                key={r}
                className="w-5 h-5 rounded-md"
                style={{ background: getHeatColor(r) }}
              />
            ))}
            <span className="text-xs text-zinc-400">Maior</span>
          </div>
        </CardContent>
      </Card>

      {/* Day-of-week pattern analysis */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Padrão por Dia da Semana
            <span className="text-xs font-normal text-zinc-400 ml-auto">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {maxWeekdayTotal > 0 ? (
            <div className="space-y-2">
              {weekdayPattern.map(({ day, total, avg }) => {
                const ratio = maxWeekdayTotal > 0 ? total / maxWeekdayTotal : 0;
                const isWeekend = day === "Dom" || day === "Sáb";
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold w-8 text-right"
                      style={{ color: isWeekend ? "hsl(217,91%,45%)" : "hsl(220,15%,40%)" }}
                    >
                      {day}
                    </span>
                    <div className="flex-1 h-6 rounded-md overflow-hidden bg-zinc-100 relative">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${ratio * 100}%`,
                          background: isWeekend
                            ? "linear-gradient(90deg, hsl(217,91%,60%), hsl(217,91%,40%))"
                            : "linear-gradient(90deg, hsl(220,15%,70%), hsl(220,15%,55%))",
                        }}
                      />
                      {total > 0 && (
                        <span
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold"
                          style={{ color: ratio > 0.5 ? "white" : "hsl(220,15%,35%)" }}
                        >
                          {formatCurrency(avg)}
                          <span className="font-normal text-zinc-400 ml-1">/dia</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 w-24 text-right font-medium">
                      {formatCurrency(total)}
                    </span>
                  </div>
                );
              })}

              {/* Weekend insight */}
              {(() => {
                const weekendTotal = weekdayPattern
                  .filter((d) => d.day === "Sáb" || d.day === "Dom")
                  .reduce((acc, d) => acc + d.total, 0);
                const weekdayTotal = weekdayPattern
                  .filter((d) => d.day !== "Sáb" && d.day !== "Dom")
                  .reduce((acc, d) => acc + d.total, 0);
                const weekendAvg = weekdayPattern
                  .filter((d) => d.day === "Sáb" || d.day === "Dom")
                  .reduce((acc, d) => acc + d.avg, 0) / 2;
                const weekdayAvg = weekdayPattern
                  .filter((d) => d.day !== "Sáb" && d.day !== "Dom")
                  .reduce((acc, d) => acc + d.avg, 0) / 5;

                if (weekendAvg === 0 && weekdayAvg === 0) return null;
                const diff = weekdayAvg > 0 ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100 : 0;

                return (
                  <div
                    className="mt-3 rounded-xl p-3 flex items-center gap-3"
                    style={{
                      background: Math.abs(diff) > 10
                        ? "hsl(217,91%,97%)"
                        : "hsl(145,60%,96%)",
                      border: `1px solid ${Math.abs(diff) > 10 ? "hsl(217,91%,88%)" : "hsl(145,60%,85%)"}`,
                    }}
                  >
                    <Calendar
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: diff > 10 ? "hsl(217,91%,45%)" : "hsl(145,60%,40%)" }}
                    />
                    <p
                      className="text-xs leading-snug"
                      style={{ color: diff > 10 ? "hsl(217,91%,30%)" : "hsl(145,60%,30%)" }}
                    >
                      {diff > 10
                        ? `⚠️ Você gasta ${Math.abs(diff).toFixed(0)}% mais nos finais de semana — média de ${formatCurrency(weekendAvg)}/dia vs ${formatCurrency(weekdayAvg)}/dia nos dias úteis.`
                        : diff < -10
                        ? `✅ Gastos mais controlados no fim de semana — média de ${formatCurrency(weekendAvg)}/dia vs ${formatCurrency(weekdayAvg)}/dia nos dias úteis.`
                        : `✅ Padrão equilibrado — seus gastos são similares nos dias úteis e finais de semana.`}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-400 text-sm">
              Sem gastos registrados neste mês
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
