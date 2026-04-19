import React, { useMemo } from "react";
import { Transaction } from "@/lib/firebase";
import { formatCurrency } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, ChevronRight } from "lucide-react";
import { format, parseISO, getMonth, isSameYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface AnnualDashboardProps {
  transactions: Transaction[];
  year: number;
  onSelectMonth: (month: number) => void;
}

export default function AnnualDashboard({ transactions, year, onSelectMonth }: AnnualDashboardProps) {
  const currentYear = year;

  const annualStats = useMemo(() => {
    const yearTxs = transactions.filter(tx => {
      const date = parseISO(tx.date);
      return date.getFullYear() === currentYear;
    });

    const income = yearTxs
      .filter(tx => tx.type === 'income')
      .reduce((acc, tx) => acc + tx.amount, 0);
    
    const expenses = yearTxs
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => acc + tx.amount, 0);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthTxs = yearTxs.filter(tx => getMonth(parseISO(tx.date)) === i);
      const mIncome = monthTxs
        .filter(tx => tx.type === 'income')
        .reduce((acc, tx) => acc + tx.amount, 0);
      const mExpenses = monthTxs
        .filter(tx => tx.type === 'expense')
        .reduce((acc, tx) => acc + tx.amount, 0);
      
      return {
        month: format(new Date(currentYear, i, 1), 'MMM', { locale: ptBR }),
        income: mIncome,
        expenses: mExpenses,
        balance: mIncome - mExpenses,
        monthIndex: i
      };
    });

    return {
      income,
      expenses,
      balance: income - expenses,
      monthlyData,
      totalTxs: yearTxs.length
    };
  }, [transactions, currentYear]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-emerald-700">Receitas Totais ({currentYear})</CardTitle>
            <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{formatCurrency(annualStats.income)}</div>
            <p className="text-xs text-emerald-600 mt-1">Ganhos acumulados no ano</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-rose-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-rose-700">Despesas Totais ({currentYear})</CardTitle>
            <ArrowDownCircle className="w-5 h-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">{formatCurrency(annualStats.expenses)}</div>
            <p className="text-xs text-rose-600 mt-1">Gastos acumulados no ano</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-blue-700">Saldo Acumulado</CardTitle>
            <Wallet className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${annualStats.balance >= 0 ? 'text-blue-900' : 'text-rose-900'}`}>
              {formatCurrency(annualStats.balance)}
            </div>
            <p className="text-xs text-blue-600 mt-1">Poupança real no período</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={annualStats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                fontSize={12} 
                tick={{ fill: '#71717a' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                fontSize={12} 
                tick={{ fill: '#71717a' }}
                tickFormatter={(val) => `R$ ${val}`}
              />
              <Tooltip 
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar name="Receitas" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar name="Despesas" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {annualStats.monthlyData.map((data, index) => {
          const isFuture = new Date().getFullYear() === currentYear && index > new Date().getMonth();
          const hasData = data.income > 0 || data.expenses > 0;

          return (
            <button
              key={index}
              disabled={isFuture && !hasData}
              onClick={() => onSelectMonth(index)}
              className={`group p-4 rounded-xl border transition-all text-left flex flex-col justify-between h-32
                ${isFuture && !hasData 
                  ? 'bg-zinc-50 border-zinc-100 opacity-50 cursor-not-allowed' 
                  : 'bg-white border-zinc-200 hover:border-blue-400 hover:shadow-md active:scale-95'
                }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-zinc-900">{monthNames[index]}</span>
                {!isFuture && <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-500 transition-colors" />}
              </div>
              
              <div>
                {hasData ? (
                  <div className="space-y-1">
                    <div className="text-[10px] flex justify-between">
                      <span className="text-emerald-600">+{formatCurrency(data.income)}</span>
                    </div>
                    <div className="text-[10px] flex justify-between">
                      <span className="text-rose-600">-{formatCurrency(data.expenses)}</span>
                    </div>
                    <div className="w-full bg-zinc-100 h-1 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all" 
                        style={{ width: `${Math.min((data.expenses / (data.income || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-400">{isFuture ? 'Previsão' : 'Sem dados'}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
