import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import July from "./components/July";
import Dashboard from "./components/Dashboard";
import Goals from "./components/Goals";
import Reports from "./components/Reports";
import Login from "./components/Login";
import LoadingScreen from "./components/LoadingScreen";
import ThemeToggle from "./components/ThemeToggle";
import BudgetManager from "./components/BudgetManager";
import BudgetAlerts from "./components/BudgetAlerts";
import {
  setupScrollSnapping,
  setupSwipeNavigation,
  enhanceTouchExperience,
} from "./mobile-touch-handler";
import "./App.css";
import Notifications from "./components/Notifications";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const tabsContainerRef = useRef(null);

  // Configurar suporte para gestos em dispositivos móveis
  useEffect(() => {
    // Ativar otimizações para dispositivos móveis
    enhanceTouchExperience();

    // Configurar navegação com gestos de deslizar
    const handleTabSwipe = (direction) => {
      const tabs = ["dashboard", "register", "reports", "goals", "budgets"];
      const currentIndex = tabs.indexOf(activeTab);
      let newIndex;

      if (direction === "next") {
        newIndex = Math.min(currentIndex + 1, tabs.length - 1);
      } else {
        newIndex = Math.max(currentIndex - 1, 0);
      }

      setActiveTab(tabs[newIndex]);
    };

    setupSwipeNavigation(".app-content", handleTabSwipe);

    // Configurar scroll suave para abas
    if (tabsContainerRef.current) {
      setupScrollSnapping(".mobile-tabs-container");
    }
  }, [activeTab]);

  // Autenticação do usuário
  useEffect(() => {
    console.log("App: Inicializando verificação de autenticação");

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        console.log(
          "App: Estado de autenticação alterado:",
          currentUser ? `Usuário: ${currentUser.uid}` : "Nenhum usuário"
        );
        setUser(currentUser);
        setLoading(false);
      },
      (error) => {
        console.error("App: Erro na verificação de autenticação:", error);
        setAuthError(`Erro de autenticação: ${error.message}`);
        setLoading(false);
      }
    );

    // Função de limpeza
    return () => {
      console.log("App: Removendo listener de autenticação");
      unsubscribe();
    };
  }, []);

  // Carregar transações quando o usuário estiver autenticado
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;

      try {
        setLoadingTransactions(true);
        setTransactionError(null);
        console.log("App: Buscando transações para o usuário:", user.uid);

        // Use o método onSnapshot para obter atualizações em tempo real
        const q = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid)
        );
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const fetchedTransactions = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            console.log(
              "App: Transações carregadas:",
              fetchedTransactions.length
            );

            // Remover possíveis duplicatas pelo ID
            const uniqueTransactions = [];
            const seenIds = new Set();

            fetchedTransactions.forEach((transaction) => {
              if (!seenIds.has(transaction.id)) {
                seenIds.add(transaction.id);
                uniqueTransactions.push(transaction);
              } else {
                console.warn(
                  "App: Transação duplicada detectada e removida:",
                  transaction.id
                );
              }
            });

            console.log(
              "App: Transações únicas após filtragem:",
              uniqueTransactions.length
            );

            // Ordenar por data (mais recentes primeiro)
            uniqueTransactions.sort(
              (a, b) => new Date(b.date) - new Date(a.date)
            );

            setTransactions(uniqueTransactions);
            setLoadingTransactions(false);
          },
          (error) => {
            console.error("App: Erro ao buscar transações:", error);
            setTransactionError(
              `Erro ao carregar transações: ${error.message}`
            );
            setLoadingTransactions(false);
          }
        );

        // Limpeza ao desmontar
        return () => {
          console.log("App: Removendo listener de transações");
          unsubscribe();
        };
      } catch (error) {
        console.error("App: Erro ao configurar listener:", error);
        setTransactionError(`Erro ao configurar listener: ${error.message}`);
        setLoadingTransactions(false);
      }
    };

    if (user) {
      fetchTransactions();
    }
  }, [user]);

  // Carregar orçamentos quando o usuário estiver autenticado
  useEffect(() => {
    const fetchBudgets = async () => {
      if (!user) return;

      try {
        setLoadingBudgets(true);
        console.log("App: Buscando orçamentos para o usuário:", user.uid);

        // Use o método onSnapshot para obter atualizações em tempo real
        const q = query(
          collection(db, "budgets"),
          where("userId", "==", user.uid)
        );
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const fetchedBudgets = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            console.log("App: Orçamentos carregados:", fetchedBudgets.length);

            setBudgets(fetchedBudgets);
            setLoadingBudgets(false);
          },
          (error) => {
            console.error("App: Erro ao buscar orçamentos:", error);
            setLoadingBudgets(false);
          }
        );

        // Limpeza ao desmontar
        return () => {
          console.log("App: Removendo listener de orçamentos");
          unsubscribe();
        };
      } catch (error) {
        console.error("App: Erro ao configurar listener de orçamentos:", error);
        setLoadingBudgets(false);
      }
    };

    if (user) {
      fetchBudgets();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      console.log("App: Iniciando processo de logout");
      await signOut(auth);
      console.log("App: Logout realizado com sucesso");
    } catch (error) {
      console.error("App: Erro ao fazer logout:", error);
      alert(`Erro ao fazer logout: ${error.message}`);
    }
  };

  // Renderiza o componente de loading
  if (loading) {
    return <LoadingScreen message="Verificando autenticação..." />;
  }

  // Se houver erro de autenticação
  if (authError) {
    return <LoadingScreen error={authError} />;
  }

  // Renderiza o componente de login se o usuário não estiver autenticado
  if (!user) {
    return <Login />;
  }

  // Renderiza o componente principal
  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <div className="app-logo">
            <h1>July</h1>
          </div>
          <div className="user-info">
            <span>Olá, {user.email}</span>
            <div className="development-badge">Desenvolvimento</div>
            <Notifications userId={user.uid} />
            <ThemeToggle />
            <button onClick={handleLogout} className="logout-button">
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="app-tabs">
        <div className="container mobile-tabs-container" ref={tabsContainerRef}>
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={activeTab === "register" ? "active" : ""}
            onClick={() => setActiveTab("register")}
          >
            Registrar
          </button>
          <button
            className={activeTab === "reports" ? "active" : ""}
            onClick={() => setActiveTab("reports")}
          >
            Relatórios
          </button>
          <button
            className={activeTab === "goals" ? "active" : ""}
            onClick={() => setActiveTab("goals")}
          >
            Metas
          </button>
          <button
            className={activeTab === "budgets" ? "active" : ""}
            onClick={() => setActiveTab("budgets")}
          >
            Orçamentos
          </button>
        </div>
      </div>

      <main className="app-content">
        <div className="container">
          {loadingTransactions ? (
            <LoadingScreen message="Carregando transações..." />
          ) : transactionError ? (
            <div className="error-message">
              <h3>Erro ao carregar dados</h3>
              <p>{transactionError}</p>
              <button onClick={() => window.location.reload()}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Exibir alertas de orçamento na parte superior quando no dashboard */}
              {activeTab === "dashboard" && budgets.length > 0 && (
                <BudgetAlerts budgets={budgets} transactions={transactions} />
              )}

              {activeTab === "dashboard" && (
                <Dashboard transactions={transactions} />
              )}

              {activeTab === "register" && (
                <July
                  userId={user.uid}
                  transactions={transactions}
                  onTransactionAdded={() => {
                    // A atualização do estado é feita automaticamente pelo listener do Firestore
                    // Não precisamos adicionar manualmente para evitar duplicação
                  }}
                />
              )}

              {activeTab === "reports" && (
                <Reports transactions={transactions} />
              )}

              {activeTab === "goals" && <Goals userId={user.uid} />}

              {activeTab === "budgets" && (
                <BudgetManager userId={user.uid} transactions={transactions} />
              )}
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>July © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
