import { GoogleGenAI } from "@google/genai";
import { Transaction } from "@/lib/firebase";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FinancialContext {
  userName: string;
  currentMonth: { label: string; expenses: number; income: number; txCount: number };
  previousMonth: { label: string; expenses: number; income: number; txCount: number };
  topCategories: { name: string; current: number; previous: number; delta: number }[];
  topDescriptions: { description: string; totalAmount: number; count: number }[];
  installmentsBurden: number; // total monthly installments commitment
  pendingAmount: number;
  weekendVsWeekdayRatio: number; // weekend avg / weekday avg
}

function buildContext(transactions: Transaction[], userName: string): FinancialContext {
  const now = new Date();
  const curStart = startOfMonth(now);
  const curEnd = endOfMonth(now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevEnd = endOfMonth(subMonths(now, 1));

  const inInterval = (tx: Transaction, start: Date, end: Date) =>
    isWithinInterval(parseISO(tx.date), { start, end });

  const curTxs = transactions.filter((tx) => inInterval(tx, curStart, curEnd));
  const prevTxs = transactions.filter((tx) => inInterval(tx, prevStart, prevEnd));

  const sumExpenses = (txs: Transaction[]) =>
    txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const sumIncome = (txs: Transaction[]) =>
    txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);

  // Category breakdown
  const categories = [...new Set(transactions.map((t) => t.category))];
  const topCategories = categories
    .map((cat) => {
      const current = curTxs
        .filter((t) => t.category === cat && t.type === "expense")
        .reduce((a, t) => a + t.amount, 0);
      const previous = prevTxs
        .filter((t) => t.category === cat && t.type === "expense")
        .reduce((a, t) => a + t.amount, 0);
      return { name: cat, current, previous, delta: current - previous };
    })
    .filter((c) => c.current > 0 || c.previous > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 5);

  // Top descriptions this month by amount
  const descMap: Record<string, { totalAmount: number; count: number }> = {};
  curTxs.filter((t) => t.type === "expense").forEach((tx) => {
    const d = tx.description;
    if (!descMap[d]) descMap[d] = { totalAmount: 0, count: 0 };
    descMap[d].totalAmount += tx.amount;
    descMap[d].count += 1;
  });
  const topDescriptions = Object.entries(descMap)
    .map(([description, v]) => ({ description, ...v }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  // Installments burden
  const installmentsBurden = curTxs
    .filter((t) => t.type === "expense" && t.installments)
    .reduce((a, t) => a + t.amount, 0);

  // Pending
  const pendingAmount = curTxs
    .filter((t) => t.status === "pending")
    .reduce((a, t) => a + t.amount, 0);

  // Weekend vs weekday ratio
  const expense = curTxs.filter((t) => t.type === "expense");
  const weekendTotal = expense
    .filter((t) => [0, 6].includes(parseISO(t.date).getDay()))
    .reduce((a, t) => a + t.amount, 0);
  const weekdayTotal = expense
    .filter((t) => ![0, 6].includes(parseISO(t.date).getDay()))
    .reduce((a, t) => a + t.amount, 0);
  const weekendDays = expense.filter((t) => [0, 6].includes(parseISO(t.date).getDay())).length;
  const weekdayDays = expense.filter((t) => ![0, 6].includes(parseISO(t.date).getDay())).length;
  const weekendAvg = weekendDays > 0 ? weekendTotal / weekendDays : 0;
  const weekdayAvg = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0;
  const weekendVsWeekdayRatio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 1;

  return {
    userName: userName.split(" ")[0],
    currentMonth: {
      label: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
      expenses: sumExpenses(curTxs),
      income: sumIncome(curTxs),
      txCount: curTxs.length,
    },
    previousMonth: {
      label: format(subMonths(now, 1), "MMMM 'de' yyyy", { locale: ptBR }),
      expenses: sumExpenses(prevTxs),
      income: sumIncome(prevTxs),
      txCount: prevTxs.length,
    },
    topCategories,
    topDescriptions,
    installmentsBurden,
    pendingAmount,
    weekendVsWeekdayRatio,
  };
}

function buildPrompt(ctx: FinancialContext): string {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const categoryLines = ctx.topCategories
    .map((c) => {
      const arrow =
        c.delta > 0 ? `↑ ${fmt(c.delta)}` : c.delta < 0 ? `↓ ${fmt(Math.abs(c.delta))}` : "=";
      return `  - ${c.name}: ${fmt(c.current)} este mês (${arrow} vs mês anterior)`;
    })
    .join("\n");

  const descLines = ctx.topDescriptions
    .map((d) => `  - "${d.description}": ${fmt(d.totalAmount)} (${d.count}x)`)
    .join("\n");

  return `Você é um consultor financeiro pessoal chamado "Gemini" que analisa dados financeiros de brasileiros.
Você é direto, empático, usa linguagem natural e fala em português do Brasil.

Dados financeiros de ${ctx.userName}:

MÊS ATUAL (${ctx.currentMonth.label}):
- Despesas totais: ${fmt(ctx.currentMonth.expenses)}
- Receitas: ${fmt(ctx.currentMonth.income)}
- Transações: ${ctx.currentMonth.txCount}
- Saldo: ${fmt(ctx.currentMonth.income - ctx.currentMonth.expenses)}

MÊS ANTERIOR (${ctx.previousMonth.label}):
- Despesas totais: ${fmt(ctx.previousMonth.expenses)}
- Receitas: ${fmt(ctx.previousMonth.income)}

TOP CATEGORIAS (mês atual vs anterior):
${categoryLines}

TOP GASTOS POR DESCRIÇÃO (mês atual):
${descLines}

OUTROS DADOS:
- Compromisso mensal em parcelas: ${fmt(ctx.installmentsBurden)}
- Contas pendentes: ${fmt(ctx.pendingAmount)}
- Gasto médio no fim de semana vs dias úteis: ${(ctx.weekendVsWeekdayRatio * 100).toFixed(0)}% (100% = igual, >100% = gasta mais no FDS)

TAREFA:
Analise esses dados e gere de 3 a 5 insights personalizados para ${ctx.userName}. Cada insight deve:
1. Identificar um padrão real nos dados (não invente dados que não existem)
2. Ser escrito na primeira pessoa DO consultor, falando diretamente para ${ctx.userName}
3. Incluir o nome da pessoa no primeiro insight
4. Ser acionável — sugira uma ação concreta
5. Variar o tom: pode ser elogioso (quando algo vai bem), de alerta (quando algo preocupa) ou neutro/informativo
6. Ser conciso: máximo de 2 frases por insight

Formate a resposta APENAS como um array JSON com objetos assim:
[
  {
    "type": "warning" | "success" | "info" | "tip",
    "emoji": "emoji representativo",
    "title": "título curto do insight (máx 6 palavras)",
    "message": "mensagem personalizada com o insight"
  }
]

Não inclua nenhum texto fora do JSON. Não use blocos de código markdown.`;
}

export interface Insight {
  type: "warning" | "success" | "info" | "tip";
  emoji: string;
  title: string;
  message: string;
}

export async function generateInsights(
  transactions: Transaction[],
  userName: string,
  onProgress?: (text: string) => void
): Promise<Insight[]> {
  if (transactions.length === 0) {
    return [];
  }

  const ctx = buildContext(transactions, userName);
  const prompt = buildPrompt(ctx);

  let accumulated = "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    accumulated = response.text ?? "";
    onProgress?.(accumulated);

    // Robust JSON extraction: strip markdown fences if present
    const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");

    const insights: Insight[] = JSON.parse(jsonMatch[0]);
    return insights.slice(0, 5);
  } catch (e) {
    console.error("💥 [GeminiInsights] Erro:", e);
    return [];
  }
}
