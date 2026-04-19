import { Transaction } from "@/lib/firebase";

export const CATEGORIES = [
  { name: "Casa", color: "#3b82f6", icon: "Home" },
  { name: "Mercado", color: "#10b981", icon: "ShoppingCart" },
  { name: "Veículo", color: "#f59e0b", icon: "Car" },
  { name: "Lazer", color: "#8b5cf6", icon: "Palmtree" },
  { name: "Saúde", color: "#ef4444", icon: "HeartPulse" },
  { name: "Educação", color: "#6366f1", icon: "GraduationCap" },
  { name: "Investimento", color: "#06b6d4", icon: "TrendingUp" },
  { name: "Salário", color: "#22c55e", icon: "Banknote" },
  { name: "Freelance", color: "#14b8a6", icon: "Briefcase" },
  { name: "Rendimento", color: "#f97316", icon: "ArrowUpRight" },
  { name: "Outros", color: "#6b7280", icon: "MoreHorizontal" },
];

export const PAYMENT_METHODS = [
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "PIX",
  "Boleto",
  "Outros",
];

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const getCategoryColor = (categoryName: string) => {
  return CATEGORIES.find((c) => c.name === categoryName)?.color || "#6b7280";
};
