import { Transaction } from "@/lib/firebase";
import { postGeminiFunction } from "@/lib/geminiApi";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export type IntentType = "create_transaction" | "query" | "unknown";

export interface ParsedTransaction {
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  paymentMethod: string;
  status: "paid" | "pending";
  installments?: string;
}

export interface NLPResult {
  intent: IntentType;
  // For create_transaction
  transaction?: ParsedTransaction;
  confirmationText?: string; // Human-readable summary before saving
  // For query
  answer?: string;
  // For unknown
  suggestion?: string;
}

interface NlpResponse {
  result: NLPResult;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildTransactionDataset(transactions: Transaction[]): string {
  if (transactions.length === 0) return "Nenhuma transação registrada ainda.";

  // Build a compact summary of all transactions grouped by month
  const byMonth: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const key = tx.date.slice(0, 7); // YYYY-MM
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(tx);
  }

  return Object.entries(byMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6) // last 6 months max
    .map(([month, txs]) => {
      const label = format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: ptBR });
      const expenses = txs
        .filter((t) => t.type === "expense")
        .reduce((a, t) => a + t.amount, 0);
      const income = txs
        .filter((t) => t.type === "income")
        .reduce((a, t) => a + t.amount, 0);

      // Category breakdown
      const catMap: Record<string, number> = {};
      txs.filter((t) => t.type === "expense").forEach((t) => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      });
      const catLines = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => `    ${cat}: ${fmt(val)}`)
        .join("\n");

      return `## ${label}
  - Despesas: ${fmt(expenses)}
  - Receitas: ${fmt(income)}
  - Por categoria:\n${catLines}`;
    })
    .join("\n\n");
}

// ─── Main NLP function ───────────────────────────────────────────────────────

export async function processNaturalLanguage(
  userInput: string,
  transactions: Transaction[],
  userName: string
): Promise<NLPResult> {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayFull = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const categoryList = CATEGORIES.map((c) => c.name).join(", ");
  const paymentList = PAYMENT_METHODS.join(", ");
  const dataset = buildTransactionDataset(transactions);
  const firstName = userName.split(" ")[0];

  const systemPrompt = `Você é um assistente financeiro pessoal inteligente integrado ao app "Finanças em Família".
Hoje é: ${todayFull} (${today})
Usuário: ${firstName}
Categorias disponíveis: ${categoryList}
Métodos de pagamento disponíveis: ${paymentList}

DADOS FINANCEIROS DO USUÁRIO:
${dataset}

Sua tarefa é analisar a mensagem do usuário e retornar um JSON com a seguinte estrutura:

1. Se o usuário quer REGISTRAR um gasto/receita (ex: "gastei 50 reais no mercado", "recebi meu salário hoje"):
{
  "intent": "create_transaction",
  "transaction": {
    "date": "YYYY-MM-DD",
    "description": "descrição clara e curta",
    "amount": 00.00,
    "category": "uma categoria da lista acima",
    "type": "expense" ou "income",
    "paymentMethod": "um método da lista acima",
    "status": "paid",
    "installments": "X de Y" (apenas se mencionado, caso contrário omitir)
  },
  "confirmationText": "frase amigável confirmando o que será salvo, ex: 'Combinado! Vou registrar R$ 45,00 no Posto Shell como Veículo hoje.'"
}

2. Se o usuário quer CONSULTAR/PERGUNTAR algo sobre seus dados financeiros:
{
  "intent": "query",
  "answer": "resposta direta e personalizada em português, com valores reais dos dados, comparativos quando relevante, e sugestões práticas. Máximo 4 frases."
}

3. Se não entender ou for algo fora do escopo financeiro:
{
  "intent": "unknown",
  "suggestion": "mensagem simpática sugerindo o que o usuário pode perguntar ou fazer"
}

REGRAS IMPORTANTES:
- Para datas: "hoje" = ${today}, "ontem" = calcule corretamente, "semana passada" = calcule
- Para categorias: "gasolina/posto" → Veículo, "mercado/supermercado" → Mercado, "médico/farmácia/remédio" → Saúde, "netflix/cinema/game" → Lazer, "escola/curso/livro" → Educação, "salário/freela" → Salário ou Freelance
- Se o tipo não for claro, assuma "expense"
- Para pagamento: se não mencionado, assuma "Cartão de Crédito"
- Responda APENAS com o JSON. Sem texto extra. Sem markdown.`;

  try {
    const response = await postGeminiFunction<NlpResponse>("gemini-nlp", {
      prompt: systemPrompt,
      userInput,
    });
    return response.result;
  } catch (e) {
    console.error("Erro no processamento de linguagem natural:", e);
    return {
      intent: "unknown",
      suggestion: "Desculpe, não consegui entender. Tente algo como: 'Gastei R$ 50 no mercado hoje' ou 'Quanto gastei com lazer esse mês?'",
    };
  }
}
