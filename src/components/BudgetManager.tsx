import React, { useState, useMemo } from "react";
import { Transaction, Budget, UserProfile, Category } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/constants";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";

interface BudgetManagerProps {
  profile: UserProfile;
  transactions: Transaction[];
  userId: string;
}

// ─── Color logic ──────────────────────────────────────────────────────────────

function getBudgetStatus(spent: number, limit: number) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  if (pct >= 100)
    return {
      pct: Math.min(pct, 100),
      color: "hsl(0, 84%, 55%)",
      trackColor: "hsl(0, 84%, 94%)",
      label: "Limite atingido!",
      icon: "🚨",
      textColor: "hsl(0, 64%, 35%)",
    };
  if (pct >= 80)
    return {
      pct,
      color: "hsl(38, 92%, 48%)",
      trackColor: "hsl(38, 92%, 94%)",
      label: "Atenção — quase no limite",
      icon: "⚠️",
      textColor: "hsl(38, 60%, 30%)",
    };
  if (pct >= 50)
    return {
      pct,
      color: "hsl(47, 96%, 48%)",
      trackColor: "hsl(47, 96%, 94%)",
      label: "No caminho certo",
      icon: "📊",
      textColor: "hsl(47, 60%, 28%)",
    };
  return {
    pct,
    color: "hsl(145, 63%, 42%)",
    trackColor: "hsl(145, 63%, 94%)",
    label: "Dentro do orçamento",
    icon: "✅",
    textColor: "hsl(145, 45%, 28%)",
  };
}

// ─── Budget form (inline) ─────────────────────────────────────────────────────

interface BudgetFormProps {
  key?: string | number;
  existing?: Budget;
  usedCategories: string[];
  allCategories: Category[];
  onSave: (b: Budget) => any;
  onCancel: () => any;
}

const BudgetForm = ({ existing, usedCategories, allCategories, onSave, onCancel }: BudgetFormProps) => {
  const [category, setCategory] = useState(existing?.category ?? "");
  const [limit, setLimit] = useState(existing?.limit?.toString() ?? "");

  const availableCategories = allCategories.filter(
    (c) => c.name === existing?.category || !usedCategories.includes(c.name)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numLimit = parseFloat(limit);
    if (!category) { toast.error("Selecione uma categoria"); return; }
    if (!numLimit || numLimit <= 0) { toast.error("Digite um valor válido"); return; }
    onSave({ category, limit: numLimit });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "hsl(217,91%,98%)", border: "1px solid hsl(217,91%,88%)" }}
    >
      <p className="text-sm font-semibold text-zinc-700">
        {existing ? "Editar orçamento" : "Novo orçamento"}
      </p>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-xs text-zinc-500 font-medium">Categoria</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={!!existing}
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white disabled:opacity-60"
          style={{ border: "1px solid hsl(220,15%,85%)" }}
        >
          <option value="">Selecione...</option>
          {availableCategories.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Limit */}
      <div className="space-y-1">
        <label className="text-xs text-zinc-500 font-medium">Teto mensal (R$)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-medium">
            R$
          </span>
          <input
            type="number"
            min="1"
            step="0.01"
            placeholder="0,00"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 pl-9 text-sm outline-none bg-white"
            style={{ border: "1px solid hsl(220,15%,85%)" }}
            autoFocus={!existing}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "hsl(217,91%,50%)" }}
        >
          <Save className="w-3.5 h-3.5" />
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-500 hover:bg-zinc-100 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function BudgetManager({ profile, transactions, userId }: BudgetManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  const budgets: Budget[] = profile.budgets ?? [];
  const allCategories = CATEGORIES;

  // Monthly spending per category (expenses only)
  const spendingByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      if (!isWithinInterval(parseISO(tx.date), { start: monthStart, end: monthEnd })) continue;
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    }
    return map;
  }, [transactions, monthStart, monthEnd]);

  // Save budgets array to Firestore
  const persistBudgets = async (next: Budget[]) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), { budgets: next });
    } catch {
      toast.error("Erro ao salvar orçamento");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (b: Budget) => {
    const next = [...budgets.filter((x) => x.category !== b.category), b];
    await persistBudgets(next);
    toast.success(`Orçamento de ${formatCurrency(b.limit)} para ${b.category} salvo!`);
    setShowForm(false);
  };

  const handleEdit = async (b: Budget) => {
    const next = budgets.map((x) => (x.category === b.category ? b : x));
    await persistBudgets(next);
    toast.success("Orçamento atualizado!");
    setEditingCategory(null);
  };

  const handleDelete = async (category: string) => {
    const next = budgets.filter((x) => x.category !== category);
    await persistBudgets(next);
    toast.success(`Orçamento de ${category} removido`);
  };

  const usedCategories = budgets.map((b) => b.category);
  const totalLimit = budgets.reduce((a, b) => a + b.limit, 0);
  const totalSpent = budgets.reduce((a, b) => a + (spendingByCategory[b.category] || 0), 0);
  const overBudget = budgets.filter((b) => (spendingByCategory[b.category] || 0) >= b.limit);

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card className="border-none shadow-sm overflow-hidden">
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, hsl(217,91%,25%) 0%, hsl(270,70%,45%) 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
            >
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Metas e Orçamentos</h2>
              <p className="text-blue-200 text-xs mt-0.5 capitalize">{monthLabel}</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingCategory(null); }}
            disabled={saving || allCategories.length === usedCategories.length}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <Plus className="w-4 h-4" />
            Nova Meta
          </button>
        </div>

        {/* Summary stats */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-3 divide-x divide-zinc-100">
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-400 font-medium">Teto Total</p>
              <p className="text-lg font-bold text-zinc-800 mt-0.5">{formatCurrency(totalLimit)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-400 font-medium">Gasto no Mês</p>
              <p className="text-lg font-bold text-zinc-800 mt-0.5">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-400 font-medium">No Limite / Total</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: overBudget.length > 0 ? "hsl(0,84%,55%)" : "hsl(145,63%,42%)" }}>
                {overBudget.length} / {budgets.length}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* New budget form */}
      {showForm && (
        <BudgetForm
          usedCategories={usedCategories}
          allCategories={allCategories}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Empty state */}
      {budgets.length === 0 && !showForm && (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(217,91%,96%)" }}
            >
              <Target className="w-7 h-7" style={{ color: "hsl(217,91%,50%)" }} />
            </div>
            <div>
              <p className="text-zinc-700 font-medium text-sm">Nenhuma meta definida ainda</p>
              <p className="text-zinc-400 text-xs mt-0.5 max-w-xs">
                Defina um teto de gastos por categoria e acompanhe se está dentro do orçamento.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, hsl(217,91%,45%), hsl(270,70%,50%))" }}
            >
              + Criar primeira meta
            </button>
          </CardContent>
        </Card>
      )}

      {/* Budget cards */}
      {budgets.length > 0 && (
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Progresso por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pb-5">
            {budgets.map((budget) => {
              const spent = spendingByCategory[budget.category] || 0;
              const remaining = budget.limit - spent;
              const status = getBudgetStatus(spent, budget.limit);
              const catColor = allCategories.find((c) => c.name === budget.category)?.color ?? "#6b7280";

              // Editing this row?
              if (editingCategory === budget.category) {
                return (
                  <BudgetForm
                    key={budget.category}
                    existing={budget}
                    usedCategories={usedCategories}
                    allCategories={allCategories}
                    onSave={handleEdit}
                    onCancel={() => setEditingCategory(null)}
                  />
                );
              }

              return (
                <div key={budget.category} className="space-y-2">
                  {/* Row header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Category color dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: catColor }}
                      />
                      <span className="text-sm font-semibold text-zinc-800">{budget.category}</span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: status.trackColor,
                          color: status.textColor,
                        }}
                      >
                        {status.icon} {status.label}
                      </span>
                    </div>
                    {/* Edit / Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingCategory(budget.category)}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(budget.category)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-500 transition-all"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="w-full h-4 rounded-full overflow-hidden relative"
                    style={{ background: status.trackColor }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(status.pct, 100)}%`,
                        background:
                          status.pct >= 100
                            ? `linear-gradient(90deg, ${status.color}, hsl(0,84%,45%))`
                            : status.pct >= 80
                            ? `linear-gradient(90deg, hsl(38,92%,55%), ${status.color})`
                            : `linear-gradient(90deg, ${catColor}99, ${catColor})`,
                      }}
                    />
                    {/* Percentage label inside bar */}
                    {status.pct >= 30 && (
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                        style={{ color: status.pct >= 60 ? "white" : status.textColor }}
                      >
                        {status.pct.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Values row */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1" style={{ color: status.textColor }}>
                      {status.pct >= 100 ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" style={{ color: "hsl(220,15%,60%)" }} />
                      )}
                      <span className="font-semibold">{formatCurrency(spent)}</span>
                      <span className="text-zinc-400">gasto</span>
                    </div>
                    <div className="text-right">
                      <span
                        className="font-semibold"
                        style={{ color: remaining < 0 ? "hsl(0,84%,55%)" : "hsl(220,15%,40%)" }}
                      >
                        {remaining >= 0
                          ? `${formatCurrency(remaining)} disponível`
                          : `${formatCurrency(Math.abs(remaining))} acima do limite`}
                      </span>
                      <span className="text-zinc-400 ml-1">de {formatCurrency(budget.limit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Alert card — categories over budget */}
      {overBudget.length > 0 && (
        <Card
          className="border shadow-sm"
          style={{ borderColor: "hsl(0,84%,88%)", background: "hsl(0,84%,98%)" }}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-700">Limites ultrapassados!</p>
                <p className="text-xs text-rose-500 mt-0.5">
                  {overBudget.map((b) => b.category).join(", ")} — revise seus gastos ou aumente o teto.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All good card */}
      {budgets.length > 0 && overBudget.length === 0 && (
        <Card
          className="border shadow-sm"
          style={{ borderColor: "hsl(145,60%,85%)", background: "hsl(145,60%,97%)" }}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                Todas as categorias dentro do orçamento este mês! 🎉
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
