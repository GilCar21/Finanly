import React, { useState } from "react";
import { UserProfile, Category, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES } from "@/lib/constants";
import { 
  Tag, Plus, Pencil, Trash2, RotateCcw, 
  X, Check, Search, 
  Home, ShoppingCart, Car, Palmtree, HeartPulse, 
  GraduationCap, TrendingUp, Banknote, Briefcase, 
  MoreHorizontal, Pizza, Coffee, Utensils, Plane, 
  Bus, Zap, Gift, Smartphone, Scissors, Dog, Play, 
  Hammer, Dumbbell, Shirt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", 
  "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6",
  "#f97316", "#06b6d4", "#64748b", "#1e293b",
];

const ICON_LIST: Record<string, any> = {
  Home, ShoppingCart, Car, Palmtree, HeartPulse, 
  GraduationCap, TrendingUp, Banknote, Briefcase, 
  MoreHorizontal, Pizza, Coffee, Utensils, Plane, 
  Bus, Zap, Gift, Smartphone, Scissors, Dog, Play, 
  Hammer, Dumbbell, Shirt, Tag
};

// ─── Icon Picker ─────────────────────────────────────────────────────────────

function IconPicker({ selected, onSelect }: { selected: string, onSelect: (name: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2 p-3 bg-white border border-zinc-100 rounded-xl max-h-48 overflow-y-auto shadow-sm">
      {Object.entries(ICON_LIST).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className={`p-2 rounded-lg flex items-center justify-center transition-all ${
            selected === name ? "bg-zinc-900 text-white shadow-md scale-110" : "hover:bg-zinc-100 text-zinc-500"
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

// ─── Category List Card ───────────────────────────────────────────────────────

function CategoryCard({ 
  category, 
  onEdit, 
  onDelete 
}: { 
  category: Category, 
  onEdit: () => void, 
  onDelete: () => void 
}) {
  const IconComponent = ICON_LIST[category.icon || "Tag"] || Tag;

  return (
    <div 
      className="group rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all hover:shadow-md border border-transparent"
      style={{ background: `${category.color}10`, border: `1.5px solid ${category.color}25` }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: category.color, color: "white" }}
        >
          <IconComponent className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-sm text-zinc-800 leading-tight">{category.name}</p>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Ativo</p>
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-white/50 text-zinc-400 hover:text-zinc-600 transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-500 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Form ──────────────────────────────────────────────────────────────────

interface FormProps {
  initial?: Category;
  onSave: (cat: Category) => void;
  onCancel: () => void;
}

function CategoryForm({ initial, onSave, onCancel }: FormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || PRESET_COLORS[0]);
  const [icon, setIcon] = useState(initial?.icon || "Tag");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("O nome é obrigatório"); return; }
    onSave({ name: name.trim(), color, icon });
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "hsl(217,91%,98%)", border: "1px solid hsl(217,91%,85%)" }}
    >
      <p className="font-bold text-sm text-zinc-700">
        {initial ? "Editar Categoria" : "Nova Categoria"}
      </p>

      {/* Name Input */}
      <div className="space-y-1">
        <label className="text-xs text-zinc-500 font-medium">Nome</label>
        <input 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Assinaturas"
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white font-medium"
          style={{ border: "1px solid hsl(220,15%,85%)" }}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Color Picker */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-500 font-medium">Cor</label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{ 
                  background: c,
                  outline: color === c ? `2px solid ${c}` : "none",
                  outlineOffset: "2px"
                }}
              />
            ))}
          </div>
        </div>

        {/* Icon Picker */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-500 font-medium">Ícone</label>
          <IconPicker selected={icon} onSelect={setIcon} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white bg-zinc-900 hover:bg-black transition-all"
        >
          <Check className="w-4 h-4" />
          Salvar Categoria
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-500 hover:bg-zinc-100 transition-all font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface CategoryManagerProps {
  profile: UserProfile;
  userId: string;
}

export default function CategoryManager({ profile, userId }: CategoryManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Determine current working list
  const currentCategories: Category[] = (profile.customCategories && profile.customCategories.length > 0)
    ? profile.customCategories
    : CATEGORIES;

  const persistCategories = async (newList: Category[]) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        customCategories: newList
      });
      toast.success("Categorias atualizadas!");
    } catch {
      toast.error("Erro ao salvar categorias");
    } finally {
      setSaving(false);
      setEditingIndex(null);
      setIsAdding(false);
    }
  };

  const handleAdd = (newCat: Category) => {
    if (currentCategories.some(c => c.name.toLowerCase() === newCat.name.toLowerCase())) {
      toast.error("Já existe uma categoria com este nome");
      return;
    }
    persistCategories([...currentCategories, newCat]);
  };

  const handleUpdate = (updatedCat: Category) => {
    if (editingIndex === null) return;
    const next = [...currentCategories];
    next[editingIndex] = updatedCat;
    persistCategories(next);
  };

  const handleDelete = (index: number) => {
    if (!confirm(`Deseja remover a categoria "${currentCategories[index].name}"?`)) return;
    const next = currentCategories.filter((_, i) => i !== index);
    persistCategories(next);
  };

  const handleReset = async () => {
    if (!confirm("Isso removerá todas as suas personalizações e voltará para o padrão do sistema. Confirmar?")) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        customCategories: [] // This will trigger the default CATEGORIES on next render
      });
      toast.success("Restaurado para o padrão!");
    } catch {
      toast.error("Erro ao restaurar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <Card className="border-none shadow-sm overflow-hidden">
        <div 
          className="px-5 py-6 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, hsl(230, 20%, 15%), hsl(230, 20%, 30%))" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Gerenciar Categorias</h2>
              <p className="text-zinc-400 text-xs mt-1">
                Personalize os rótulos dos seus gastos e receitas.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleReset}
              disabled={saving || !profile.customCategories || profile.customCategories.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/5 hover:bg-white/10 transition-all border border-white/10 disabled:opacity-30"
            >
              <RotateCcw className="w-3 h-3 inline mr-1.5" />
              Resetar Padrão
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-white hover:bg-zinc-100 transition-all shadow-lg"
            >
              + Nova Categoria
            </button>
          </div>
        </div>
      </Card>

      {/* Forms Section */}
      {(isAdding || editingIndex !== null) && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <CategoryForm 
            initial={editingIndex !== null ? currentCategories[editingIndex] : undefined}
            onSave={editingIndex !== null ? handleUpdate : handleAdd}
            onCancel={() => { setIsAdding(false); setEditingIndex(null); }}
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentCategories.map((cat, idx) => (
          <CategoryCard 
            key={cat.name + idx}
            category={cat}
            onEdit={() => { setEditingIndex(idx); setIsAdding(false); }}
            onDelete={() => handleDelete(idx)}
          />
        ))}
      </div>

      {/* Warning/Help Card */}
      <Card className="bg-amber-50/50 border-amber-100">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MoreHorizontal className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xs text-amber-700 leading-relaxed font-medium">
            Dica: Ao alterar o nome de uma categoria, as transações existentes não serão movidas automaticamente. 
            Elas continuarão vinculadas ao nome antigo até que você as edite individualmente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
