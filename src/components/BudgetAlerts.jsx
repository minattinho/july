import { useState, useEffect } from "react";
import "./BudgetAlerts.css";

const BudgetAlerts = ({ budgets, transactions }) => {
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Verificar se temos budgets e transactions
    if (!budgets || !transactions || budgets.length === 0) {
      setAlerts([]);
      return;
    }

    // Calcular o primeiro e último dia do mês atual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Filtrar transações do mês atual e que são despesas
    const monthTransactions = transactions.filter((transaction) => {
      const txDate = new Date(transaction.date);
      return (
        txDate >= firstDay &&
        txDate <= lastDay &&
        transaction.type === "expense"
      );
    });

    // Agrupar gastos por categoria
    const spendingByCategory = monthTransactions.reduce((acc, transaction) => {
      const categoryId = transaction.category;
      if (!acc[categoryId]) {
        acc[categoryId] = 0;
      }
      acc[categoryId] += Math.abs(transaction.amount);
      return acc;
    }, {});

    // Gerar alertas para orçamentos que estão atingindo o limite
    const newAlerts = [];

    budgets.forEach((budget) => {
      const spent = spendingByCategory[budget.categoryId] || 0;
      const percentage = Math.min((spent / budget.limit) * 100, 100);

      // Verificar se atingiu o threshold de alerta ou excedeu o limite
      if (percentage >= budget.alertThreshold || spent > budget.limit) {
        const alertId = `budget-${
          budget.id
        }-${now.getMonth()}-${now.getFullYear()}`;

        // Ignorar alertas que já foram dispensados
        if (dismissedAlerts.includes(alertId)) {
          return;
        }

        newAlerts.push({
          id: alertId,
          budgetId: budget.id,
          categoryId: budget.categoryId,
          limit: budget.limit,
          spent,
          percentage,
          isExceeded: spent > budget.limit,
        });
      }
    });

    setAlerts(newAlerts);
  }, [budgets, transactions, dismissedAlerts]);

  // Dispensar um alerta
  const dismissAlert = (alertId) => {
    setDismissedAlerts([...dismissedAlerts, alertId]);
  };

  // Obter nome da categoria
  const getCategoryName = (categoryId) => {
    const categoryMap = {
      general_expense: "Geral",
      food: "Alimentação",
      transport: "Transporte",
      housing: "Moradia",
      entertainment: "Lazer",
      health: "Saúde",
      education: "Educação",
      clothing: "Vestuário",
      utilities: "Contas & Serviços",
    };

    return categoryMap[categoryId] || categoryId;
  };

  // Formatar valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Filtrar alertas para mostrar apenas os mais importantes, a menos que showAll seja true
  const visibleAlerts = showAll ? alerts : alerts.slice(0, 3); // Mostrar apenas os primeiros 3 alertas

  if (alerts.length === 0) {
    return null; // Não renderizar o componente se não houver alertas
  }

  return (
    <div className="budget-alerts-container">
      <div className="alerts-header">
        <h3>Alertas de Orçamento</h3>
        {alerts.length > 3 && (
          <button
            className="toggle-alerts-button"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Mostrar Menos" : `Ver Todos (${alerts.length})`}
          </button>
        )}
      </div>

      <div className="alerts-list">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`alert-item ${
              alert.isExceeded ? "exceeded" : "warning"
            }`}
          >
            <div className="alert-content">
              <h4>{getCategoryName(alert.categoryId)}</h4>
              <div className="alert-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${alert.percentage}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {alert.percentage.toFixed(0)}%
                </div>
              </div>
              <p>
                {alert.isExceeded
                  ? `Orçamento excedido em ${formatCurrency(
                      alert.spent - alert.limit
                    )}!`
                  : `${formatCurrency(alert.spent)} de ${formatCurrency(
                      alert.limit
                    )}`}
              </p>
            </div>
            <button
              className="dismiss-alert"
              onClick={() => dismissAlert(alert.id)}
              aria-label="Dispensar alerta"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetAlerts;
