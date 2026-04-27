import React from "react";
import { Transaction } from "@/lib/firebase";

import { formatCurrency, CATEGORIES, getCategoryColor } from "@/lib/constants";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ArrowUpCircle, ArrowDownCircle, CreditCard, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import SafeResponsiveContainer from "./ui/safe-responsive-container";

interface DashboardProps {
  transactions: Transaction[];
}

export default function Dashboard({ transactions }: DashboardProps) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const currentMonthTxs = transactions.filter(tx => {
    const txDate = parseISO(tx.date);
    return isWithinInterval(txDate, { start: currentMonthStart, end: currentMonthEnd });
  });

  const totalExpenses = currentMonthTxs.reduce((acc, tx) => acc + tx.amount, 0);
  const pendingExpenses = currentMonthTxs.filter(tx => tx.status === 'pending').reduce((acc, tx) => acc + tx.amount, 0);
  const upcomingPayments = currentMonthTxs
    .filter(tx => tx.status === 'pending')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Data for Pie Chart (by Category)
  const categoryData = CATEGORIES.map(cat => ({
    name: cat.name,
    value: currentMonthTxs.filter(tx => tx.category === cat.name).reduce((acc, tx) => acc + tx.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  // Data for Bar Chart (Daily Spending)
  const dailyData = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const amount = currentMonthTxs
      .filter(tx => parseISO(tx.date).getDate() === day)
      .reduce((acc, tx) => acc + tx.amount, 0);
    return { day, amount };
  }).filter(d => d.day <= now.getDate() || d.amount > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-500">Total do Mês</CardTitle>
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-zinc-400 mt-1">Gasto total em {format(now, 'MMMM', { locale: ptBR })}</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-500">Pendente</CardTitle>
            <Calendar className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingExpenses)}</div>
            <p className="text-xs text-zinc-400 mt-1">Contas a pagar este mês</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-500">Média Diária</CardTitle>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses / (now.getDate() || 1))}</div>
            <p className="text-xs text-zinc-400 mt-1">Baseado nos dias decorridos</p>
          </CardContent>
        </Card>
      </div>

      {upcomingPayments.length > 0 && (
        <Card className="border-amber-100 bg-amber-50/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Próximos Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingPayments.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-900 font-medium">{tx.description}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-amber-700">{format(parseISO(tx.date), "dd/MM")}</span>
                    <span className="font-bold text-amber-900">{formatCurrency(tx.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categoryData.length > 0 ? (
              <SafeResponsiveContainer>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
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
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Evolução Diária</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {dailyData.length > 0 ? (
              <SafeResponsiveContainer>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
              </SafeResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
