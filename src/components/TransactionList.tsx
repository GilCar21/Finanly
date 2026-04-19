import React from "react";
import { Transaction, db, Account, ACCOUNT_TYPE_ICONS } from "@/lib/firebase";

import { formatCurrency, getCategoryColor } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, CheckCircle, Clock, Badge, Pencil } from "lucide-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  accounts?: Account[];
}

export default function TransactionList({ transactions, onEdit, accounts = [] }: TransactionListProps) {
  const accountMap = new Map(accounts.map((a) => [a.id!, a]));
  const toggleStatus = async (tx: Transaction) => {
    if (!tx.id) return;
    const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
    try {
      await updateDoc(doc(db, "transactions", tx.id), { status: newStatus });
      toast.success(`Status atualizado para ${newStatus === 'paid' ? 'Pago' : 'Pendente'}`);
    } catch (e) {
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteTx = async (id: string) => {
    try {
      await deleteDoc(doc(db, "transactions", id));
      toast.success("Transação excluída");
    } catch (e) {
      toast.error("Erro ao excluir transação");
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
        <p className="text-zinc-500">Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-50">
          <TableRow>
            <TableHead className="w-[120px]">Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id} className="hover:bg-zinc-50 transition-colors">
              <TableCell className="font-medium text-zinc-600">
                {format(parseISO(tx.date), "dd MMM", { locale: ptBR })}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="font-semibold text-zinc-900 truncate" title={tx.description}>
                      {tx.description}
                    </span>
                    {/* Account badge */}
                    {tx.accountId && accountMap.has(tx.accountId) && (() => {
                      const acc = accountMap.get(tx.accountId)!;
                      return (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${acc.color}20`, color: acc.color }}
                        >
                          {ACCOUNT_TYPE_ICONS[acc.type]} {acc.name}
                        </span>
                      );
                    })()}
                  </div>
                  {tx.installments && <span className="text-xs text-zinc-400 ml-3.5">{tx.installments}</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(tx.category) }} />
                  <span className="text-sm">{tx.category}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-zinc-500">{tx.paymentMethod}</TableCell>
              <TableCell className={`text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </TableCell>
              <TableCell className="text-center">
                {tx.type === 'expense' || !tx.type ? (
                  <button onClick={() => toggleStatus(tx)} className="focus:outline-none">
                    {tx.status === 'paid' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none gap-1">
                        <CheckCircle className="w-3 h-3" /> Pago
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1">
                        <Clock className="w-3 h-3" /> Pendente
                      </Badge>
                    )}
                  </button>
                ) : (
                  <span className="text-zinc-300 text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(tx)} className="text-zinc-400 hover:text-blue-600">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => tx.id && deleteTx(tx.id)} className="text-zinc-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
