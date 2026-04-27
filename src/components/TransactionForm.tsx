import React, { useState } from "react";

import { CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { db, Transaction, Category, Account, ACCOUNT_TYPE_ICONS } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Plus, Check, X as CloseIcon } from "lucide-react";

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  sharedWith: string[];
  initialData?: Transaction | null;
  customCategories: Category[];
  accounts?: Account[]; // optional — shows account selector only when provided
}

export default function TransactionForm({ isOpen, onClose, userId, sharedWith, initialData, customCategories, accounts = [] }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const allCategories = [...CATEGORIES, ...customCategories].filter(
    (category, index, categories) =>
      categories.findIndex((item) => item.name.toLowerCase() === category.name.toLowerCase()) === index
  );
  
  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    description: "",
    amount: "",
    category: "Outros",
    type: "expense" as "income" | "expense",
    paymentMethod: "Cartão de Crédito",
    status: "paid" as "paid" | "pending",
    installments: "",
    accountId: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  React.useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        date: initialData.date,
        description: initialData.description,
        amount: initialData.amount.toString(),
        category: initialData.category,
        type: initialData.type || 'expense',
        paymentMethod: initialData.paymentMethod,
        status: initialData.status,
        installments: initialData.installments || "",
        accountId: initialData.accountId || "",
      });
    } else if (isOpen && !initialData) {
      setFormData(emptyForm);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const dataToSave: any = {
        ...formData,
        amount: parseFloat(formData.amount),
        userId,
        sharedWith,
      };
      // Only include accountId if one was selected
      if (!formData.accountId) delete dataToSave.accountId;

      if (initialData?.id) {
        await updateDoc(doc(db, "transactions", initialData.id), dataToSave);
        toast.success("Transação atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "transactions"), dataToSave);
        toast.success("Transação adicionada com sucesso!");
      }
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar transação");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    // Check if category already exists
    if (allCategories.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
      toast.error("Esta categoria já existe");
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      const newCat: Category = {
        name: newCategoryName.trim(),
        color: "#" + Math.floor(Math.random()*16777215).toString(16), // Random color
        icon: "Tag"
      };

      await updateDoc(userRef, {
        customCategories: arrayUnion(newCat)
      });

      toast.success("Categoria adicionada!");
      setFormData({ ...formData, category: newCat.name });
      setNewCategoryName("");
      setIsAddingCategory(false);
    } catch (e) {
      toast.error("Erro ao adicionar categoria");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Transação" : "Nova Transação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex p-1 bg-zinc-100 rounded-lg mb-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income' })}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                formData.type === 'income' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                formData.type === 'expense' 
                  ? 'bg-white text-rose-600 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Despesa
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Aluguel, Mercado..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Categoria</Label>
                <button 
                  type="button" 
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {isAddingCategory ? <CloseIcon className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>

              {isAddingCategory ? (
                <div className="flex gap-1 animate-in slide-in-from-top-1">
                  <Input 
                    placeholder="Nome da categoria" 
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="h-9 text-xs"
                    autoFocus
                  />
                  <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={handleAddCategory}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(cat => (
                      <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <Select value={formData.paymentMethod} onValueChange={v => setFormData({ ...formData, paymentMethod: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account selector — shown only when accounts exist */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label>Conta / Carteira</Label>
              <Select
                value={formData.accountId}
                onValueChange={(v) => setFormData({ ...formData, accountId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma conta vinculada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma conta</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id!}>
                      {ACCOUNT_TYPE_ICONS[a.type]} {a.name} — {a.ownerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installments">Parcelas (opcional)</Label>
              <Input
                id="installments"
                placeholder="Ex: 2 de 9"
                value={formData.installments}
                onChange={e => setFormData({ ...formData, installments: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Salvando..." : (initialData ? "Salvar Alterações" : "Adicionar Transação")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
