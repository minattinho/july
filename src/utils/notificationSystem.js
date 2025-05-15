// Funções para o sistema de notificações

export const checkSpendingLimit = (transactions, category, limit) => {
  const categoryTotal = transactions
    .filter(t => t.category === category && t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  return categoryTotal >= limit;
};

export const checkGoalDeadlines = (goals) => {
  const today = new Date();
  return goals.filter(goal => {
    const deadline = new Date(goal.deadline);
    const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 7 && !goal.completed;
  });
};

export const checkRecurringTransactions = (transactions) => {
  const today = new Date();
  return transactions.filter(transaction => {
    if (!transaction.isRecurring) return false;
    
    const lastDate = new Date(transaction.date);
    const daysSinceLast = Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24));
    
    return daysSinceLast >= 30; // Notificar para transações recorrentes a cada 30 dias
  });
}; 