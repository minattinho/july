// Renomeie o arquivo original para src/utils/notificationSystem.js e use este código

import { db } from '../firebase';  // Corrigido o caminho de importação
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

// Função para criar uma nova notificação
export const createNotification = async (userId, type, message, data = {}) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      message,
      data,
      read: false,
      timestamp: Timestamp.now(),
      createdAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return false;
  }
};

// Verificar gastos acima do limite
export const checkSpendingLimit = async (userId, transaction) => {
  if (transaction.amount >= 0) return; // Só verifica despesas
  
  try {
    // Buscar configurações do usuário
    const settingsRef = collection(db, 'notificationSettings');
    const q = query(settingsRef, where('userId', '==', userId));
    const settingsSnapshot = await getDocs(q);
    
    if (settingsSnapshot.empty) return;
    
    const settings = settingsSnapshot.docs[0].data();
    
    // Verificar se alertas de orçamento estão ativados
    if (!settings.budgetAlerts) return;
    
    // Verificar se a transação excede o limite
    if (Math.abs(transaction.amount) >= settings.spendingLimitAmount) {
      await createNotification(
        userId,
        'budget',
        `Alerta de gasto: Transação de ${formatCurrency(Math.abs(transaction.amount))} excede seu limite de ${formatCurrency(settings.spendingLimitAmount)}.`,
        {
          transactionId: transaction.id,
          amount: transaction.amount,
          limit: settings.spendingLimitAmount
        }
      );
    }
  } catch (error) {
    console.error('Erro ao verificar limite de gastos:', error);
  }
};

// Verificar metas próximas ao prazo
export const checkGoalDeadlines = async (userId) => {
  try {
    // Buscar configurações do usuário
    const settingsRef = collection(db, 'notificationSettings');
    const settingsQuery = query(settingsRef, where('userId', '==', userId));
    const settingsSnapshot = await getDocs(settingsQuery);
    
    if (settingsSnapshot.empty) return;
    
    const settings = settingsSnapshot.docs[0].data();
    
    // Verificar se alertas de metas estão ativados
    if (!settings.goalAlerts) return;
    
    // Buscar todas as metas do usuário
    const goalsRef = collection(db, 'goals');
    const goalsQuery = query(goalsRef, where('userId', '==', userId));
    const goalsSnapshot = await getDocs(goalsQuery);
    
    if (goalsSnapshot.empty) return;
    
    const today = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
    
    goalsSnapshot.docs.forEach(async (doc) => {
      const goal = doc.data();
      const targetDate = new Date(goal.targetDate);
      
      // Verificar se a meta está próxima do prazo (7 dias) e não foi concluída
      if (
        targetDate > today && 
        targetDate - today <= oneWeek && 
        goal.currentAmount < goal.targetAmount
      ) {
        const daysRemaining = Math.ceil((targetDate - today) / (24 * 60 * 60 * 1000));
        
        await createNotification(
          userId,
          'goal',
          `Meta "${goal.title}" vence em ${daysRemaining} dias e está ${Math.round((goal.currentAmount / goal.targetAmount) * 100)}% concluída.`,
          {
            goalId: doc.id,
            daysRemaining,
            progress: goal.currentAmount / goal.targetAmount
          }
        );
      }
    });
  } catch (error) {
    console.error('Erro ao verificar prazos de metas:', error);
  }
};

// Verificar transações recorrentes
export const checkRecurringTransactions = async (userId) => {
  try {
    // Buscar configurações do usuário
    const settingsRef = collection(db, 'notificationSettings');
    const settingsQuery = query(settingsRef, where('userId', '==', userId));
    const settingsSnapshot = await getDocs(settingsQuery);
    
    if (settingsSnapshot.empty) return;
    
    const settings = settingsSnapshot.docs[0].data();
    
    // Verificar se lembretes de transação estão ativados
    if (!settings.transactionReminders) return;
    
    // Buscar as próximas parcelas de transações recorrentes
    const today = new Date();
    const threeDays = 3 * 24 * 60 * 60 * 1000; // 3 dias em milissegundos
    
    const transactionsRef = collection(db, 'transactions');
    const transactionsQuery = query(
      transactionsRef, 
      where('userId', '==', userId),
      where('isInstallment', '==', true)
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    
    if (transactionsSnapshot.empty) return;
    
    // Agrupar por groupId para encontrar a próxima parcela
    const transactionGroups = {};
    
    transactionsSnapshot.docs.forEach(doc => {
      const transaction = {
        id: doc.id,
        ...doc.data()
      };
      
      const { groupId } = transaction;
      
      if (!groupId) return;
      
      if (!transactionGroups[groupId]) {
        transactionGroups[groupId] = [];
      }
      
      transactionGroups[groupId].push(transaction);
    });
    
    // Para cada grupo, verificar a próxima parcela
    Object.values(transactionGroups).forEach(async (transactions) => {
      // Ordenar por número da parcela
      transactions.sort((a, b) => a.installmentNumber - b.installmentNumber);
      
      // Encontrar a próxima parcela não vencida
      const nextInstallment = transactions.find(t => new Date(t.date) > today);
      
      if (nextInstallment) {
        const installmentDate = new Date(nextInstallment.date);
        
        // Verificar se a parcela vence em até 3 dias
        if (installmentDate - today <= threeDays) {
          const daysRemaining = Math.ceil((installmentDate - today) / (24 * 60 * 60 * 1000));
          
          await createNotification(
            userId,
            'transaction',
            `Lembrete: Parcela ${nextInstallment.installmentNumber}/${nextInstallment.totalInstallments} de "${nextInstallment.description.split('(')[0].trim()}" vence em ${daysRemaining} dias.`,
            {
              transactionId: nextInstallment.id,
              daysRemaining,
              amount: nextInstallment.amount
            }
          );
        }
      }
    });
  } catch (error) {
    console.error('Erro ao verificar transações recorrentes:', error);
  }
};

// Função auxiliar para formatar moeda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};