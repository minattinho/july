// src/components/FinanceOrganizer.jsx
import React, { useState, useEffect } from "react";
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

// Função para analisar arquivo CSV
const parseCSV = (content) => {
  const lines = content.split("\n");
  const headers = lines[0].split(",").map((header) => header.trim());

  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(",").map((value) => value.trim());
    const transaction = {};

    headers.forEach((header, index) => {
      transaction[header] = values[index];
    });

    transactions.push(transaction);
  }

  return transactions;
};

// Função para analisar arquivo OFX
const parseOFX = (content) => {
  const transactions = [];

  // Extrair transações do conteúdo OFX
  const stmtTrns = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];

  stmtTrns.forEach((trnStr) => {
    const transaction = {};

    // Extrair data da transação (formato: YYYYMMDD)
    const dateMatch = trnStr.match(/<DTPOSTED>(.*?)<\/DTPOSTED>/);
    if (dateMatch && dateMatch[1]) {
      const dateStr = dateMatch[1];
      // Converter formato YYYYMMDD para YYYY-MM-DD
      if (dateStr.length >= 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        transaction.date = `${year}-${month}-${day}`;
      }
    }

    // Extrair valor da transação
    const amountMatch = trnStr.match(/<TRNAMT>(.*?)<\/TRNAMT>/);
    if (amountMatch && amountMatch[1]) {
      transaction.amount = parseFloat(amountMatch[1]);
    }

    // Extrair descrição da transação
    const memoMatch = trnStr.match(/<MEMO>(.*?)<\/MEMO>/);
    if (memoMatch && memoMatch[1]) {
      transaction.description = memoMatch[1];
    }

    // Extrair ID da transação
    const idMatch = trnStr.match(/<FITID>(.*?)<\/FITID>/);
    if (idMatch && idMatch[1]) {
      transaction.id = idMatch[1];
    }

    transactions.push(transaction);
  });

  return transactions;
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
  const [importedTransactions, setImportedTransactions] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState(""); // idle, processing, success, error

  // Estado de edição
  const [isEditing, setIsEditing] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

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

      // Rastrear IDs locais para remover após sincronização
      const processedLocalIds = [];

      // Process each offline transaction
      for (const transaction of offlineTransactions) {
        if (transaction._operation === "add") {
          // For new transactions
          const { _operation, _localId, ...transactionData } = transaction;

          // Rastrear para remoção
          if (_localId) {
            processedLocalIds.push(_localId);
          }

          const newDocRef = doc(collection(db, "transactions"));
          // Adicionamos uma marca para identificar que é uma transação que foi sincronizada
          batch.set(newDocRef, {
            ...transactionData,
            userId,
            syncedAt: serverTimestamp(),
            syncSource: "offline", // Marca adicional para depuração
          });
        } else if (transaction._operation === "delete" && transaction.id) {
          // For deleted transactions
          batch.delete(doc(db, "transactions", transaction.id));
        }
      }

      // Commit the batch
      await batch.commit();

      // Remover transações sincronizadas do array local
      // Isso evita que o código tente sincronizar novamente
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

  // Função para editar uma transação
  const editTransaction = (transaction) => {
    // Setar o estado de edição
    setIsEditing(true);
    setTransactionToEdit(transaction);

    // Preencher o formulário com os dados da transação
    setDescription(transaction.description);
    setAmount(Math.abs(transaction.amount).toString());
    setType(transaction.amount >= 0 ? "income" : "expense");
    setCategory(transaction.category || expenseCategories[0].id);
    setPaymentMethod(transaction.paymentMethod || "money");

    // Configurar data
    const transactionDate = new Date(transaction.date);
    setTransactionDate(transactionDate.toISOString().split("T")[0]);

    // Configurar tags
    setSelectedTags(transaction.tags || []);

    // Rolar para o formulário
    document
      .getElementById("add-transaction-form")
      .scrollIntoView({ behavior: "smooth" });
  };

  // Função para cancelar edição
  const cancelEdit = () => {
    setIsEditing(false);
    setTransactionToEdit(null);

    // Limpar o formulário
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory(expenseCategories[0].id);
    setPaymentMethod("money");
    setSelectedTags([]);
    setTransactionDate(() => {
      const today = new Date();
      return today.toISOString().split("T")[0];
    });
  };

  // Modificar handleSubmit para lidar com edição
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const baseAmount = parseFloat(
        amount.replace(/\./g, "").replace(",", ".")
      );
      if (isNaN(baseAmount) || baseAmount <= 0) {
        alert("Valor inválido. Por favor, insira um valor positivo.");
        return;
      }

      // Se estiver no modo de edição, atualizar a transação
      if (isEditing && transactionToEdit) {
        const transactionDateTime = new Date(transactionDate);

        // Criar objeto de transação atualizada
        const updatedTransaction = {
          ...transactionToEdit,
          description,
          amount:
            type === "expense" ? -Math.abs(baseAmount) : Math.abs(baseAmount),
          type,
          category,
          paymentMethod,
          date: transactionDateTime.toISOString(),
          tags: selectedTags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          })),
          updatedAt: new Date().toISOString(),
        };

        const isLocalId = transactionToEdit.id.toString().startsWith("local_");

        if (networkStatus && !isLocalId) {
          try {
            setSyncStatus("syncing");

            // Atualizar no Firestore
            const transactionRef = doc(
              db,
              "transactions",
              transactionToEdit.id
            );
            await updateDoc(transactionRef, updatedTransaction);

            setSyncStatus("synced");
          } catch (error) {
            console.error("Erro ao atualizar transação:", error);
            setSyncStatus("error");

            // Armazenar offline para sincronização posterior
            const offlineTransaction = {
              ...updatedTransaction,
              _operation: "update",
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

            // Atualizar a visualização local
            updateLocalTransactionsView(updatedTransaction);
          }
        } else {
          // Se for uma transação local ou offline
          if (isLocalId) {
            // Atualizar na lista de transações offline
            const updatedOfflineTransactions = offlineTransactions.map((t) =>
              t._localId === transactionToEdit.id
                ? { ...t, ...updatedTransaction }
                : t
            );

            setOfflineTransactions(updatedOfflineTransactions);
            localStorage.setItem(
              "offlineTransactions",
              JSON.stringify(updatedOfflineTransactions)
            );
          } else {
            // Adicionar à lista de atualizações offline
            const offlineTransaction = {
              ...updatedTransaction,
              _operation: "update",
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
          }

          // Atualizar a visualização local
          updateLocalTransactionsView(updatedTransaction);
        }

        // Limpar o modo de edição
        setIsEditing(false);
        setTransactionToEdit(null);

        // Limpar o formulário
        setDescription("");
        setAmount("");
        setType("expense");
        setCategory(expenseCategories[0].id);
        setPaymentMethod("money");
        setSelectedTags([]);
        setTransactionDate(() => {
          const today = new Date();
          return today.toISOString().split("T")[0];
        });

        return;
      }

      // Código para adicionar nova transação (código existente)
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

            // Apenas no caso de erro, atualizamos a interface para feedback imediato
            localTransactionsView.forEach((t) => {
              updateLocalTransactionsView(t);
            });
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

          // Update local transactions view apenas no modo offline
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
          // Adiciona um token único para cada transação ajudando a prevenir duplicação
          transactionToken: `${userId}_${description}_${baseAmount}_${Date.now()}`,
        };

        if (networkStatus) {
          try {
            setSyncStatus("syncing");

            // Verificar se uma transação similar existe no último minuto
            // (para prevenir duplicação por cliques múltiplos no servidor)
            const oneMinuteAgo = new Date();
            oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

            const recentTransactionsRef = collection(db, "transactions");
            const q = query(
              recentTransactionsRef,
              where("userId", "==", userId),
              where("description", "==", description),
              where("createdAt", ">=", oneMinuteAgo.toISOString())
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              console.warn(
                "Transação similar encontrada no último minuto. Possível duplicação evitada."
              );
              // Apenas atualizamos o status sem criar nova transação
              setSyncStatus("synced");
            } else {
              // Nenhuma duplicata encontrada, podemos adicionar a transação
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

            // Update local transactions view apenas em caso de erro
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

          // Update local transactions view apenas no modo offline
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

  // Função para cálculos que lida com possíveis errors de tipo
  const safeCalculation = (transactions, filterFn, calculationFn) => {
    try {
      // Garantir que transactions é um array antes de chamar filter
      if (!Array.isArray(transactions)) {
        console.error("Erro: Não é um array:", transactions);
        return 0;
      }

      const filteredTransactions = filterFn
        ? transactions.filter(filterFn)
        : transactions;
      return calculationFn(filteredTransactions);
    } catch (error) {
      console.error("Erro durante o cálculo:", error);
      return 0;
    }
  };

  // Funções de cálculo e formatação
  const calculateBalance = () => {
    return safeCalculation(appTransactions, null, (transactions) => {
      const balance = transactions.reduce((acc, transaction) => {
        const amount = parseFloat(transaction.amount) || 0;
        return acc + amount;
      }, 0);
      return balance.toFixed(2);
    });
  };

  const calculateIncome = () => {
    return safeCalculation(
      appTransactions,
      (transaction) => parseFloat(transaction.amount) > 0,
      (transactions) => {
        const income = transactions.reduce((acc, transaction) => {
          const amount = parseFloat(transaction.amount) || 0;
          return acc + amount;
        }, 0);
        return income.toFixed(2);
      }
    );
  };

  const calculateExpenses = () => {
    return safeCalculation(
      appTransactions,
      (transaction) => parseFloat(transaction.amount) < 0,
      (transactions) => {
        const expenses = transactions.reduce((acc, transaction) => {
          const amount = parseFloat(transaction.amount) || 0;
          return acc + amount;
        }, 0);
        return expenses.toFixed(2);
      }
    );
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

  // Update local transactions view (para evitar duplicações)
  const updateLocalTransactionsView = (newTransaction) => {
    // Verificamos se o listener do Firestore no App.jsx já está ativo
    // Se estiver online e não for uma transação gerada localmente, não precisamos atualizar manualmente
    const isLocalTransaction =
      newTransaction.id && newTransaction.id.toString().startsWith("local_");

    if (!networkStatus || isLocalTransaction) {
      // Apenas notificamos se estiver offline ou for transação local
      if (onTransactionAdded) {
        onTransactionAdded(newTransaction);
      }
    }
  };

  // Função para importar arquivo
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus("processing");

    try {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const content = event.target.result;
        let parsedTransactions = [];

        // Determinar o tipo de arquivo pelo nome ou extensão
        if (file.name.toLowerCase().endsWith(".csv")) {
          parsedTransactions = parseCSV(content);
        } else if (file.name.toLowerCase().endsWith(".ofx")) {
          parsedTransactions = parseOFX(content);
        } else {
          throw new Error("Formato de arquivo não suportado. Use CSV ou OFX.");
        }

        // Mapear as transações para o formato da aplicação
        const mappedTransactions = parsedTransactions
          .map((transaction) => {
            const isNegative =
              transaction.amount < 0 ||
              (transaction.amount &&
                transaction.amount.toString().startsWith("-")) ||
              (transaction.type &&
                transaction.type.toLowerCase().includes("debit"));

            return {
              description:
                transaction.description ||
                transaction.memo ||
                transaction.MEMO ||
                "Importado",
              amount: Math.abs(parseFloat(transaction.amount || "0")),
              type: isNegative ? "expense" : "income",
              category: isNegative ? "general_expense" : "general_income",
              paymentMethod: "bank_transfer", // Padrão para extratos bancários
              date: transaction.date || new Date().toISOString().split("T")[0],
              importedFrom: file.name,
            };
          })
          .filter((t) => t.amount > 0); // Remover transações sem valor

        setImportedTransactions(mappedTransactions);
        setImportStatus("success");
        setShowImportModal(true);
      };

      reader.onerror = () => {
        throw new Error("Erro ao ler o arquivo.");
      };

      // Ler o arquivo como texto
      if (file.name.toLowerCase().endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Erro ao importar arquivo:", error);
      setImportStatus("error");
      alert(`Erro ao importar: ${error.message}`);
    }
  };

  // Função para confirmar a importação de transações
  const confirmImport = async () => {
    if (!importedTransactions.length) return;

    setIsSubmitting(true);
    setSyncStatus("syncing");

    try {
      // Use batch para melhor performance
      const batch = writeBatch(db);

      importedTransactions.forEach((transaction) => {
        const newDocRef = doc(collection(db, "transactions"));
        batch.set(newDocRef, {
          userId,
          description: transaction.description,
          amount:
            transaction.type === "expense"
              ? -Math.abs(transaction.amount)
              : Math.abs(transaction.amount),
          type: transaction.type,
          category: transaction.category,
          paymentMethod: transaction.paymentMethod,
          date: transaction.date,
          isInstallment: false,
          createdAt: new Date().toISOString(),
          tags: [],
          importedFrom: transaction.importedFrom || "manual",
        });
      });

      await batch.commit();

      setShowImportModal(false);
      setImportedTransactions([]);
      setImportStatus("idle");
      setSyncStatus("synced");
      alert(
        `${importedTransactions.length} transações importadas com sucesso!`
      );
    } catch (error) {
      console.error("Erro ao importar transações:", error);
      setSyncStatus("error");
      alert(`Erro ao importar transações: ${error.message}`);
    } finally {
      setIsSubmitting(false);
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
            onEdit={editTransaction}
            categories={getAllCategories()}
            paymentMethods={paymentMethods}
          />
        </div>
      ) : (
        <div className="register-screen">
          {/* Formulário de registro de transação */}
          <section className="transaction-form">
            <h2>Nova Transação</h2>

            {/* Área de importação de arquivos */}
            <div className="import-area">
              <h3>Importar Extrato Bancário</h3>
              <p className="import-description">
                Importe transações de arquivos CSV ou OFX do seu banco.
              </p>
              <div className="file-upload-container">
                <label className="file-upload-button">
                  <input
                    type="file"
                    accept=".csv,.ofx"
                    onChange={handleFileImport}
                    disabled={isSubmitting}
                  />
                  <span className="upload-icon">⬆️</span> Selecionar arquivo
                </label>
                <span className="file-format-info">
                  Formatos aceitos: CSV, OFX
                </span>
              </div>
              {importStatus === "processing" && (
                <p className="import-status">Processando arquivo...</p>
              )}
            </div>

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

              <div className="form-buttons">
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isEditing ? "Atualizar" : "Adicionar"}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={cancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                )}
              </div>
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
              <div className="transaction-list">
                <TransactionsList
                  transactions={appTransactions}
                  onDelete={deleteTransaction}
                  onEdit={editTransaction}
                  categories={getAllCategories()}
                  paymentMethods={paymentMethods}
                />
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

      {/* Modal para confirmar importação */}
      {showImportModal && (
        <div className="import-modal-overlay">
          <div className="import-modal">
            <div className="import-modal-header">
              <h3>Confirmar Importação</h3>
              <button
                className="close-modal-button"
                onClick={() => setShowImportModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="import-modal-content">
              <p>
                Foram encontradas {importedTransactions.length} transações.
                Deseja importar?
              </p>

              <div className="import-transactions-preview">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedTransactions
                      .slice(0, 10)
                      .map((transaction, index) => (
                        <tr key={index}>
                          <td>{transaction.date}</td>
                          <td>{transaction.description}</td>
                          <td>R$ {transaction.amount.toFixed(2)}</td>
                          <td>
                            {transaction.type === "income"
                              ? "Receita"
                              : "Despesa"}
                          </td>
                        </tr>
                      ))}
                    {importedTransactions.length > 10 && (
                      <tr>
                        <td colSpan="4" className="more-transactions">
                          E mais {importedTransactions.length - 10}{" "}
                          transações...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="import-modal-actions">
              <button
                className="secondary-button"
                onClick={() => setShowImportModal(false)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                onClick={confirmImport}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Importando..." : "Confirmar Importação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
