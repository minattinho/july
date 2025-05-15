import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subMonths,
  addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import "./Dashboard.css";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#8DD1E1",
  "#A4DE6C",
  "#D0ED57",
  "#F5D36C",
];

const Dashboard = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [radarData, setRadarData] = useState([]);
  const [comparisonData, setComparisonData] = useState({
    income: 0,
    expenses: 0,
    savingsRate: 0,
  });
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    savingsRate: 0,
    averageTransaction: 0,
  });

  // Função para mapear IDs de categoria para nomes em português
  const getCategoryName = (categoryId) => {
    const categoryMap = {
      // Despesas
      general_expense: "Geral",
      food: "Alimentação",
      transport: "Transporte",
      housing: "Moradia",
      entertainment: "Lazer",
      health: "Saúde",
      education: "Educação",
      clothing: "Vestuário",
      utilities: "Contas & Serviços",

      // Receitas
      general_income: "Geral",
      salary: "Salário",
      freelance: "Freelance",
      investments: "Investimentos",
      gifts: "Presentes",
      sales: "Vendas",
      rental: "Aluguel",
      refunds: "Reembolsos",
    };

    return categoryMap[categoryId] || categoryId;
  };

  // Função para mapear IDs de método de pagamento para nomes em português
  const getPaymentMethodName = (methodId) => {
    const methodMap = {
      money: "Dinheiro",
      debit_card: "Cartão de Débito",
      credit_card: "Cartão de Crédito",
      pix: "Pix",
      bank_transfer: "Transferência",
      bill: "Boleto",
    };

    return methodMap[methodId] || methodId;
  };

  // Função para gerar os últimos 12 meses a partir do mês atual
  const getLast12Months = () => {
    const months = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      months.push(date);
    }

    return months.reverse();
  };

  // Função para filtrar transações dentro de um intervalo de datas
  const getFilteredTransactions = (startDate, endDate) => {
    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return isWithinInterval(transactionDate, {
        start: startDate,
        end: endDate,
      });
    });
  };

  // Lista de meses para o seletor
  const months = getLast12Months();

  useEffect(() => {
    if (!transactions.length) return;

    // Definir o intervalo de datas para o mês selecionado
    const firstDayOfMonth = startOfMonth(selectedMonth);
    const lastDayOfMonth = endOfMonth(selectedMonth);

    // Mês anterior para comparação
    const firstDayPrevMonth = startOfMonth(subMonths(selectedMonth, 1));
    const lastDayPrevMonth = endOfMonth(subMonths(selectedMonth, 1));

    // Filtrar transações apenas do mês selecionado
    const monthTransactions = getFilteredTransactions(
      firstDayOfMonth,
      lastDayOfMonth
    );
    const prevMonthTransactions = getFilteredTransactions(
      firstDayPrevMonth,
      lastDayPrevMonth
    );

    // Processar dados diários dentro do mês selecionado
    const dailyTransactions = monthTransactions.reduce((acc, transaction) => {
      const day = format(new Date(transaction.date), "dd/MM", { locale: ptBR });
      if (!acc[day]) {
        acc[day] = { income: 0, expenses: 0 };
      }
      if (transaction.type === "income") {
        acc[day].income += transaction.amount;
      } else {
        acc[day].expenses += Math.abs(transaction.amount);
      }
      return acc;
    }, {});

    const dailyChartData = Object.entries(dailyTransactions).map(
      ([day, data]) => ({
        day,
        income: data.income,
        expenses: data.expenses,
        balance: data.income - data.expenses,
      })
    );

    // Ordenar dados por dia
    dailyChartData.sort((a, b) => {
      const [dayA] = a.day.split("/");
      const [dayB] = b.day.split("/");
      return parseInt(dayA) - parseInt(dayB);
    });

    // Processar dados por categoria apenas do mês atual
    const categoryTransactions = monthTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "expense") {
          if (!acc[transaction.category]) {
            acc[transaction.category] = 0;
          }
          acc[transaction.category] += Math.abs(transaction.amount);
        }
        return acc;
      },
      {}
    );

    const categoryChartData = Object.entries(categoryTransactions)
      .map(([category, amount]) => ({
        name: getCategoryName(category),
        value: amount,
      }))
      .sort((a, b) => b.value - a.value); // Ordenar por valor

    // Processar dados por método de pagamento apenas do mês atual
    const paymentMethodTransactions = monthTransactions.reduce(
      (acc, transaction) => {
        if (!acc[transaction.paymentMethod]) {
          acc[transaction.paymentMethod] = 0;
        }
        acc[transaction.paymentMethod] += Math.abs(transaction.amount);
        return acc;
      },
      {}
    );

    const paymentMethodChartData = Object.entries(
      paymentMethodTransactions
    ).map(([method, amount]) => ({
      name: getPaymentMethodName(method),
      value: amount,
    }));

    // Dados para o gráfico radar - proporção de gastos por categoria
    const totalExpense = Object.values(categoryTransactions).reduce(
      (sum, value) => sum + value,
      0
    );

    const radarChartData = Object.entries(categoryTransactions)
      .map(([category, amount]) => ({
        category: getCategoryName(category),
        value: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }))
      .filter((item) => item.value > 0); // Remover categorias sem gastos

    // Dados para o gráfico de tendência (últimos 6 meses)
    const trendChartData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(selectedMonth, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthTxs = getFilteredTransactions(monthStart, monthEnd);

      const monthIncome = monthTxs
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpense = monthTxs
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      trendChartData.push({
        month: format(monthDate, "MMM", { locale: ptBR }),
        income: monthIncome,
        expenses: monthExpense,
        balance: monthIncome - monthExpense,
      });
    }

    // Calcular resumo do mês atual
    const totalIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    const averageTransaction =
      monthTransactions.length > 0
        ? monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) /
          monthTransactions.length
        : 0;

    // Calcular dados do mês anterior para comparação
    const prevIncome = prevMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const prevExpenses = prevMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const prevBalance = prevIncome - prevExpenses;
    const prevSavingsRate =
      prevIncome > 0 ? (prevBalance / prevIncome) * 100 : 0;

    // Calcular variações percentuais
    const incomeChange =
      prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
    const expensesChange =
      prevExpenses > 0
        ? ((totalExpenses - prevExpenses) / prevExpenses) * 100
        : 0;
    const savingsRateChange =
      prevSavingsRate > 0 ? savingsRate - prevSavingsRate : 0;

    setMonthlyData(dailyChartData);
    setCategoryData(categoryChartData);
    setPaymentMethodData(paymentMethodChartData);
    setTrendData(trendChartData);
    setRadarData(radarChartData);
    setComparisonData({
      income: incomeChange,
      expenses: expensesChange,
      savingsRate: savingsRateChange,
    });
    setSummary({
      totalIncome,
      totalExpenses,
      balance,
      savingsRate,
      averageTransaction,
    });
  }, [transactions, selectedMonth]);

  // Formatação de valores para o tooltip
  const currencyFormatter = (value) => `R$ ${value.toFixed(2)}`;

  // Função para navegar para o mês anterior ou próximo
  const navigateMonth = (direction) => {
    const newDate =
      direction === "prev"
        ? subMonths(selectedMonth, 1)
        : addMonths(selectedMonth, 1);
    setSelectedMonth(newDate);
  };

  // Função para tratar a mudança do mês selecionado
  const handleMonthChange = (e) => {
    setSelectedMonth(new Date(e.target.value));
  };

  // Componente para exibir a variação em relação ao mês anterior
  const ChangeIndicator = ({ value, inverted = false }) => {
    // Se inverted for true, valores negativos são bons (ex: redução de despesas)
    const isPositive = inverted ? value <= 0 : value >= 0;
    const displayValue = Math.abs(value).toFixed(1);

    return (
      <span
        className={`change-indicator ${isPositive ? "positive" : "negative"}`}
      >
        {isPositive ? "↑" : "↓"} {displayValue}%
      </span>
    );
  };

  return (
    <div className="dashboard">
      <div className="month-selector">
        <button
          className="month-nav-btn"
          onClick={() => navigateMonth("prev")}
          aria-label="Mês anterior"
        >
          ←
        </button>
        <div>
          <h2>Resumo Mensal</h2>
          <select
            value={format(selectedMonth, "yyyy-MM")}
            onChange={handleMonthChange}
            className="month-select"
          >
            {months.map((month) => (
              <option
                key={format(month, "yyyy-MM")}
                value={format(month, "yyyy-MM")}
              >
                {format(month, "MMMM/yyyy", { locale: ptBR })}
              </option>
            ))}
          </select>
        </div>
        <button
          className="month-nav-btn"
          onClick={() => navigateMonth("next")}
          aria-label="Próximo mês"
        >
          →
        </button>
      </div>

      <div className="summary-cards">
        <div className="card">
          <h3>Receitas</h3>
          <p className="value income">R$ {summary.totalIncome.toFixed(2)}</p>
          {comparisonData.income !== 0 && (
            <ChangeIndicator value={comparisonData.income} />
          )}
        </div>
        <div className="card">
          <h3>Despesas</h3>
          <p className="value expense">R$ {summary.totalExpenses.toFixed(2)}</p>
          {comparisonData.expenses !== 0 && (
            <ChangeIndicator value={comparisonData.expenses} inverted={true} />
          )}
        </div>
        <div className="card">
          <h3>Saldo</h3>
          <p className={`value ${summary.balance >= 0 ? "income" : "expense"}`}>
            R$ {summary.balance.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <h3>Taxa de Poupança</h3>
          <p className="value">{summary.savingsRate.toFixed(1)}%</p>
          {comparisonData.savingsRate !== 0 && (
            <ChangeIndicator value={comparisonData.savingsRate} />
          )}
        </div>
        <div className="card">
          <h3>Média por Transação</h3>
          <p className="value">R$ {summary.averageTransaction.toFixed(2)}</p>
        </div>
      </div>

      <div className="charts">
        <div className="chart-container trend-chart">
          <h3>Tendência nos Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={currencyFormatter} />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                name="Receitas"
                stroke="#00C49F"
                fill="#00C49F"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Despesas"
                stroke="#FF8042"
                fill="#FF8042"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="Saldo"
                stroke="#8884D8"
                fill="#8884D8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>
            Fluxo Diário -{" "}
            {format(selectedMonth, "MMMM/yyyy", { locale: ptBR })}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={currencyFormatter} />
              <Legend />
              <Bar
                dataKey="income"
                name="Receitas"
                fill="#00C49F"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="Despesas"
                fill="#FF8042"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>
            Saldo Diário -{" "}
            {format(selectedMonth, "MMMM/yyyy", { locale: ptBR })}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={currencyFormatter} />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                name="Saldo"
                stroke="#8884D8"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>
            Despesas por Categoria -{" "}
            {format(selectedMonth, "MMMM/yyyy", { locale: ptBR })}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(1)}%`
                }
                labelLine={false}
                animationDuration={500}
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>
            Métodos de Pagamento -{" "}
            {format(selectedMonth, "MMMM/yyyy", { locale: ptBR })}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethodData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(1)}%`
                }
                labelLine={false}
                animationDuration={500}
              >
                {paymentMethodData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Proporção de Gastos por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} label="%" />
              <Radar
                name="Proporção"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
