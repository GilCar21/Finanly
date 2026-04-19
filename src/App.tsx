import React, { useState, useEffect } from "react";
import { auth, db, signIn, logOut, Transaction, UserProfile, Account } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import AnnualDashboard from "@/components/AnnualDashboard";
import MonthlyDashboard from "@/components/MonthlyDashboard";
import TransactionList from "@/components/TransactionList";
import SpendingHeatmap from "@/components/SpendingHeatmap";
import InstallmentsTracker from "@/components/InstallmentsTracker";
import GeminiInsights from "@/components/GeminiInsights";
import NLPChat from "@/components/NLPChat";
import BudgetManager from "@/components/BudgetManager";
import WalletManager from "@/components/WalletManager";
import CategoryManager from "@/components/CategoryManager";
import Auth from "@/components/Auth";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { LayoutDashboard, Receipt, PlusCircle, LogOut, Users, ChevronLeft, ChevronRight, Filter, X, SlidersHorizontal, Flame, Layers, Target, Wallet, Tag } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";
import ImportModal from "@/components/ImportModal";
import ShareModal from "@/components/ShareModal";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { getMonth, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Routes, Route, Navigate, useParams, useNavigate, useLocation, useMatch } from "react-router-dom";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const location = useLocation();
  const match = useMatch("/:year/:month?/:tab?");
  const routeYear = match?.params.year;
  const routeMonth = match?.params.month;

  const selectedYear = routeYear ? parseInt(routeYear) : new Date().getFullYear();
  const isAnnual = routeMonth === 'annual';
  const currentMonthIdx = isAnnual ? 0 : parseInt(routeMonth || '1') - 1;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Initial fetch and ensures profile exists
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            sharedWith: [],
            customCategories: []
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(userSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
        setTransactions([]);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Profile real-time listener
  useEffect(() => {
    if (!user) return;
    const unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
    });
    return () => unsubscribeProfile();
  }, [user]);

  // Accounts real-time listener
  useEffect(() => {
    if (!user) return;
    const qOwner = query(collection(db, "accounts"), where("userId", "==", user.uid));
    const qShared = query(collection(db, "accounts"), where("sharedWith", "array-contains", user.email ?? ""));
    const accMap = new Map<string, Account>();
    const update = (snap: any) => {
      snap.docChanges().forEach((change: any) => {
        if (change.type === "removed") accMap.delete(change.doc.id);
        else accMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Account);
      });
      setAccounts(Array.from(accMap.values()));
    };
    const u1 = onSnapshot(qOwner, update);
    const u2 = onSnapshot(qShared, update);
    return () => { u1(); u2(); };
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;

    // Calcular o intervalo de datas para a consulta
    let dateStart: string;
    let dateEnd: string;

    if (isAnnual) {
      dateStart = `${selectedYear}-01-01`;
      dateEnd = `${selectedYear}-12-31`;
    } else {
      const monthStr = (currentMonthIdx + 1).toString().padStart(2, '0');
      dateStart = `${selectedYear}-${monthStr}-01`;
      dateEnd = `${selectedYear}-${monthStr}-31`; // Firestore aceita até o 31 sem problemas
    }

    console.log(`📡 [Firestore] Carregando transações de ${dateStart} até ${dateEnd}`);

    // Fetch transactions where user is owner
    const qOwner = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      where("date", ">=", dateStart),
      where("date", "<=", dateEnd),
      orderBy("date", "desc")
    );

    // Fetch transactions shared with this user's email
    const qShared = query(
      collection(db, "transactions"),
      where("sharedWith", "array-contains", user.email),
      where("date", ">=", dateStart),
      where("date", "<=", dateEnd),
      orderBy("date", "desc")
    );

    const txMap = new Map<string, Transaction>();

    const updateTxs = (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === "removed") {
          txMap.delete(change.doc.id);
        } else {
          txMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Transaction);
        }
      });
      const sortedTxs = Array.from(txMap.values()).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(sortedTxs);
    };

    const unsubOwner = onSnapshot(qOwner, {
      next: updateTxs,
      error: (err) => {
        console.error("Erro na consulta do proprietário:", err);
        if (err.code === 'failed-precondition') {
          toast.error("Erro de índice no Firebase. Verifique o console.");
        } else {
          toast.error("Erro ao carregar transações próprias.");
        }
      }
    });

    const unsubShared = onSnapshot(qShared, {
      next: updateTxs,
      error: (err) => {
        console.error("Erro na consulta compartilhada:", err);
        if (err.code === 'failed-precondition') {
          toast.error("Erro de índice no Firebase (compartilhado).");
        } else {
          toast.error("Erro ao carregar transações compartilhadas.");
        }
      }
    });

    return () => {
      unsubOwner();
      unsubShared();
    };
  }, [user, profile, selectedYear, currentMonthIdx, isAnnual]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="animate-pulse text-zinc-400 font-medium">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSignIn={signIn} />;
  }

  return (
    <Routes>
      <Route path="/:year/:month?/:tab?" element={
        <MainContent
          user={user}
          profile={profile}
          transactions={transactions}
          accounts={accounts}
          isFormOpen={isFormOpen}
          setIsFormOpen={setIsFormOpen}
          isImportOpen={isImportOpen}
          setIsImportOpen={setIsImportOpen}
          isShareOpen={isShareOpen}
          setIsShareOpen={setIsShareOpen}
          logOut={logOut}
          selectedYear={selectedYear}
          isAnnual={isAnnual}
          currentMonthIdx={currentMonthIdx}
        />
      } />
      <Route path="/" element={<Navigate to={`/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/dashboard`} replace />} />
    </Routes>
  );
}

interface MainContentProps {
  user: User;
  profile: UserProfile | null;
  transactions: Transaction[];
  accounts: Account[];
  isFormOpen: boolean;
  setIsFormOpen: (v: boolean) => void;
  isImportOpen: boolean;
  setIsImportOpen: (v: boolean) => void;
  isShareOpen: boolean;
  setIsShareOpen: (v: boolean) => void;
  logOut: () => void;
  selectedYear: number;
  isAnnual: boolean;
  currentMonthIdx: number;
}

function MainContent({
  user, profile, transactions, accounts,
  isFormOpen, setIsFormOpen,
  isImportOpen, setIsImportOpen,
  isShareOpen, setIsShareOpen,
  logOut,
  selectedYear,
  isAnnual,
  currentMonthIdx
}: MainContentProps) {
  const { year, month, tab = 'dashboard' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filtros Avançados
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleYearChange = (delta: number) => {
    const newYear = selectedYear + delta;
    const newPath = location.pathname.replace(`/${selectedYear}/`, `/${newYear}/`);
    navigate(newPath);
  };

  const handleTabChange = (newValue: string) => {
    const parts = location.pathname.split('/').filter(Boolean);
    // parts: [year, month, tab] or [year, month]
    const updatedPath = `/${parts[0]}/${parts[1]}/${newValue}`;
    navigate(updatedPath);
  };

  const filteredTransactions = transactions.filter(tx => {
    const date = parseISO(tx.date);
    if (isAnnual) {
      return date.getFullYear() === selectedYear;
    }
    return date.getFullYear() === selectedYear && getMonth(date) === currentMonthIdx;
  });

  const listTransactions = filteredTransactions.filter(tx => {
    const matchCategory = categoryFilter === "all" || tx.category === categoryFilter;
    const matchPayment = paymentFilter === "all" || tx.paymentMethod === paymentFilter;
    const matchStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchCategory && matchPayment && matchStatus;
  });

  const hasActiveFilters = categoryFilter !== "all" || paymentFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setCategoryFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold shadow-sm">F</div>
            <h1 className="text-lg font-bold tracking-tight hidden xs:block">Finanças em Família</h1>
            <h1 className="text-lg font-bold tracking-tight xs:hidden">Finanly</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-zinc-100 rounded-lg p-0.5 sm:p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleYearChange(-1)}>
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <span className="px-2 sm:px-3 text-xs sm:text-sm font-bold text-zinc-700">{selectedYear}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleYearChange(1)}>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setIsShareOpen(true)} className="gap-2 text-zinc-600 hover:text-blue-600">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
            <div className="hidden md:flex items-center gap-2 text-sm text-zinc-500">
              <img src={user.photoURL || ""} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
              <span>{user.displayName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={logOut} title="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isAnnual ? `Resumo de ${selectedYear}` : `Finanças de ${format(new Date(selectedYear, currentMonthIdx, 1), 'MMMM yyyy', { locale: ptBR })}`}
            </h2>
            <p className="text-zinc-500">Olá {user.displayName?.split(' ')[0]}, acompanhe sua evolução financeira.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setIsImportOpen(true)} variant="outline" size="sm" className="gap-2 h-9">
              <Receipt className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Importar Fatura</span>
            </Button>
            <Button onClick={() => setIsFormOpen(true)} size="sm" className="gap-2 h-9 bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Nova Transação</span>
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex w-full overflow-x-auto flex-nowrap h-auto justify-start md:justify-center md:grid md:grid-cols-7 mb-6 bg-zinc-100/50 p-1 rounded-xl scrollbar-hide">
            <TabsTrigger value="dashboard" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2">
              <Receipt className="w-3.5 h-3.5" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2">
              <Flame className="w-3.5 h-3.5" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="installments" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2">
              <Layers className="w-3.5 h-3.5" />
              Parcelas
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2">
              <Target className="w-3.5 h-3.5" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="wallets" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2">
              <Wallet className="w-3.5 h-3.5" />
              Carteiras
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2 border-none">
              <Tag className="w-3.5 h-3.5" />
              Categorias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {isAnnual ? (
              <AnnualDashboard
                transactions={transactions}
                year={selectedYear}
                onSelectMonth={(m) => navigate(`/${selectedYear}/${(m + 1).toString().padStart(2, '0')}/dashboard`)}
              />
            ) : (
              <MonthlyDashboard
                month={currentMonthIdx}
                year={selectedYear}
                onBackToAnnual={() => navigate(`/${selectedYear}/annual/dashboard`)}
                transactions={filteredTransactions}
              />
            )}
            <GeminiInsights
              transactions={transactions}
              userName={user.displayName || 'você'}
            />
          </TabsContent>

          <TabsContent value="heatmap">
            <SpendingHeatmap transactions={transactions} />
          </TabsContent>

          <TabsContent value="installments">
            <InstallmentsTracker transactions={transactions} />
          </TabsContent>

          <TabsContent value="budgets">
            {profile ? (
              <BudgetManager
                profile={profile}
                transactions={transactions}
                userId={user.uid}
              />
            ) : (
              <div className="text-center py-12 text-zinc-400">Carregando perfil...</div>
            )}
          </TabsContent>

          <TabsContent value="wallets">
            <WalletManager
              accounts={accounts}
              transactions={transactions}
              userId={user.uid}
              sharedWith={profile?.sharedWith || []}
            />
          </TabsContent>

          <TabsContent value="categories">
            {profile ? (
              <CategoryManager
                profile={profile}
                userId={user.uid}
              />
            ) : (
              <div className="text-center py-12 text-zinc-400">Carregando perfil...</div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-500">
                  Exibindo <span className="font-bold text-zinc-900">{listTransactions.length}</span> de {filteredTransactions.length} transações
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-zinc-500 hover:text-rose-600 gap-1 h-8">
                      <X className="w-3 h-3" /> Limpar
                    </Button>
                  )}
                  <Button
                    variant={showFilters ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2 h-8"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {showFilters ? "Esconder Filtros" : "Filtrar"}
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-zinc-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Categoria</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Pagamento</label>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos os métodos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os métodos</SelectItem>
                        {PAYMENT_METHODS.map(method => (
                          <SelectItem key={method} value={method}>{method}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <TransactionList
                transactions={listTransactions}
                onEdit={(tx) => {
                  setEditingTransaction(tx);
                  setIsFormOpen(true);
                }}
                accounts={accounts}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(null);
        }}
        userId={user.uid}
        sharedWith={profile?.sharedWith || []}
        customCategories={profile?.customCategories || []}
        initialData={editingTransaction}
        accounts={accounts}
      />
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        userId={user.uid}
        sharedWith={profile?.sharedWith || []}
        customCategories={profile?.customCategories || []}
        currentYear={selectedYear}
        currentMonth={currentMonthIdx}
        existingTransactions={transactions}
      />
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        profile={profile}
      />
      <NLPChat
        transactions={transactions}
        userId={user.uid}
        sharedWith={profile?.sharedWith || []}
        userName={user.displayName || 'você'}
      />
      <Toaster position="top-right" />
    </div>
  );
}
