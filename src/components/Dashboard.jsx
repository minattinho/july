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
} from "recharts";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import "./Dashboard.css";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

const Dashboard = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    savingsRate: 0,
    averageTransaction: 0,
  });

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

  // Lista de meses para o seletor
  const months = getLast12Months();

  useEffect(() => {
    if (!transactions.length) return;

    // Definir o intervalo de datas para o mês selecionado
    const firstDayOfMonth = startOfMonth(selectedMonth);
    const lastDayOfMonth = endOfMonth(selectedMonth);

    // Filtrar transações apenas do mês selecionado
    const monthTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return isWithinInterval(transactionDate, {
        start: firstDayOfMonth,
        end: lastDayOfMonth,
      });
    });

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

    const categoryChartData = Object.entries(categoryTransactions).map(
      ([category, amount]) => ({
        name: category,
        value: amount,
      })
    );

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
      name: method,
      value: amount,
    }));

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

    setMonthlyData(dailyChartData);
    setCategoryData(categoryChartData);
    setPaymentMethodData(paymentMethodChartData);
    setSummary({
      totalIncome,
      totalExpenses,
      balance,
      savingsRate,
      averageTransaction,
    });
  }, [transactions, selectedMonth]);

  // Função para tratar a mudança do mês selecionado
  const handleMonthChange = (e) => {
    setSelectedMonth(new Date(e.target.value));
  };

  return (
    <div className="dashboard">
      <div className="month-selector">
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

      <div className="summary-cards">
        <div className="card">
          <h3>Receitas</h3>
          <p className="value income">R$ {summary.totalIncome.toFixed(2)}</p>
        </div>
        <div className="card">
          <h3>Despesas</h3>
          <p className="value expense">R$ {summary.totalExpenses.toFixed(2)}</p>
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
        </div>
        <div className="card">
          <h3>Média por Transação</h3>
          <p className="value">R$ {summary.averageTransaction.toFixed(2)}</p>
        </div>
      </div>

      <div className="charts">
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
              <Tooltip />
              <Legend />
              <Bar dataKey="income" name="Receitas" fill="#00C49F" />
              <Bar dataKey="expenses" name="Despesas" fill="#FF8042" />
              <Bar dataKey="balance" name="Saldo" fill="#8884D8" />
            </BarChart>
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
                label
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
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
                label
              >
                {paymentMethodData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
