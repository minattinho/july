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
} from "firebase/firestore";
import "./BudgetManager.css";

const BudgetManager = ({ userId, transactions }) => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBudget, setNewBudget] = useState({
    categoryId: "",
    limit: "",
    alertThreshold: 80, // Alerta padrão em 80% do limite
  });

  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [currentMonthSpending, setCurrentMonthSpending] = useState({});

  // Buscar orçamentos do usuário
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setLoading(true);

        const budgetsRef = collection(db, "budgets");
        const q = query(budgetsRef, where("userId", "==", userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setBudgets([]);
        } else {
          const budgetsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setBudgets(budgetsData);
        }
      } catch (error) {
        console.error("Erro ao buscar orçamentos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBudgets();
    }
  }, [userId]);

  // Calcular gastos do mês atual por categoria
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setCurrentMonthSpending({});
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

    setCurrentMonthSpending(spendingByCategory);
  }, [transactions]);

  // Adicionar novo orçamento
  const handleAddBudget = async (e) => {
    e.preventDefault();

    if (!newBudget.categoryId || !newBudget.limit) {
      alert("Por favor, selecione uma categoria e defina um limite");
      return;
    }

    try {
      // Verificar se já existe um orçamento para esta categoria
      const existingBudget = budgets.find(
        (b) => b.categoryId === newBudget.categoryId
      );
      if (existingBudget) {
        alert("Já existe um orçamento para esta categoria. Edite o existente.");
        return;
      }

      const budgetData = {
        userId,
        categoryId: newBudget.categoryId,
        limit: parseFloat(newBudget.limit),
        alertThreshold: parseFloat(newBudget.alertThreshold),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "budgets"), budgetData);

      setBudgets([...budgets, { id: docRef.id, ...budgetData }]);

      // Reset form
      setNewBudget({
        categoryId: "",
        limit: "",
        alertThreshold: 80,
      });

      setIsAddingBudget(false);
    } catch (error) {
      console.error("Erro ao adicionar orçamento:", error);
      alert("Erro ao salvar o orçamento. Tente novamente.");
    }
  };

  // Atualizar orçamento existente
  const handleUpdateBudget = async (budgetId, updatedData) => {
    try {
      await updateDoc(doc(db, "budgets", budgetId), {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      });

      const updatedBudgets = budgets.map((budget) =>
        budget.id === budgetId
          ? { ...budget, ...updatedData, updatedAt: new Date().toISOString() }
          : budget
      );

      setBudgets(updatedBudgets);
    } catch (error) {
      console.error("Erro ao atualizar orçamento:", error);
      alert("Erro ao atualizar o orçamento. Tente novamente.");
    }
  };

  // Remover orçamento
  const handleRemoveBudget = async (budgetId) => {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "budgets", budgetId));

      setBudgets(budgets.filter((budget) => budget.id !== budgetId));
    } catch (error) {
      console.error("Erro ao excluir orçamento:", error);
      alert("Erro ao excluir o orçamento. Tente novamente.");
    }
  };

  // Calcular percentual de uso do orçamento
  const calculateUsagePercentage = (categoryId, limit) => {
    const spent = currentMonthSpending[categoryId] || 0;
    return Math.min((spent / limit) * 100, 100);
  };

  // Verificar se um orçamento está se aproximando do limite
  const isApproachingLimit = (categoryId, limit, threshold) => {
    const percentage = calculateUsagePercentage(categoryId, limit);
    return percentage >= threshold;
  };

  // Formatar valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Mapa de categorias
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

  // Obter nome da categoria
  const getCategoryName = (categoryId) => {
    return categoryMap[categoryId] || categoryId;
  };

  return (
    <div className="budget-manager-container">
      <div className="budget-header">
        <h2>Orçamentos por Categoria</h2>
        <button
          className="add-budget-button"
          onClick={() => setIsAddingBudget(!isAddingBudget)}
        >
          {isAddingBudget ? "Cancelar" : "+ Novo Orçamento"}
        </button>
      </div>

      {isAddingBudget && (
        <div className="add-budget-form">
          <h3>Adicionar Novo Orçamento</h3>

          <form onSubmit={handleAddBudget}>
            <div className="form-group">
              <label>Categoria</label>
              <select
                value={newBudget.categoryId}
                onChange={(e) =>
                  setNewBudget({ ...newBudget, categoryId: e.target.value })
                }
                required
              >
                <option value="">Selecione uma categoria</option>
                {Object.entries(categoryMap).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Limite Mensal (R$)</label>
                <input
                  type="number"
                  value={newBudget.limit}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, limit: e.target.value })
                  }
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Alerta em (%)</label>
                <input
                  type="number"
                  value={newBudget.alertThreshold}
                  onChange={(e) =>
                    setNewBudget({
                      ...newBudget,
                      alertThreshold: e.target.value,
                    })
                  }
                  placeholder="80"
                  min="1"
                  max="100"
                  step="1"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setIsAddingBudget(false)}
                className="cancel-button"
              >
                Cancelar
              </button>
              <button type="submit" className="submit-button">
                Salvar Orçamento
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Carregando orçamentos...</div>
      ) : budgets.length === 0 ? (
        <div className="empty-budgets">
          <p>Você ainda não definiu orçamentos por categoria.</p>
          <p>
            Defina limites mensais para categorias específicas para controlar
            seus gastos.
          </p>
        </div>
      ) : (
        <div className="budgets-grid">
          {budgets.map((budget) => {
            const spent = currentMonthSpending[budget.categoryId] || 0;
            const percentage = calculateUsagePercentage(
              budget.categoryId,
              budget.limit
            );
            const isWarning = isApproachingLimit(
              budget.categoryId,
              budget.limit,
              budget.alertThreshold
            );
            const isExceeded = spent > budget.limit;

            let statusClass = "normal";
            if (isExceeded) statusClass = "exceeded";
            else if (isWarning) statusClass = "warning";

            return (
              <div key={budget.id} className={`budget-card ${statusClass}`}>
                <div className="budget-header">
                  <h3>{getCategoryName(budget.categoryId)}</h3>
                  <button
                    className="remove-budget"
                    onClick={() => handleRemoveBudget(budget.id)}
                  >
                    ×
                  </button>
                </div>

                <div className="budget-progress-container">
                  <div className="budget-progress-bar">
                    <div
                      className={`budget-progress-fill ${statusClass}`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    ></div>
                  </div>
                  <div className="budget-progress-text">
                    {percentage.toFixed(0)}% utilizado
                  </div>
                </div>

                <div className="budget-details">
                  <div className="budget-amounts">
                    <div className="spent">{formatCurrency(spent)}</div>
                    <div className="limit">
                      de {formatCurrency(budget.limit)}
                    </div>
                  </div>

                  <div className="budget-status">
                    {isExceeded ? (
                      <div className="alert exceeded">
                        Limite excedido em{" "}
                        {formatCurrency(spent - budget.limit)}!
                      </div>
                    ) : isWarning ? (
                      <div className="alert warning">
                        Alerta! {formatCurrency(budget.limit - spent)} restantes
                      </div>
                    ) : (
                      <div className="available">
                        {formatCurrency(budget.limit - spent)} disponíveis
                      </div>
                    )}
                  </div>
                </div>

                <div className="budget-actions">
                  <button
                    className="edit-threshold"
                    onClick={() => {
                      const newThreshold = prompt(
                        "Definir novo limite de alerta (%)",
                        budget.alertThreshold
                      );
                      if (
                        newThreshold &&
                        !isNaN(newThreshold) &&
                        newThreshold > 0 &&
                        newThreshold <= 100
                      ) {
                        handleUpdateBudget(budget.id, {
                          alertThreshold: parseFloat(newThreshold),
                        });
                      }
                    }}
                  >
                    Editar Alerta ({budget.alertThreshold}%)
                  </button>

                  <button
                    className="edit-limit"
                    onClick={() => {
                      const newLimit = prompt(
                        "Definir novo limite (R$)",
                        budget.limit
                      );
                      if (newLimit && !isNaN(newLimit) && newLimit > 0) {
                        handleUpdateBudget(budget.id, {
                          limit: parseFloat(newLimit),
                        });
                      }
                    }}
                  >
                    Editar Limite
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetManager;
