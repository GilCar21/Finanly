import React, { useState, useCallback, useMemo } from "react";
import {
  Account, AccountType, Transaction,
  ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS,
  db,
} from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { formatCurrency } from "@/lib/constants";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wallet, Plus, Pencil, Trash2, ArrowLeftRight,
  X, Save, ChevronRight, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#1e293b",
];

const OWNER_SUGGESTIONS = ["Gilberto", "Esposa", "Compartilhado", "Família"];

// ─── Balance calculation ──────────────────────────────────────────────────────

function calcBalance(account: Account, transactions: Transaction[]): number {
  const txs = transactions.filter((t) => t.accountId === account.id);
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  if (account.type === "credit") {
    // Credit cards: show how much is owed this month
    return expense - income;
  }
  // Checking / cash / savings: initial + income - expense
  return account.initialBalance + income - expense;
}

function calcMonthlyFlow(account: Account, transactions: Transaction[]) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const txs = transactions.filter(
    (t) =>
      t.accountId === account.id &&
      isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
  );
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense };
}

// ─── Account Form ─────────────────────────────────────────────────────────────

interface AccountFormData {
  name: string;
  type: AccountType;
  ownerName: string;
  color: string;
  initialBalance: string;
}

interface AccountFormProps {
  initial?: Account;
  onSave: (data: Omit<Account, "id" | "userId" | "sharedWith">) => Promise<void>;
  onCancel: () => void;
}

function AccountForm({ initial, onSave, onCancel }: AccountFormProps) {
  const [form, setForm] = useState<AccountFormData>({
    name: initial?.name ?? "",
    type: initial?.type ?? "checking",
    ownerName: initial?.ownerName ?? "",
    color: initial?.color ?? ACCOUNT_COLORS[0],
    initialBalance: initial?.initialBalance?.toString() ?? "0",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome da conta é obrigatório"); return; }
    if (!form.ownerName.trim()) { toast.error("Dono da conta é obrigatório"); return; }
    setSaving(true);
    await onSave({
      name: form.name.trim(),
      type: form.type,
      ownerName: form.ownerName.trim(),
      color: form.color,
      initialBalance: parseFloat(form.initialBalance) || 0,
    });
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "hsl(217,91%,98%)", border: "1px solid hsl(217,91%,85%)" }}
    >
      <p className="font-bold text-sm text-zinc-700">
        {initial ? "Editar conta" : "Nova conta"}
      </p>

      {/* Name + color */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-zinc-500 font-medium">Nome da conta</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Nubank Gilberto"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white"
            style={{ border: "1px solid hsl(220,15%,85%)" }}
            autoFocus
          />
        </div>
        {/* Color picker */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium">Cor</label>
          <div className="flex gap-1.5 flex-wrap w-36">
            {ACCOUNT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: form.color === c ? `3px solid ${c}` : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Type + Owner */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white"
            style={{ border: "1px solid hsl(220,15%,85%)" }}
          >
            {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{ACCOUNT_TYPE_ICONS[k]} {v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium">Dono</label>
          <input
            list="owner-suggestions"
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            placeholder="Ex: Gilberto"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white"
            style={{ border: "1px solid hsl(220,15%,85%)" }}
          />
          <datalist id="owner-suggestions">
            {OWNER_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>

      {/* Initial balance (not shown for credit cards) */}
      {form.type !== "credit" && (
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium">
            Saldo inicial (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">R$</span>
            <input
              type="number"
              step="0.01"
              value={form.initialBalance}
              onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              className="w-full rounded-xl border px-3 py-2 pl-9 text-sm outline-none bg-white"
              style={{ border: "1px solid hsl(220,15%,85%)" }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "hsl(217,91%,50%)" }}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Salvando..." : "Salvar"}
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
}

// ─── Transfer Form ────────────────────────────────────────────────────────────

interface TransferFormProps {
  accounts: Account[];
  userId: string;
  sharedWith: string[];
  onDone: () => void;
}

function TransferForm({ accounts, userId, sharedWith, onDone }: TransferFormProps) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Transferência");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!fromId || !toId) { toast.error("Selecione as contas"); return; }
    if (fromId === toId) { toast.error("A conta de origem e destino devem ser diferentes"); return; }
    if (!amt || amt <= 0) { toast.error("Digite um valor válido"); return; }

    setSaving(true);
    try {
      const transferId = `transfer_${Date.now()}`;
      const base = { date, description, amount: amt, category: "Transferência", status: "paid" as const, userId, sharedWith, transferId };

      // Debit from source
      await addDoc(collection(db, "transactions"), { ...base, type: "expense", accountId: fromId, paymentMethod: "Transferência" });
      // Credit to destination
      await addDoc(collection(db, "transactions"), { ...base, type: "income", accountId: toId, paymentMethod: "Transferência" });

      toast.success(`Transferência de ${formatCurrency(amt)} realizada!`);
      onDone();
    } catch {
      toast.error("Erro ao realizar transferência");
    } finally {
      setSaving(false);
    }
  };

  const nonCreditAccounts = accounts.filter((a) => a.type !== "credit");

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "hsl(145,60%,97%)", border: "1px solid hsl(145,60%,82%)" }}
    >
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4" style={{ color: "hsl(145,63%,42%)" }} />
        <p className="font-bold text-sm" style={{ color: "hsl(145,45%,28%)" }}>Nova Transferência</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium">De (origem)</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white"
            style={{ border: "1px solid hsl(220,15%,85%)" }}
          >
            {nonCreditAccounts.map((a) => (
              <option key={a.id} value={a.id}>{ACCOUNT_TYPE_ICONS[a.type]} {a.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium">Para (destino)</label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white"
            style={{ border: "1px solid hsl(220,15%,85%)" }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{ACCOUNT_TYPE_ICONS[a.type]} {a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium">Valor (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">R$</span>
            <input
              type="number" step="0.01" min="0.01" placeholder="0,00"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 pl-9 text-sm outline-none bg-white"
              style={{ border: "1px solid hsl(220,15%,85%)" }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium">Data</label>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white"
            style={{ border: "1px solid hsl(220,15%,85%)" }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500 font-medium">Descrição</label>
        <input
          value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white"
          style={{ border: "1px solid hsl(220,15%,85%)" }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit" disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "hsl(145,63%,42%)" }}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          {saving ? "Transferindo..." : "Confirmar Transferência"}
        </button>
        <button type="button" onClick={onDone}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-500 hover:bg-zinc-100 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account, balance, flow, onEdit, onDelete,
}: {
  account: Account;
  balance: number;
  flow: { income: number; expense: number };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isCredit = account.type === "credit";
  const isNegative = !isCredit && balance < 0;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all hover:-translate-y-0.5"
      style={{ background: `${account.color}15`, border: `1.5px solid ${account.color}35` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: `${account.color}25` }}
          >
            {ACCOUNT_TYPE_ICONS[account.type]}
          </div>
          <div>
            <p className="font-bold text-sm text-zinc-800 leading-tight">{account.name}</p>
            <p className="text-xs text-zinc-400">{account.ownerName} · {ACCOUNT_TYPE_LABELS[account.type]}</p>
          </div>
        </div>
        <div className="flex gap-0.5">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-500 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Balance */}
      <div>
        <p className="text-xs text-zinc-400 font-medium mb-0.5">
          {isCredit ? "Fatura do mês" : "Saldo atual"}
        </p>
        <p
          className="text-2xl font-bold"
          style={{ color: isCredit ? "hsl(0,84%,50%)" : isNegative ? "hsl(0,84%,50%)" : account.color }}
        >
          {isCredit ? "" : isNegative ? "- " : ""}
          {formatCurrency(Math.abs(balance))}
        </p>
      </div>

      {/* Monthly flow */}
      <div className="flex gap-3 pt-1" style={{ borderTop: `1px solid ${account.color}20` }}>
        <div>
          <p className="text-[10px] text-zinc-400">Entradas</p>
          <p className="text-xs font-semibold text-emerald-600">+{formatCurrency(flow.income)}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-400">Saídas</p>
          <p className="text-xs font-semibold text-rose-500">-{formatCurrency(flow.expense)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WalletManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  userId: string;
  sharedWith: string[];
}

type PanelMode = "list" | "add" | "edit" | "transfer";

export default function WalletManager({ accounts, transactions, userId, sharedWith }: WalletManagerProps) {
  const [mode, setMode] = useState<PanelMode>("list");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // ── CRUD ──
  const handleAdd = async (data: Omit<Account, "id" | "userId" | "sharedWith">) => {
    await addDoc(collection(db, "accounts"), { ...data, userId, sharedWith });
    toast.success(`Conta "${data.name}" criada!`);
    setMode("list");
  };

  const handleEdit = async (data: Omit<Account, "id" | "userId" | "sharedWith">) => {
    if (!editingAccount?.id) return;
    await updateDoc(doc(db, "accounts", editingAccount.id), data as any);
    toast.success("Conta atualizada!");
    setMode("list");
    setEditingAccount(null);
  };

  const handleDelete = async (account: Account) => {
    if (!account.id) return;
    const linked = transactions.filter((t) => t.accountId === account.id).length;
    if (linked > 0 && !confirm(`Esta conta tem ${linked} transação(ões) vinculadas. Excluir mesmo assim?`)) return;
    await deleteDoc(doc(db, "accounts", account.id));
    toast.success(`Conta "${account.name}" removida`);
  };

  // Balances
  const balances = useMemo(() =>
    accounts.reduce<Record<string, number>>((acc, a) => {
      acc[a.id!] = calcBalance(a, transactions);
      return acc;
    }, {}),
    [accounts, transactions]
  );

  const flows = useMemo(() =>
    accounts.reduce<Record<string, { income: number; expense: number }>>((acc, a) => {
      acc[a.id!] = calcMonthlyFlow(a, transactions);
      return acc;
    }, {}),
    [accounts, transactions]
  );

  // Total net worth (excluding credit cards)
  const totalNetWorth = accounts
    .filter((a) => a.type !== "credit")
    .reduce((s, a) => s + (balances[a.id!] ?? 0), 0);

  const totalCredit = accounts
    .filter((a) => a.type === "credit")
    .reduce((s, a) => s + (balances[a.id!] ?? 0), 0);

  // Group by owner
  const owners = [...new Set(accounts.map((a) => a.ownerName))];

  const monthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-none shadow-sm overflow-hidden">
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, hsl(217,91%,25%), hsl(270,70%,40%))" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Carteiras</h2>
              <p className="text-blue-200 text-xs capitalize">{monthLabel}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {accounts.length >= 2 && (
              <button
                onClick={() => setMode(mode === "transfer" ? "list" : "transfer")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Transferir
              </button>
            )}
            <button
              onClick={() => { setMode(mode === "add" ? "list" : "add"); setEditingAccount(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Conta
            </button>
          </div>
        </div>

        {/* Summary */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-3 divide-x divide-zinc-100">
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-400 font-medium">Patrimônio Líquido</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: totalNetWorth >= 0 ? "hsl(145,63%,38%)" : "hsl(0,84%,50%)" }}>
                {formatCurrency(totalNetWorth)}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-400 font-medium">Fatura Total Cartões</p>
              <p className="text-lg font-bold text-rose-500 mt-0.5">{formatCurrency(totalCredit)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-400 font-medium">Contas Ativas</p>
              <p className="text-lg font-bold text-zinc-800 mt-0.5">{accounts.length}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Transfer form */}
      {mode === "transfer" && (
        <TransferForm
          accounts={accounts}
          userId={userId}
          sharedWith={sharedWith}
          onDone={() => setMode("list")}
        />
      )}

      {/* Add form */}
      {mode === "add" && (
        <AccountForm onSave={handleAdd} onCancel={() => setMode("list")} />
      )}

      {/* Edit form */}
      {mode === "edit" && editingAccount && (
        <AccountForm
          initial={editingAccount}
          onSave={handleEdit}
          onCancel={() => { setMode("list"); setEditingAccount(null); }}
        />
      )}

      {/* Empty state */}
      {accounts.length === 0 && mode === "list" && (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "hsl(217,91%,96%)" }}>💰</div>
            <div>
              <p className="text-zinc-700 font-medium">Nenhuma conta cadastrada</p>
              <p className="text-zinc-400 text-xs mt-1 max-w-xs">
                Adicione suas contas correntes, cartões de crédito e dinheiro para controlar seu patrimônio.
              </p>
            </div>
            <button
              onClick={() => setMode("add")}
              className="mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, hsl(217,91%,45%), hsl(270,70%,50%))" }}
            >
              + Criar primeira conta
            </button>
          </CardContent>
        </Card>
      )}

      {/* Account cards grouped by owner */}
      {accounts.length > 0 && mode === "list" && owners.map((owner) => (
        <div key={owner} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs">
              {owner === "Gilberto" ? "👨" : owner === "Esposa" ? "👩" : "👥"}
            </div>
            <h3 className="text-sm font-bold text-zinc-600">{owner}</h3>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts
              .filter((a) => a.ownerName === owner)
              .map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  balance={balances[account.id!] ?? 0}
                  flow={flows[account.id!] ?? { income: 0, expense: 0 }}
                  onEdit={() => { setEditingAccount(account); setMode("edit"); }}
                  onDelete={() => handleDelete(account)}
                />
              ))}
          </div>
        </div>
      ))}

      {/* Unlinked transactions notice */}
      {accounts.length > 0 && transactions.some((t) => !t.accountId) && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-2xl"
          style={{ background: "hsl(38,92%,97%)", border: "1px solid hsl(38,92%,85%)" }}
        >
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Algumas transações não estão vinculadas a uma conta. Ao adicionar novas transações,
            selecione a conta correspondente para manter o saldo atualizado.
          </p>
        </div>
      )}
    </div>
  );
}
