import React, { useState, useEffect, useMemo } from "react";
import { auth, db, signIn, logOut, Transaction, UserProfile, Account, Category, Budget } from "@/lib/firebase";
import { cn } from "@/lib/utils";
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
import LandingPage from "@/components/LandingPage";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { LayoutDashboard, Receipt, PlusCircle, LogOut, Users, ChevronLeft, ChevronRight, Filter, X, SlidersHorizontal, Flame, Layers, Target, Wallet, Tag, MoreVertical, UserCircle } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";
import ImportModal from "@/components/ImportModal";
import ShareModal from "@/components/ShareModal";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { getMonth, parseISO, format, addMonths, subMonths, setMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Routes, Route, Navigate, useParams, useNavigate, useLocation, useMatch } from "react-router-dom";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isGroupLoaded, setIsGroupLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupProfiles, setGroupProfiles] = useState<UserProfile[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
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

  // Group UIDs for stable dependencies (Stringified check)
  const groupUids = useMemo(() => {
    if (!user) return [];
    return Array.from(new Set([user.uid, ...groupProfiles.map(p => p.uid)].filter(Boolean))).sort();
  }, [user?.uid, groupProfiles]);

  const groupUidsKey = groupUids.join(',');

  // Group profiles real-time listener (Find everyone who shared with me)
  useEffect(() => {
    if (!user) return;

    const qSharedWithMe = query(
      collection(db, "users"),
      where("sharedWith", "array-contains", user.email)
    );

    const unsubscribeShared = onSnapshot(qSharedWithMe, (snapshot) => {
      const profiles = snapshot.docs.map(d => d.data() as UserProfile);
      setGroupProfiles(profiles);
      setIsGroupLoaded(true);
      console.log(`🤝 [Group] Encontrados ${profiles.length} perfis compartilhando com você.`);
    });

    return () => unsubscribeShared();
  }, [user]);

  // Profile real-time listener (Self)
  useEffect(() => {
    if (!user) return;
    const unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
    });
    return () => unsubscribeProfile();
  }, [user]);

  // Accounts real-time listener (Self + Shared)
  useEffect(() => {
    if (!user || groupUids.length === 0) return;

    // Listen for accounts owned by anyone in the group
    const qGroupAccounts = query(collection(db, "accounts"), where("userId", "in", groupUids));

    // Also listen for accounts explicitly shared with my email
    const qExplicitShared = query(collection(db, "accounts"), where("sharedWith", "array-contains", user.email ?? ""));

    const accMap = new Map<string, Account>();
    const update = (snap: any) => {
      snap.docChanges().forEach((change: any) => {
        if (change.type === "removed") accMap.delete(change.doc.id);
        else accMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Account);
      });
      setAccounts(Array.from(accMap.values()));
    };

    const u1 = onSnapshot(qGroupAccounts, update);
    const u2 = onSnapshot(qExplicitShared, update);

    return () => { u1(); u2(); };
  }, [user?.uid, groupUidsKey, user?.email]);

  useEffect(() => {
    if (!user || !profile || groupUids.length === 0) return;

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

    // Calculate group UIDs including self (already memoized)
    console.log(`📡 [Firestore] Carregando transações do grupo: ${groupUids.join(', ')}`);

    // Fetch transactions from everyone in the group
    const qGroupTxs = query(
      collection(db, "transactions"),
      where("userId", "in", groupUids),
      where("date", ">=", dateStart),
      where("date", "<=", dateEnd),
      orderBy("date", "desc")
    );

    // Fetch transactions shared with this user's email (legacy/external sharing)
    const qExplicitSharedTxs = query(
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

    const unsubGroup = onSnapshot(qGroupTxs, {
      next: updateTxs,
      error: (err) => {
        console.error("Erro na consulta do grupo:", err);
        if (err.code === 'failed-precondition') {
          toast.error("Erro de índice no Firebase. Verifique o console.");
        }
      }
    });

    const unsubShared = onSnapshot(qExplicitSharedTxs, {
      next: updateTxs,
      error: (err) => {
        console.error("Erro na consulta compartilhada:", err);
      }
    });

    return () => {
      unsubGroup();
      unsubShared();
    };
  }, [user?.uid, profile?.uid, groupUidsKey, selectedYear, currentMonthIdx, isAnnual, user?.email]);

  if (loading || (user && !isGroupLoaded)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 flex-col gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <div className="text-zinc-400 font-medium animate-pulse text-sm">Sincronizando dados da família...</div>
      </div>
    );
  }


  return (
    <Routes>
      <Route path="/" element={
        <LandingPage 
          onLogin={() => navigate("/login")} 
          onSignUp={() => navigate("/signup")} 
        />
      } />
      <Route path="/login" element={
        user 
          ? <Navigate to={`/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/dashboard`} replace /> 
          : <Auth onSignIn={signIn} />
      } />
      <Route path="/signup" element={
        user 
          ? <Navigate to={`/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/dashboard`} replace /> 
          : <Auth onSignIn={signIn} />
      } />
      <Route path="/:year/:month?/:tab?" element={
        !user
          ? <Navigate to="/login" replace />
          : <MainContent
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
              groupProfiles={[profile, ...groupProfiles].filter((p): p is UserProfile => !!p)}
            />
      } />
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
  groupProfiles: UserProfile[];
}

function MainContent({
  user, profile, transactions, accounts,
  isFormOpen, setIsFormOpen,
  isImportOpen, setIsImportOpen,
  isShareOpen, setIsShareOpen,
  selectedYear,
  isAnnual,
  currentMonthIdx,
  groupProfiles
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
  const [walletFilter, setWalletFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const MONTHS = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const handleYearChange = (delta: number | string) => {
    const newYear = typeof delta === 'number' ? selectedYear + delta : parseInt(delta);
    const pathParts = location.pathname.split('/').filter(Boolean);
    // pathParts: [year, month, tab]
    pathParts[0] = newYear.toString();
    navigate(`/${pathParts.join('/')}`);
  };

  const handleMonthChange = (newMonth: string) => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    // index 0 is year, index 1 is month
    pathParts[1] = newMonth;
    navigate(`/${pathParts.join('/')}`);
  };

  const handleNavigateMonth = (delta: number) => {
    const currentDate = isAnnual
      ? new Date(selectedYear, 0, 1)
      : new Date(selectedYear, currentMonthIdx, 1);

    const newDate = delta > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    const newYear = newDate.getFullYear();
    const newMonth = (newDate.getMonth() + 1).toString().padStart(2, '0');

    const pathParts = location.pathname.split('/').filter(Boolean);
    // pathParts: [year, month, tab]
    pathParts[0] = newYear.toString();
    pathParts[1] = newMonth;
    navigate(`/${pathParts.join('/')}`);
  };

  const handleToggleView = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (isAnnual) {
      // Go to January of the same year (or current month if it feels better)
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      pathParts[1] = currentMonth;
    } else {
      pathParts[1] = 'annual';
    }
    navigate(`/${pathParts.join('/')}`);
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
    const matchWallet = walletFilter === "all" || tx.accountId === walletFilter;
    const matchUser = userFilter === "all" || tx.userId === userFilter;
    return matchCategory && matchPayment && matchStatus && matchWallet && matchUser;
  });

  const selectedMonthValue = (currentMonthIdx + 1).toString().padStart(2, '0');
  const selectedMonthLabel = MONTHS.find(m => m.value === selectedMonthValue)?.label;

  const hasActiveFilters = categoryFilter !== "all" || paymentFilter !== "all" || statusFilter !== "all" || walletFilter !== "all" || userFilter !== "all";

  const clearFilters = () => {
    setCategoryFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
    setWalletFilter("all");
    setUserFilter("all");
  };

  // Aggregate Group Data
  const allCustomCategories = useMemo(() => {
    const catMap = new Map<string, Category>();
    groupProfiles.forEach(p => {
      p.customCategories?.forEach(c => catMap.set(c.name, c));
    });
    return Array.from(catMap.values());
  }, [groupProfiles]);

  const allBudgets = useMemo(() => {
    const budgetMap = new Map<string, Budget>();
    groupProfiles.forEach(p => {
      p.budgets?.forEach(b => budgetMap.set(b.category, b));
    });
    return Array.from(budgetMap.values());
  }, [groupProfiles]);

  const allSharedEmails = useMemo(() => {
    const emails = new Set<string>();
    groupProfiles.forEach(p => {
      emails.add(p.email);
      p.sharedWith?.forEach(e => emails.add(e));
    });
    return Array.from(emails).filter(e => e !== user.email);
  }, [groupProfiles, user.email]);

  const aggregatedProfile = useMemo(() => ({
    ...profile!,
    customCategories: allCustomCategories,
    budgets: allBudgets,
    sharedWith: allSharedEmails
  }), [profile, allCustomCategories, allBudgets, allSharedEmails]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-2 sm:px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Branding */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">F</div>
            <div className="flex flex-col -gap-1 hidden xs:flex lg:flex">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 leading-none">Finanly</h1>
              <span className="text-[10px] font-medium text-zinc-400">Família</span>
            </div>
          </div>

          {/* Center: Month/Temporal Navigation (The Heart of the UX) */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-zinc-100"
              onClick={() => handleNavigateMonth(-1)}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <div className="flex flex-col items-center">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-zinc-900 capitalize min-w-[100px] sm:min-w-[140px] text-center">
                {isAnnual
                  ? selectedYear
                  : format(new Date(selectedYear, currentMonthIdx, 1), 'MMMM yyyy', { locale: ptBR })
                }
              </h2>
              {isAnnual && <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Visão Anual</span>}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-zinc-100"
              onClick={() => handleNavigateMonth(1)}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>

          {/* Right: Actions & User (Responsive) */}
          <div className="flex items-center gap-2">
            {/* Desktop Quick Actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={isAnnual ? "default" : "outline"}
                size="sm"
                onClick={handleToggleView}
                className={cn(
                  "h-9 px-4 rounded-full font-bold text-xs gap-2 transition-all",
                  isAnnual ? "bg-blue-600 shadow-md shadow-blue-100" : "bg-white border-zinc-200"
                )}
              >
                <Target className="w-3.5 h-3.5" />
                {isAnnual ? "Ver Mensal" : "Ver Anual"}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsShareOpen(true)}
                className="h-9 w-9 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-full border border-zinc-100"
                title="Compartilhar"
              >
                <Users className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-zinc-200 mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button className="flex items-center gap-2 p-1 pl-1 pr-1.5 sm:pr-3 rounded-full bg-white border border-zinc-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all shadow-sm outline-none group shrink-0">
                    <img src={user.photoURL || ""} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white shadow-sm object-cover" referrerPolicy="no-referrer" />
                    <div className="flex flex-col items-start hidden sm:flex">
                      <span className="text-[11px] font-bold text-zinc-900 leading-tight">{user.displayName?.split(' ')[0]}</span>
                      <span className="text-[9px] text-zinc-500 font-medium leading-tight">Perfil</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={12}>
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-zinc-100 mb-1">
                    <img src={user.photoURL || ""} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-zinc-900">{user.displayName}</span>
                      <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">{user.email}</span>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={logOut} variant="destructive">
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Hamburger Menu (Consolidates everything else) */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-zinc-50 border border-zinc-200">
                    <MoreVertical className="w-5 h-5 text-zinc-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={12} className="min-w-[200px]">
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-zinc-100 mb-2">
                    <img src={user.photoURL || ""} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-zinc-900 leading-none">{user.displayName?.split(' ')[0]}</span>
                      <span className="text-[10px] text-zinc-500 mt-1">Conectado</span>
                    </div>
                  </div>

                  <DropdownMenuItem onClick={handleToggleView} className="gap-3 py-2.5">
                    <Target className="w-4 h-4 text-blue-600" />
                    {isAnnual ? "Ver Visualização Mensal" : "Ver Visualização Anual"}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setIsShareOpen(true)} className="gap-3 py-2.5">
                    <Users className="w-4 h-4 text-zinc-600" />
                    Compartilhar Conta
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={logOut} variant="destructive" className="gap-3 py-2.5">
                    <LogOut className="w-4 h-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
          <TabsList className={cn(
            "flex w-full overflow-x-auto flex-nowrap h-auto justify-start md:justify-center mb-6 bg-zinc-100/50 p-1 rounded-xl scrollbar-hide md:grid",
            isAnnual ? "md:grid-cols-2 max-w-md" : "md:grid-cols-7"
          )}>
            <TabsTrigger value="dashboard" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex-none gap-1.5 text-[11px] sm:text-xs px-5 py-2">
              <Receipt className="w-3.5 h-3.5" />
              Transações
            </TabsTrigger>

            {!isAnnual && (
              <>
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
              </>
            )}
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
                profile={aggregatedProfile}
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
              sharedWith={aggregatedProfile.sharedWith}
            />
          </TabsContent>

          <TabsContent value="categories">
            {profile ? (
              <CategoryManager
                profile={aggregatedProfile}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-white rounded-xl border border-zinc-200 animate-in fade-in slide-in-from-top-2 duration-200">
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

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Carteira</label>
                    <Select value={walletFilter} onValueChange={setWalletFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todas as carteiras" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as carteiras</SelectItem>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id!}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Usuário</label>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos os usuários" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os usuários</SelectItem>
                        {groupProfiles.map(p => (
                          <SelectItem key={p.uid} value={p.uid}>{p.displayName}</SelectItem>
                        ))}
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
        sharedWith={aggregatedProfile.sharedWith}
        customCategories={aggregatedProfile.customCategories}
        initialData={editingTransaction}
        accounts={accounts}
      />
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        userId={user.uid}
        sharedWith={aggregatedProfile.sharedWith}
        customCategories={aggregatedProfile.customCategories}
        currentYear={selectedYear}
        currentMonth={currentMonthIdx}
        existingTransactions={transactions}
        accounts={accounts}
      />
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        profile={profile}
      />
      <NLPChat
        transactions={transactions}
        userId={user.uid}
        sharedWith={aggregatedProfile.sharedWith}
        userName={user.displayName || 'você'}
      />
      <Toaster position="top-right" />
    </div>
  );
}
