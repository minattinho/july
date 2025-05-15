// src/components/FinanceOrganizer.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  writeBatch,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { TagSelector } from './FinanceOrganizerExtended';
import { checkSpendingLimit, checkGoalDeadlines, checkRecurringTransactions } from '../utils/notificationSystem';
import './FinanceOrganizer.css';
import './TagSelector.css';

export default function FinanceOrganizer({ userId, onTransactionAdded }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('general_expense');
  const [paymentMethod, setPaymentMethod] = useState('money');
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [activeScreen, setActiveScreen] = useState('register');
  const [syncStatus, setSyncStatus] = useState('synced');
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  const [offlineTransactions, setOfflineTransactions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  
  // Categorias separadas para despesas e receitas
  const expenseCategories = [
    { id: 'general_expense', name: 'Geral' },
    { id: 'food', name: 'Alimentação' },
    { id: 'transport', name: 'Transporte' },
    { id: 'housing', name: 'Moradia' },
    { id: 'entertainment', name: 'Lazer' },
    { id: 'health', name: 'Saúde' },
    { id: 'education', name: 'Educação' },
    { id: 'clothing', name: 'Vestuário' },
    { id: 'utilities', name: 'Contas & Serviços' }
  ];
  
  // Métodos de pagamento
  const paymentMethods = [
    { id: 'money', name: 'Dinheiro' },
    { id: 'debit_card', name: 'Cartão de Débito' },
    { id: 'credit_card', name: 'Cartão de Crédito' },
    { id: 'pix', name: 'Pix' },
    { id: 'bank_transfer', name: 'Transferência' },
    { id: 'bill', name: 'Boleto' }
  ];
  
  const incomeCategories = [
    { id: 'general_income', name: 'Geral' },
    { id: 'salary', name: 'Salário' },
    { id: 'freelance', name: 'Freelance' },
    { id: 'investments', name: 'Investimentos' },
    { id: 'gifts', name: 'Presentes' },
    { id: 'sales', name: 'Vendas' },
    { id: 'rental', name: 'Aluguel' },
    { id: 'refunds', name: 'Reembolsos' }
  ];
  
  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Load offline transactions
  useEffect(() => {
    const savedOfflineTransactions = localStorage.getItem('offlineTransactions');
    if (savedOfflineTransactions) {
      setOfflineTransactions(JSON.parse(savedOfflineTransactions));
    }
  }, []);
  
  // Synchronize offline transactions when back online
  useEffect(() => {
    if (networkStatus && offlineTransactions.length > 0 && userId) {
      syncOfflineTransactions();
    }
  }, [networkStatus, offlineTransactions, userId]);
  
  // Sincronizar transações offline
  const syncOfflineTransactions = async () => {
    if (offlineTransactions.length === 0) return;
    
    setSyncStatus('syncing');
    
    try {
      // Use batch for better performance and atomicity
      const batch = writeBatch(db);
      
      // Process each offline transaction
      for (const transaction of offlineTransactions) {
        if (transaction._operation === 'add') {
          // For new transactions
          const { _operation, _localId, ...transactionData } = transaction;
          const newDocRef = doc(collection(db, 'transactions'));
          batch.set(newDocRef, {
            ...transactionData,
            userId,
            syncedAt: serverTimestamp()
          });
        } else if (transaction._operation === 'delete' && transaction.id) {
          // For deleted transactions
          batch.delete(doc(db, 'transactions', transaction.id));
        }
      }
      
      // Commit the batch
      await batch.commit();
      
      // Clear offline transactions
      setOfflineTransactions([]);
      localStorage.removeItem('offlineTransactions');
      
      // Refresh transactions list (real-time listener will handle this)
      setSyncStatus('synced');
    } catch (error) {
      console.error('Erro ao sincronizar transações offline:', error);
      setSyncStatus('error');
    }
  };
  
  // Função para obter todas as categorias (para exibição)
  const getAllCategories = () => {
    return [...expenseCategories, ...incomeCategories];
  };
  
  // Load transactions from Firestore with real-time updates
  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    
    // Create query for user's transactions
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('userId', '==', userId)
    );
    
    // Set up real-time listener
    try {
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const fetchedTransactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date instanceof Date ? 
              doc.data().date.toISOString() : 
              doc.data().date
          }));
          
          // Ordenar por data (mais recentes primeiro)
          fetchedTransactions.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
          );
          
          setTransactions(fetchedTransactions);
          setLoading(false);
          setSyncStatus('synced');
        },
        (error) => {
          console.error('Erro ao buscar transações:', error);
          setLoading(false);
          setSyncStatus('error');
          
          // If error, try to load from localStorage as fallback
          const cachedTransactions = localStorage.getItem('cachedTransactions');
          if (cachedTransactions) {
            setTransactions(JSON.parse(cachedTransactions));
          }
        }
      );
      
      // Cleanup listener
      return () => unsubscribe();
    } catch (error) {
      console.error('Erro ao configurar listener de transações:', error);
      setLoading(false);
      setSyncStatus('error');
    }
  }, [userId]);
  
  // Cache transactions in localStorage for offline access
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('cachedTransactions', JSON.stringify(transactions));
    }
  }, [transactions]);
  
  // Efeito para atualizar a categoria quando o tipo mudar
  useEffect(() => {
    if (type === 'expense') {
      setCategory('general_expense');
    } else {
      setCategory('general_income');
      setIsRecurring(false);
      setInstallments(1);
    }
  }, [type]);
  
  // Adicionar transação
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    
    const baseAmount = Number(amount);
    const now = new Date();
    
    // Handle installments
    if (isRecurring && type === 'expense' && installments > 1) {
      // Calculate installment amount
      const installmentAmount = baseAmount / installments;
      const groupId = Date.now().toString();
      
      // Create an array for batch transactions
      const newTransactions = [];
      
      // Create a transaction for each installment
      for (let i = 0; i < installments; i++) {
        const installmentDate = new Date();
        installmentDate.setMonth(now.getMonth() + i);
        
        const newTransaction = {
          userId,
          description: `${description} (${i+1}/${installments})`,
          amount: -installmentAmount,
          type,
          category,
          paymentMethod,
          date: installmentDate,
          isInstallment: true,
          installmentNumber: i + 1,
          totalInstallments: installments,
          originalAmount: baseAmount,
          groupId,
          createdAt: now,
          tags: selectedTags.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color
          }))
        };
        
        newTransactions.push(newTransaction);
      }
      
      if (networkStatus) {
        try {
          setSyncStatus('syncing');
          
          // Use batch for better performance
          const batch = writeBatch(db);
          
          newTransactions.forEach(transaction => {
            const newDocRef = doc(collection(db, 'transactions'));
            batch.set(newDocRef, transaction);
          });
          
          await batch.commit();
          
          // Verificar a primeira parcela para notificações
          const firstInstallment = {
            id: newDocRef.id,
            ...newTransactions[0]
          };
          await checkSpendingLimit(userId, firstInstallment);
          
          // Verificar transações recorrentes
          await checkRecurringTransactions(userId);
          
          setSyncStatus('synced');
          
          // Notificar o componente pai
          if (onTransactionAdded) {
            onTransactionAdded(newTransactions[0]);
          }
        } catch (error) {
          console.error('Erro ao adicionar transações:', error);
          setSyncStatus('error');
          
          // Store offline for later sync
          const offlineTransactionsToAdd = newTransactions.map(transaction => ({
            ...transaction,
            _operation: 'add',
            _localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));
          
          const updatedOfflineTransactions = [...offlineTransactions, ...offlineTransactionsToAdd];
          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
        }
      } else {
        // Store offline for later sync
        const offlineTransactionsToAdd = newTransactions.map(transaction => ({
          ...transaction,
          _operation: 'add',
          _localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));
        
        const updatedOfflineTransactions = [...offlineTransactions, ...offlineTransactionsToAdd];
        setOfflineTransactions(updatedOfflineTransactions);
        localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
        
        // Update local transactions view
        const localTransactionsView = offlineTransactionsToAdd.map(t => ({
          ...t,
          id: t._localId,
          date: t.date instanceof Date ? t.date.toISOString() : t.date
        }));
        
        setTransactions([...localTransactionsView, ...transactions]);
      }
    } else {
      // Single transaction
      const newTransaction = {
        userId,
        description,
        amount: type === 'expense' ? -Math.abs(baseAmount) : Math.abs(baseAmount),
        type,
        category,
        paymentMethod,
        date: now,
        isInstallment: false,
        createdAt: now,
        tags: selectedTags.map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tag.color
        }))
      };
      
      if (networkStatus) {
        try {
          setSyncStatus('syncing');
          
          const docRef = await addDoc(collection(db, 'transactions'), newTransaction);
          const addedTransaction = {
            id: docRef.id,
            ...newTransaction
          };
          
          // Verificar limite de gastos para notificações
          await checkSpendingLimit(userId, addedTransaction);
          
          setSyncStatus('synced');
          
          // Notificar o componente pai
          if (onTransactionAdded) {
            onTransactionAdded(addedTransaction);
          }
        } catch (error) {
          console.error('Erro ao adicionar transação:', error);
          setSyncStatus('error');
          
          // Store offline for later sync
          const offlineTransaction = {
            ...newTransaction,
            _operation: 'add',
            _localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          const updatedOfflineTransactions = [...offlineTransactions, offlineTransaction];
          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
          
          // Update local transactions view
          setTransactions([
            {
              ...offlineTransaction,
              id: offlineTransaction._localId,
              date: offlineTransaction.date instanceof Date ? 
                offlineTransaction.date.toISOString() : 
                offlineTransaction.date
            },
            ...transactions
          ]);
        }
      } else {
        // Store offline for later sync
        const offlineTransaction = {
          ...newTransaction,
          _operation: 'add',
          _localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        const updatedOfflineTransactions = [...offlineTransactions, offlineTransaction];
        setOfflineTransactions(updatedOfflineTransactions);
        localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
        
        // Update local transactions view
        setTransactions([
          {
            ...offlineTransaction,
            id: offlineTransaction._localId,
            date: offlineTransaction.date instanceof Date ? 
              offlineTransaction.date.toISOString() : 
              offlineTransaction.date
          },
          ...transactions
        ]);
      }
    }
    
    // Clear form
    setDescription('');
    setAmount('');
    setIsRecurring(false);
    setInstallments(1);
    setPaymentMethod('money');
    setSelectedTags([]);
  };
  
  // Excluir transação
  const deleteTransaction = async (id, groupId) => {
    // Check if it's a local temporary ID
    const isLocalId = id.toString().startsWith('local_');
    
    if (groupId) {
      if (window.confirm('Deseja excluir todas as parcelas desta compra?')) {
        if (networkStatus && !isLocalId) {
          try {
            setSyncStatus('syncing');
            
            // Fetch all transactions in the group
            const transactionsRef = collection(db, 'transactions');
            const q = query(
              transactionsRef,
              where('userId', '==', userId),
              where('groupId', '==', groupId)
            );
            
            const querySnapshot = await getDocs(q);
            
            // Delete all transactions in the group
            const batch = writeBatch(db);
            querySnapshot.docs.forEach((document) => {
              batch.delete(doc(db, 'transactions', document.id));
            });
            
            await batch.commit();
            setSyncStatus('synced');
          } catch (error) {
            console.error('Erro ao excluir grupo de transações:', error);
            setSyncStatus('error');
            
            // Handle offline deletion
            const groupTransactions = transactions.filter(t => t.groupId === groupId);
            
            const updatedOfflineTransactions = [
              ...offlineTransactions,
              ...groupTransactions.map(t => ({
                id: t.id,
                _operation: 'delete'
              }))
            ];
            
            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
            
            // Update local view
            setTransactions(transactions.filter(t => t.groupId !== groupId));
          }
        } else {
          // Handle offline or local temporary ID deletion
          const groupTransactions = transactions.filter(t => t.groupId === groupId);
          
          if (isLocalId) {
            // If it's a local ID, remove from offline transactions
            const updatedOfflineTransactions = offlineTransactions.filter(
              t => !t._localId || !groupTransactions.some(gt => gt.id === t._localId)
            );
            
            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
          } else {
            // Add to offline transactions for later deletion
            const updatedOfflineTransactions = [
              ...offlineTransactions,
              ...groupTransactions.map(t => ({
                id: t.id,
                _operation: 'delete'
              }))
            ];
            
            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
          }
          
          // Update local view
          setTransactions(transactions.filter(t => t.groupId !== groupId));
        }
      }
    } else {
      if (networkStatus && !isLocalId) {
        try {
          setSyncStatus('syncing');
          
          await deleteDoc(doc(db, 'transactions', id));
          
          setSyncStatus('synced');
        } catch (error) {
          console.error('Erro ao excluir transação:', error);
          setSyncStatus('error');
          
          // Add to offline transactions for later deletion
          const updatedOfflineTransactions = [
            ...offlineTransactions,
            { id, _operation: 'delete' }
          ];
          
          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
          
          // Update local view
          setTransactions(transactions.filter(t => t.id !== id));
        }
      } else {
        if (isLocalId) {
          // If it's a local ID, remove from offline transactions
          const updatedOfflineTransactions = offlineTransactions.filter(
            t => !t._localId || t._localId !== id
          );
          
          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
        } else {
          // Add to offline transactions for later deletion
          const updatedOfflineTransactions = [
            ...offlineTransactions,
            { id, _operation: 'delete' }
          ];
          
          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem('offlineTransactions', JSON.stringify(updatedOfflineTransactions));
        }
        
        // Update local view
        setTransactions(transactions.filter(t => t.id !== id));
      }
    }
  };
  
  // Funções de cálculo e formatação
  const calculateBalance = () => {
    return transactions.reduce((acc, transaction) => acc + Number(transaction.amount), 0).toFixed(2);
  };
  
  const calculateIncome = () => {
    return transactions
      .filter(transaction => transaction.amount > 0)
      .reduce((acc, transaction) => acc + Number(transaction.amount), 0)
      .toFixed(2);
  };
  
  const calculateExpenses = () => {
    return transactions
      .filter(transaction => transaction.amount < 0)
      .reduce((acc, transaction) => acc + Number(transaction.amount), 0)
      .toFixed(2);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const getCategoryName = (categoryId) => {
    const allCategories = getAllCategories();
    const category = allCategories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Não categorizado';
  };

  const getPaymentMethodName = (methodId) => {
    const method = paymentMethods.find(m => m.id === methodId);
    return method ? method.name : 'Outros';
  };
  
  // Renderização do componente
  return (
    <div className="finance-app">
      {/* Indicadores de status de sincronização */}
      {syncStatus === 'syncing' && (
        <div className="sync-indicator syncing">
          <span className="sync-icon">↻</span> Sincronizando dados...
        </div>
      )}
      
      {syncStatus === 'error' && (
        <div className="sync-indicator error">
          <span className="sync-icon">⚠</span> 
          Erro de sincronização. 
          {offlineTransactions.length > 0 && (
            <button 
              onClick={syncOfflineTransactions} 
              className="sync-button"
              disabled={!networkStatus}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      
      {!networkStatus && (
        <div className="sync-indicator offline">
          <span className="sync-icon">📶</span> 
          Modo offline. Os dados serão sincronizados quando você estiver online.
        </div>
      )}
      
      {/* Formulário de registro de transação */}
      <section className="transaction-form">
        <h2>Nova Transação</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="description">Descrição</label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado, Salário, etc."
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="amount">Valor (R$)</label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Tipo</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="category">Categoria</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {type === 'expense' ? (
                  expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                ) : (
                  incomeCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                )}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="paymentMethod">Método de Pagamento</label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {paymentMethods.map(method => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {type === 'expense' && (
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  Despesa parcelada
                </label>
              </div>
              
              {isRecurring && (
                <div className="form-group">
                  <label htmlFor="installments">Número de parcelas</label>
                  <input
                    type="number"
                    id="installments"
                    value={installments}
                    onChange={(e) => setInstallments(Math.max(2, parseInt(e.target.value) || 2))}
                    min="2"
                    max="72"
                  />
                </div>
              )}
            </div>
          )}
          
          <div className="form-row">
            <TagSelector 
              userId={userId}
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
            />
          </div>
          
          <button type="submit" className="submit-button">
            Adicionar Transação
          </button>
        </form>
      </section>
      
      {/* Lista de transações recentes */}
      <section className="transactions-list">
        <h2>Transações Recentes</h2>
        
        {loading ? (
          <div className="loading">Carregando transações...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma transação registrada ainda.</p>
            <p>Adicione sua primeira transação usando o formulário acima.</p>
          </div>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Método de Pagamento</th>
                <th>Tags</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map(transaction => {
                const isOffline = transaction.id.toString().startsWith('local_');
                
                return (
                  <tr key={transaction.id} className={isOffline ? 'offline-transaction' : ''}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.description}</td>
                    <td>{getCategoryName(transaction.category)}</td>
                    <td>{transaction.paymentMethod ? getPaymentMethodName(transaction.paymentMethod) : 'Não especificado'}</td>
                    <td className="transaction-tags">
                      {transaction.tags && transaction.tags.map(tag => (
                        <span 
                          key={tag.id} 
                          className="tag-pill" 
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </td>
                    <td className={transaction.amount >= 0 ? 'positive' : 'negative'}>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(transaction.amount)}
                    </td>
                    <td>
                      <button
                        className="delete-button"
                        onClick={() => deleteTransaction(transaction.id, transaction.groupId)}
                        title="Excluir transação"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        
        {transactions.length > 10 && (
          <div className="view-more">
            <button onClick={() => setActiveScreen('history')}>
              Ver todas as transações
            </button>
          </div>
        )}
      </section>
      
      {/* Resumo financeiro */}
      <section className="financial-summary">
        <div className="summary-card">
          <h3>Saldo</h3>
          <div className={`amount ${calculateBalance() >= 0 ? 'positive' : 'negative'}`}>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(calculateBalance())}
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Receitas</h3>
          <div className="amount positive">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(calculateIncome())}
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Despesas</h3>
          <div className="amount negative">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(Math.abs(calculateExpenses()))}
          </div>
        </div>
      </section>
    </div>
  );
}
