import React, { useMemo } from "react";
import { Transaction } from "@/lib/firebase";
import { formatCurrency, CATEGORIES } from "@/lib/constants";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, ChevronLeft } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import SafeResponsiveContainer from "./ui/safe-responsive-container";

interface MonthlyDashboardProps {
  transactions: Transaction[];
  month: number;
  year: number;
  onBackToAnnual: () => void;
}

export default function MonthlyDashboard({ transactions, month, year, onBackToAnnual }: MonthlyDashboardProps) {
  const monthDate = new Date(year, month, 1);
  
  const stats = useMemo(() => {
    const income = transactions
      .filter(tx => tx.type === 'income')
      .reduce((acc, tx) => acc + tx.amount, 0);
    
    const expenses = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => acc + tx.amount, 0);

    const pendingExpenses = transactions
      .filter(tx => tx.type === 'expense' && tx.status === 'pending')
      .reduce((acc, tx) => acc + tx.amount, 0);

    const categoryData = CATEGORIES.map(cat => ({
      name: cat.name,
      value: transactions
        .filter(tx => tx.category === cat.name && tx.type === 'expense')
        .reduce((acc, tx) => acc + tx.amount, 0),
      color: cat.color
    })).filter(d => d.value > 0);

    // Daily evolution for expenses
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate)
    });

    const dailyData = daysInMonth.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const amount = transactions
        .filter(tx => tx.date === dayStr && tx.type === 'expense')
        .reduce((acc, tx) => acc + tx.amount, 0);
      return {
        day: format(day, 'dd'),
        amount
      };
    });

    return {
      income,
      expenses,
      balance: income - expenses,
      pendingExpenses,
      categoryData,
      dailyData
    };
  }, [transactions, monthDate]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBackToAnnual} className="gap-2 text-zinc-600 hover:text-blue-600">
          <ChevronLeft className="w-4 h-4" />
          Voltar para Resumo Anual
        </Button>
        <h2 className="text-xl font-bold text-zinc-800 capitalize">
          {format(monthDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-700">{formatCurrency(stats.income)}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-rose-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-rose-600 uppercase tracking-wider">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-700">{formatCurrency(stats.expenses)}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-zinc-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-zinc-700">{formatCurrency(stats.pendingExpenses)}</div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-sm ${stats.balance >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 uppercase tracking-wider">Saldo do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${stats.balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {formatCurrency(stats.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats.categoryData.length > 0 ? (
              <SafeResponsiveContainer>
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </SafeResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">
                Nenhuma despesa registrada neste mês.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Evolução Diária de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <SafeResponsiveContainer>
              <BarChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </SafeResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
