// src/components/FinanceOrganizer.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
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
  serverTimestamp,
} from "firebase/firestore";
import { TagSelector } from "./FinanceOrganizerExtended";
import TransactionsList from "./TransactionsList";
import {
  checkSpendingLimit,
  checkGoalDeadlines,
  checkRecurringTransactions,
} from "../utils/notificationSystem";
import "./July.css";
import "./TagSelector.css";

// Utilitário para garantir que temos uma data válida
const ensureValidDate = (date) => {
  try {
    if (!date) return new Date();

    if (date instanceof Date) {
      return isNaN(date.getTime()) ? new Date() : date;
    }

    if (typeof date === "string") {
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }

    if (date && typeof date === "object" && date.toDate) {
      try {
        const firestoreDate = date.toDate();
        return isNaN(firestoreDate.getTime()) ? new Date() : firestoreDate;
      } catch (e) {
        console.error("Erro ao converter timestamp do Firestore:", e);
        return new Date();
      }
    }

    // Fallback para casos não tratados
    return new Date();
  } catch (e) {
    console.error("Erro ao processar data:", e);
    return new Date();
  }
};

export default function FinanceOrganizer({
  userId,
  onTransactionAdded,
  transactions: appTransactions,
}) {
  // Removendo o estado local de transações e usando as transações do App
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("general_expense");
  const [paymentMethod, setPaymentMethod] = useState("money");
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Formato YYYY-MM-DD
  });
  const [activeScreen, setActiveScreen] = useState("register");
  const [syncStatus, setSyncStatus] = useState("synced");
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  const [offlineTransactions, setOfflineTransactions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // Variável para controlar a submissão

  // Categorias separadas para despesas e receitas
  const expenseCategories = [
    { id: "general_expense", name: "Geral" },
    { id: "food", name: "Alimentação" },
    { id: "transport", name: "Transporte" },
    { id: "housing", name: "Moradia" },
    { id: "entertainment", name: "Lazer" },
    { id: "health", name: "Saúde" },
    { id: "education", name: "Educação" },
    { id: "clothing", name: "Vestuário" },
    { id: "utilities", name: "Contas & Serviços" },
  ];

  // Métodos de pagamento
  const paymentMethods = [
    { id: "money", name: "Dinheiro" },
    { id: "debit_card", name: "Cartão de Débito" },
    { id: "credit_card", name: "Cartão de Crédito" },
    { id: "pix", name: "Pix" },
    { id: "bank_transfer", name: "Transferência" },
    { id: "bill", name: "Boleto" },
  ];

  const incomeCategories = [
    { id: "general_income", name: "Geral" },
    { id: "salary", name: "Salário" },
    { id: "freelance", name: "Freelance" },
    { id: "investments", name: "Investimentos" },
    { id: "gifts", name: "Presentes" },
    { id: "sales", name: "Vendas" },
    { id: "rental", name: "Aluguel" },
    { id: "refunds", name: "Reembolsos" },
  ];

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load offline transactions
  useEffect(() => {
    const savedOfflineTransactions = localStorage.getItem(
      "offlineTransactions"
    );
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

    setSyncStatus("syncing");

    try {
      // Use batch for better performance and atomicity
      const batch = writeBatch(db);

      // Process each offline transaction
      for (const transaction of offlineTransactions) {
        if (transaction._operation === "add") {
          // For new transactions
          const { _operation, _localId, ...transactionData } = transaction;
          const newDocRef = doc(collection(db, "transactions"));
          batch.set(newDocRef, {
            ...transactionData,
            userId,
            syncedAt: serverTimestamp(),
          });
        } else if (transaction._operation === "delete" && transaction.id) {
          // For deleted transactions
          batch.delete(doc(db, "transactions", transaction.id));
        }
      }

      // Commit the batch
      await batch.commit();

      // Clear offline transactions
      setOfflineTransactions([]);
      localStorage.removeItem("offlineTransactions");

      // Refresh transactions list (real-time listener will handle this)
      setSyncStatus("synced");
    } catch (error) {
      console.error("Erro ao sincronizar transações offline:", error);
      setSyncStatus("error");
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

    // Estamos removendo o listener de transações aqui porque o App.jsx já possui um
    // listener que está atualizando o estado global de transações

    // Apenas indicamos que não estamos mais carregando
    setLoading(false);

    // Não é mais necessário retornar uma função de limpeza
  }, [userId]);

  // Cache transactions in localStorage for offline access
  useEffect(() => {
    if (appTransactions.length > 0) {
      localStorage.setItem(
        "cachedTransactions",
        JSON.stringify(appTransactions)
      );
    }
  }, [appTransactions]);

  // Efeito para atualizar a categoria quando o tipo mudar
  useEffect(() => {
    if (type === "expense") {
      setCategory("general_expense");
    } else {
      setCategory("general_income");
      setIsRecurring(false);
      setInstallments(1);
    }
  }, [type]);

  // Adicionar transação
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    // Prevenir envios duplicados
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Garantir que o valor é um número válido
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        alert("Por favor, insira um valor válido.");
        return;
      }

      const baseAmount = parsedAmount;
      const selectedDate = new Date(transactionDate);
      const transactionDateTime = selectedDate.toISOString();

      // Handle installments
      if (isRecurring && type === "expense" && installments > 1) {
        const installmentAmount = baseAmount / installments;
        const groupId = Date.now().toString();
        const newTransactions = [];

        for (let i = 0; i < installments; i++) {
          const installmentDate = new Date(selectedDate);
          installmentDate.setMonth(selectedDate.getMonth() + i);

          const newTransaction = {
            userId,
            description: `${description} (${i + 1}/${installments})`,
            amount: -installmentAmount,
            type,
            category,
            paymentMethod,
            date: installmentDate.toISOString(),
            isRecurring,
            groupId,
            tags: selectedTags.map((tag) => ({
              id: tag.id,
              name: tag.name,
              color: tag.color,
            })),
          };

          newTransactions.push(newTransaction);
        }

        if (networkStatus) {
          try {
            setSyncStatus("syncing");

            // Use batch for better performance
            const batch = writeBatch(db);

            newTransactions.forEach((transaction) => {
              const newDocRef = doc(collection(db, "transactions"));
              batch.set(newDocRef, transaction);
            });

            await batch.commit();

            // Verificar a primeira parcela para notificações
            const firstInstallment = {
              id: newDocRef.id,
              ...newTransactions[0],
            };
            await checkSpendingLimit(userId, firstInstallment);

            // Verificar transações recorrentes
            await checkRecurringTransactions(userId);

            setSyncStatus("synced");

            // Notificar o componente pai
            if (onTransactionAdded) {
              newTransactions.forEach((transaction) => {
                onTransactionAdded(transaction);
              });
            }
          } catch (error) {
            console.error("Erro ao adicionar transações:", error);
            setSyncStatus("error");

            // Store offline for later sync
            const offlineTransactionsToAdd = newTransactions.map(
              (transaction) => ({
                ...transaction,
                _operation: "add",
                _localId: `local_${Date.now()}_${Math.random()
                  .toString(36)
                  .substr(2, 9)}`,
              })
            );

            const updatedOfflineTransactions = [
              ...offlineTransactions,
              ...offlineTransactionsToAdd,
            ];
            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem(
              "offlineTransactions",
              JSON.stringify(updatedOfflineTransactions)
            );
          }
        } else {
          // Store offline for later sync
          const offlineTransactionsToAdd = newTransactions.map(
            (transaction) => ({
              ...transaction,
              _operation: "add",
              _localId: `local_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            })
          );

          const updatedOfflineTransactions = [
            ...offlineTransactions,
            ...offlineTransactionsToAdd,
          ];
          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem(
            "offlineTransactions",
            JSON.stringify(updatedOfflineTransactions)
          );

          // Update local transactions view
          const localTransactionsView = offlineTransactionsToAdd.map((t) => ({
            ...t,
            id: t._localId,
            date: t.date instanceof Date ? t.date.toISOString() : t.date,
          }));

          localTransactionsView.forEach((t) => {
            updateLocalTransactionsView(t);
          });
        }
      } else {
        // Single transaction
        const newTransaction = {
          userId,
          description,
          amount:
            type === "expense" ? -Math.abs(baseAmount) : Math.abs(baseAmount),
          type,
          category,
          paymentMethod,
          date: transactionDateTime,
          isInstallment: false,
          createdAt: new Date().toISOString(),
          tags: selectedTags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          })),
        };

        if (networkStatus) {
          try {
            setSyncStatus("syncing");

            const docRef = await addDoc(
              collection(db, "transactions"),
              newTransaction
            );
            const addedTransaction = {
              id: docRef.id,
              ...newTransaction,
            };

            // Verificar limite de gastos para notificações
            await checkSpendingLimit(userId, addedTransaction);

            setSyncStatus("synced");

            // Notificar o componente pai
            if (onTransactionAdded) {
              onTransactionAdded(addedTransaction);
            }
          } catch (error) {
            console.error("Erro ao adicionar transação:", error);
            setSyncStatus("error");

            // Store offline for later sync
            const offlineTransaction = {
              ...newTransaction,
              _operation: "add",
              _localId: `local_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            };

            const updatedOfflineTransactions = [
              ...offlineTransactions,
              offlineTransaction,
            ];
            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem(
              "offlineTransactions",
              JSON.stringify(updatedOfflineTransactions)
            );

            // Update local transactions view
            updateLocalTransactionsView({
              ...offlineTransaction,
              id: offlineTransaction._localId,
              date:
                offlineTransaction.date instanceof Date
                  ? offlineTransaction.date.toISOString()
                  : offlineTransaction.date,
            });
          }
        } else {
          // Store offline for later sync
          const offlineTransaction = {
            ...newTransaction,
            _operation: "add",
            _localId: `local_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          };

          const updatedOfflineTransactions = [
            ...offlineTransactions,
            offlineTransaction,
          ];
          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem(
            "offlineTransactions",
            JSON.stringify(updatedOfflineTransactions)
          );

          // Update local transactions view
          updateLocalTransactionsView({
            ...offlineTransaction,
            id: offlineTransaction._localId,
            date:
              offlineTransaction.date instanceof Date
                ? offlineTransaction.date.toISOString()
                : offlineTransaction.date,
          });
        }
      }

      // Clear form
      setDescription("");
      setAmount("");
      setIsRecurring(false);
      setInstallments(1);
      setPaymentMethod("money");
      setSelectedTags([]);
      setTransactionDate(() => {
        const today = new Date();
        return today.toISOString().split("T")[0]; // Resetar para hoje
      });
    } finally {
      // Garantir que o estado de submissão é resetado após 2 segundos
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    }
  };

  // Excluir transação
  const deleteTransaction = async (id, groupId) => {
    // Check if it's a local temporary ID
    const isLocalId = id.toString().startsWith("local_");

    if (groupId) {
      if (window.confirm("Deseja excluir todas as parcelas desta compra?")) {
        if (networkStatus && !isLocalId) {
          try {
            setSyncStatus("syncing");

            // Fetch all transactions in the group
            const transactionsRef = collection(db, "transactions");
            const q = query(
              transactionsRef,
              where("userId", "==", userId),
              where("groupId", "==", groupId)
            );

            const querySnapshot = await getDocs(q);

            // Delete all transactions in the group
            const batch = writeBatch(db);
            querySnapshot.docs.forEach((document) => {
              batch.delete(doc(db, "transactions", document.id));
            });

            await batch.commit();
            setSyncStatus("synced");
          } catch (error) {
            console.error("Erro ao excluir grupo de transações:", error);
            setSyncStatus("error");

            // Handle offline deletion
            const groupTransactions = appTransactions.filter(
              (t) => t.groupId === groupId
            );

            const updatedOfflineTransactions = [
              ...offlineTransactions,
              ...groupTransactions.map((t) => ({
                id: t.id,
                _operation: "delete",
              })),
            ];

            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem(
              "offlineTransactions",
              JSON.stringify(updatedOfflineTransactions)
            );

            // Update local view
            if (onTransactionAdded) {
              onTransactionAdded({});
            }
          }
        } else {
          // Handle offline or local temporary ID deletion
          const groupTransactions = appTransactions.filter(
            (t) => t.groupId === groupId
          );

          if (isLocalId) {
            // If it's a local ID, remove from offline transactions
            const updatedOfflineTransactions = offlineTransactions.filter(
              (t) =>
                !t._localId ||
                !groupTransactions.some((gt) => gt.id === t._localId)
            );

            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem(
              "offlineTransactions",
              JSON.stringify(updatedOfflineTransactions)
            );
          } else {
            // Add to offline transactions for later deletion
            const updatedOfflineTransactions = [
              ...offlineTransactions,
              ...groupTransactions.map((t) => ({
                id: t.id,
                _operation: "delete",
              })),
            ];

            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem(
              "offlineTransactions",
              JSON.stringify(updatedOfflineTransactions)
            );
          }

          // Update local view
          if (onTransactionAdded) {
            onTransactionAdded({});
          }
        }
      }
    } else {
      if (networkStatus && !isLocalId) {
        try {
          setSyncStatus("syncing");

          await deleteDoc(doc(db, "transactions", id));

          setSyncStatus("synced");
        } catch (error) {
          console.error("Erro ao excluir transação:", error);
          setSyncStatus("error");

          // Add to offline transactions for later deletion
          const updatedOfflineTransactions = [
            ...offlineTransactions,
            { id, _operation: "delete" },
          ];

          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem(
            "offlineTransactions",
            JSON.stringify(updatedOfflineTransactions)
          );

          // Update local view
          if (onTransactionAdded) {
            onTransactionAdded({});
          }
        }
      } else {
        if (isLocalId) {
          // If it's a local ID, remove from offline transactions
          const updatedOfflineTransactions = offlineTransactions.filter(
            (t) => !t._localId || t._localId !== id
          );

          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem(
            "offlineTransactions",
            JSON.stringify(updatedOfflineTransactions)
          );
        } else {
          // Add to offline transactions for later deletion
          const updatedOfflineTransactions = [
            ...offlineTransactions,
            { id, _operation: "delete" },
          ];

          setOfflineTransactions(updatedOfflineTransactions);
          localStorage.setItem(
            "offlineTransactions",
            JSON.stringify(updatedOfflineTransactions)
          );
        }

        // Update local view
        if (onTransactionAdded) {
          onTransactionAdded({});
        }
      }
    }
  };

  // Funções de cálculo e formatação
  const calculateBalance = () => {
    try {
      return appTransactions
        .reduce((acc, transaction) => {
          const amount = parseFloat(transaction.amount) || 0;
          return acc + amount;
        }, 0)
        .toFixed(2);
    } catch (error) {
      console.error("Erro ao calcular saldo:", error);
      return "0.00";
    }
  };

  const calculateIncome = () => {
    try {
      return appTransactions
        .filter((transaction) => parseFloat(transaction.amount) > 0)
        .reduce((acc, transaction) => {
          const amount = parseFloat(transaction.amount) || 0;
          return acc + amount;
        }, 0)
        .toFixed(2);
    } catch (error) {
      console.error("Erro ao calcular receitas:", error);
      return "0.00";
    }
  };

  const calculateExpenses = () => {
    try {
      return appTransactions
        .filter((transaction) => parseFloat(transaction.amount) < 0)
        .reduce((acc, transaction) => {
          const amount = parseFloat(transaction.amount) || 0;
          return acc + amount;
        }, 0)
        .toFixed(2);
    } catch (error) {
      console.error("Erro ao calcular despesas:", error);
      return "0.00";
    }
  };

  const formatDate = (dateString) => {
    try {
      const validDate = ensureValidDate(dateString);
      return validDate.toLocaleDateString();
    } catch (error) {
      console.error("Erro ao formatar data:", error, dateString);
      return "Data inválida";
    }
  };

  const getCategoryName = (categoryId) => {
    const allCategories = getAllCategories();
    const category = allCategories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Não categorizado";
  };

  const getPaymentMethodName = (methodId) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    return method ? method.name : "Outros";
  };

  // Voltar para a tela de registro
  const handleBackToRegister = () => {
    setActiveScreen("register");
  };

  // Update local transactions view (mudando push para não modificar o array original)
  const updateLocalTransactionsView = (newTransaction) => {
    if (onTransactionAdded) {
      onTransactionAdded(newTransaction);
    }
  };

  // Renderização do componente
  return (
    <div className="finance-app">
      {/* Indicadores de status de sincronização */}
      {syncStatus === "syncing" && (
        <div className="sync-indicator syncing">
          <span className="sync-icon">↻</span> Sincronizando dados...
        </div>
      )}

      {syncStatus === "error" && (
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

      {activeScreen === "history" ? (
        <div className="transaction-history-screen">
          <div className="screen-header">
            <button onClick={handleBackToRegister} className="back-button">
              &larr; Voltar
            </button>
            <h2>Histórico de Transações</h2>
          </div>

          <TransactionsList
            transactions={appTransactions}
            onDelete={deleteTransaction}
            categories={getAllCategories()}
            paymentMethods={paymentMethods}
          />
        </div>
      ) : (
        <div className="register-screen">
          {/* Formulário de registro de transação */}
          <section className="transaction-form">
            <h2>Nova Transação</h2>

            <form onSubmit={handleSubmit} className="modern-form">
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
                    className="modern-input"
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
                    className="modern-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="transactionDate">Data</label>
                  <input
                    type="date"
                    id="transactionDate"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="modern-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group radio-group">
                  <label className="radio-label">Tipo</label>
                  <div className="radio-options">
                    <label
                      className={`radio-option ${
                        type === "expense" ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value="expense"
                        checked={type === "expense"}
                        onChange={() => setType("expense")}
                      />
                      <span className="radio-text">Despesa</span>
                    </label>
                    <label
                      className={`radio-option ${
                        type === "income" ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value="income"
                        checked={type === "income"}
                        onChange={() => setType("income")}
                      />
                      <span className="radio-text">Receita</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="category">Categoria</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="modern-select"
                  >
                    {type === "expense"
                      ? expenseCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))
                      : incomeCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="paymentMethod">Método de Pagamento</label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="modern-select"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {type === "expense" && (
                <div className="form-row">
                  <div className="form-group checkbox-group">
                    <label className="switch-container">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                      />
                      <span className="switch-slider"></span>
                      <span className="switch-label">Despesa parcelada</span>
                    </label>
                  </div>

                  {isRecurring && (
                    <div className="form-group">
                      <label htmlFor="installments">Número de parcelas</label>
                      <input
                        type="number"
                        id="installments"
                        value={installments}
                        onChange={(e) =>
                          setInstallments(
                            Math.max(2, parseInt(e.target.value) || 2)
                          )
                        }
                        min="2"
                        max="72"
                        className="modern-input"
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

              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processando..." : "Adicionar Transação"}
              </button>
            </form>
          </section>

          {/* Lista de transações recentes */}
          <section className="transactions-list">
            <div className="section-header">
              <h2>Transações Recentes</h2>
              {appTransactions.length > 10 && (
                <button
                  onClick={() => setActiveScreen("history")}
                  className="view-all-button"
                >
                  Ver todas as transações
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading">Carregando transações...</div>
            ) : appTransactions.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma transação registrada ainda.</p>
                <p>
                  Adicione sua primeira transação usando o formulário acima.
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Método</th>
                      <th>Tags</th>
                      <th>Valor</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appTransactions.slice(0, 10).map((transaction) => {
                      const isOffline = transaction.id
                        .toString()
                        .startsWith("local_");

                      return (
                        <tr
                          key={transaction.id}
                          className={isOffline ? "offline-transaction" : ""}
                        >
                          <td>{formatDate(transaction.date)}</td>
                          <td>{transaction.description}</td>
                          <td>{getCategoryName(transaction.category)}</td>
                          <td>
                            {transaction.paymentMethod
                              ? getPaymentMethodName(transaction.paymentMethod)
                              : "Não especificado"}
                          </td>
                          <td className="transaction-tags">
                            {transaction.tags &&
                              transaction.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="tag-pill"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                          </td>
                          <td
                            className={
                              transaction.amount >= 0 ? "positive" : "negative"
                            }
                          >
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(transaction.amount)}
                          </td>
                          <td>
                            <button
                              className="delete-button"
                              onClick={() =>
                                deleteTransaction(
                                  transaction.id,
                                  transaction.groupId
                                )
                              }
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
              </div>
            )}
          </section>

          {/* Resumo financeiro */}
          <section className="financial-summary">
            <div className="summary-card">
              <h3>Saldo</h3>
              <div
                className={`amount ${
                  calculateBalance() >= 0 ? "positive" : "negative"
                }`}
              >
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(calculateBalance())}
              </div>
            </div>

            <div className="summary-card">
              <h3>Receitas</h3>
              <div className="amount positive">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(calculateIncome())}
              </div>
            </div>

            <div className="summary-card">
              <h3>Despesas</h3>
              <div className="amount negative">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(Math.abs(calculateExpenses()))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
