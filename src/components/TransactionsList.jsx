import React, { useState } from "react";
import Transaction from "./Transaction";
import "./TransactionsList.css";

function TransactionsList({
  transactions,
  onDelete,
  onEdit,
  categories,
  paymentMethods,
}) {
  const [filter, setFilter] = useState({
    type: "all",
    category: "all",
    paymentMethod: "all",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Aplicar filtros às transações
  const filteredTransactions = transactions.filter((transaction) => {
    // Filtro por tipo (receita/despesa)
    if (filter.type !== "all") {
      if (filter.type === "income" && transaction.amount <= 0) return false;
      if (filter.type === "expense" && transaction.amount > 0) return false;
    }

    // Filtro por categoria
    if (filter.category !== "all" && transaction.category !== filter.category) {
      return false;
    }

    // Filtro por método de pagamento
    if (
      filter.paymentMethod !== "all" &&
      transaction.paymentMethod !== filter.paymentMethod
    ) {
      return false;
    }

    // Filtro por data de início
    if (
      filter.startDate &&
      new Date(transaction.date) < new Date(filter.startDate)
    ) {
      return false;
    }

    // Filtro por data de fim
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59); // Final do dia
      if (new Date(transaction.date) > endDate) {
        return false;
      }
    }

    // Filtro por texto de busca (descrição)
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const descriptionLower = transaction.description.toLowerCase();
      if (!descriptionLower.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  // Agrupar todas as categorias para mostrar no filtro
  const allCategories = [
    { id: "all", name: "Todas as categorias" },
    ...categories,
  ];

  // Agrupar todos os métodos de pagamento para mostrar no filtro
  const allPaymentMethods = [
    { id: "all", name: "Todos os métodos" },
    ...paymentMethods,
  ];

  // Função para alternar a visibilidade do painel de filtros
  const [showFilters, setShowFilters] = useState(false);

  // Limpar todos os filtros
  const clearFilters = () => {
    setFilter({
      type: "all",
      category: "all",
      paymentMethod: "all",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  return (
    <div className="transactions-list-container">
      <div className="transactions-header">
        <h2>Transações</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar transações..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Ocultar Filtros" : "Exibir Filtros"}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Tipo</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              >
                <option value="all">Todos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Categoria</label>
              <select
                value={filter.category}
                onChange={(e) =>
                  setFilter({ ...filter, category: e.target.value })
                }
              >
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Método de Pagamento</label>
              <select
                value={filter.paymentMethod}
                onChange={(e) =>
                  setFilter({ ...filter, paymentMethod: e.target.value })
                }
              >
                {allPaymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Data Inicial</label>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) =>
                  setFilter({ ...filter, startDate: e.target.value })
                }
              />
            </div>

            <div className="filter-group">
              <label>Data Final</label>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) =>
                  setFilter({ ...filter, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="filter-actions">
            <button className="clear-filters" onClick={clearFilters}>
              Limpar Filtros
            </button>
          </div>
        </div>
      )}

      <div className="transactions-results">
        <div className="results-summary">
          Exibindo {filteredTransactions.length} de {transactions.length}{" "}
          transações
        </div>

        {filteredTransactions.length > 0 ? (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th className="hide-on-mobile">Categoria</th>
                <th className="hide-on-mobile">Método de Pagamento</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <Transaction
                  key={transaction.id}
                  transaction={transaction}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  categories={categories}
                  paymentMethods={paymentMethods}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-transactions">
            <p>Nenhuma transação encontrada com os filtros atuais.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionsList;
