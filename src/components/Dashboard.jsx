import React, { useState, useEffect } from 'react';
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
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Dashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Dashboard = ({ transactions }) => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    savingsRate: 0,
    averageTransaction: 0
  });

  useEffect(() => {
    if (!transactions.length) return;

    // Processar dados mensais
    const monthlyTransactions = transactions.reduce((acc, transaction) => {
      const month = format(new Date(transaction.date), 'MMM/yyyy', { locale: ptBR });
      if (!acc[month]) {
        acc[month] = { income: 0, expenses: 0 };
      }
      if (transaction.type === 'income') {
        acc[month].income += transaction.amount;
      } else {
        acc[month].expenses += Math.abs(transaction.amount);
      }
      return acc;
    }, {});

    const monthlyChartData = Object.entries(monthlyTransactions).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      balance: data.income - data.expenses
    }));

    // Processar dados por categoria
    const categoryTransactions = transactions.reduce((acc, transaction) => {
      if (transaction.type === 'expense') {
        if (!acc[transaction.category]) {
          acc[transaction.category] = 0;
        }
        acc[transaction.category] += Math.abs(transaction.amount);
      }
      return acc;
    }, {});

    const categoryChartData = Object.entries(categoryTransactions).map(([category, amount]) => ({
      name: category,
      value: amount
    }));

    // Processar dados por método de pagamento
    const paymentMethodTransactions = transactions.reduce((acc, transaction) => {
      if (!acc[transaction.paymentMethod]) {
        acc[transaction.paymentMethod] = 0;
      }
      acc[transaction.paymentMethod] += Math.abs(transaction.amount);
      return acc;
    }, {});

    const paymentMethodChartData = Object.entries(paymentMethodTransactions).map(([method, amount]) => ({
      name: method,
      value: amount
    }));

    // Calcular resumo
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    const averageTransaction = transactions.length > 0
      ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length
      : 0;

    setMonthlyData(monthlyChartData);
    setCategoryData(categoryChartData);
    setPaymentMethodData(paymentMethodChartData);
    setSummary({
      totalIncome,
      totalExpenses,
      balance,
      savingsRate,
      averageTransaction
    });
  }, [transactions]);

  return (
    <div className="dashboard">
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
          <p className={`value ${summary.balance >= 0 ? 'income' : 'expense'}`}>
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
          <h3>Fluxo Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
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
          <h3>Despesas por Categoria</h3>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Métodos de Pagamento</h3>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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