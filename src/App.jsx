import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import July from './components/July';
import Dashboard from './components/Dashboard';
import Goals from './components/Goals';
import Reports from './components/Reports';
import Login from './components/Login';
import './App.css';
import Notifications from './components/Notifications';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Autenticação do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Carregar transações quando o usuário estiver autenticado
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      
      try {
        setLoadingTransactions(true);
        console.log("Buscando transações para o usuário:", user.uid);
        
        // Use o método onSnapshot para obter atualizações em tempo real
        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const fetchedTransactions = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            console.log("Transações carregadas:", fetchedTransactions.length);
            
            // Ordenar por data (mais recentes primeiro)
            fetchedTransactions.sort((a, b) => 
              new Date(b.date) - new Date(a.date)
            );
            
            setTransactions(fetchedTransactions);
            setLoadingTransactions(false);
          },
          (error) => {
            console.error('Erro ao buscar transações:', error);
            setLoadingTransactions(false);
          }
        );
        
        // Limpeza ao desmontar
        return () => unsubscribe();
      } catch (error) {
        console.error('Erro ao configurar listener:', error);
        setLoadingTransactions(false);
      }
    };

    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Renderiza o componente de loading
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
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
            <button onClick={handleLogout} className="logout-button">
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="app-tabs">
        <div className="container">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''} 
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={activeTab === 'register' ? 'active' : ''} 
            onClick={() => setActiveTab('register')}
          >
            Registrar
          </button>
          <button 
            className={activeTab === 'reports' ? 'active' : ''} 
            onClick={() => setActiveTab('reports')}
          >
            Relatórios
          </button>
          <button 
            className={activeTab === 'goals' ? 'active' : ''} 
            onClick={() => setActiveTab('goals')}
          >
            Metas
          </button>
        </div>
      </div>

      <main className="app-content">
        <div className="container">
          {loadingTransactions ? (
            <div className="loading-transactions">
              <div className="loading-spinner"></div>
              <p>Carregando dados...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  transactions={transactions} 
                />
              )}
              
              {activeTab === 'register' && (
                <July 
                  userId={user.uid}
                  onTransactionAdded={(newTransaction) => {
                    // Atualizar o estado de transações quando uma nova for adicionada
                    setTransactions([newTransaction, ...transactions]);
                  }}
                />
              )}
              
              {activeTab === 'reports' && (
                <Reports 
                  transactions={transactions} 
                />
              )}
              
              {activeTab === 'goals' && (
                <Goals 
                  userId={user.uid} 
                />
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