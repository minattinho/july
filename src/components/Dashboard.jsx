import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = ({ transactions, months = 6 }) => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [savingsRate, setSavingsRate] = useState(0);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#4CAF50', '#F44336', '#9C27B0', '#3F51B5'];
  
  // Preparar dados quando as transações mudarem
  useEffect(() => {
    if (transactions.length > 0) {
      prepareMonthlyData();
      prepareCategoryData();
      prepareBalanceHistory();
      calculateSavingsRate();
    }
  }, [transactions, months]); // Adicionamos 'months' como dependência
  
  // Preparar dados mensais
  const prepareMonthlyData = () => {
    const today = new Date();
    const data = [];
    
    // Prepare data for the last X months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(today.getMonth() - i);
      
      const month = date.toLocaleString('default', { month: 'short' });
      
      // Filter transactions for this month
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === date.getMonth() && 
               tDate.getFullYear() === date.getFullYear();
      });
      
      const income = monthTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
        
      const expense = monthTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
      data.push({
        name: month,
        income,
        expense,
        balance: income - expense
      });
    }
    
    setMonthlyData(data);
  };
  
  // Preparar dados de categoria
  const prepareCategoryData = () => {
    // Get all expenses
    const expenses = transactions.filter(t => t.amount < 0);
    
    // Group by category
    const categoryMap = {};
    expenses.forEach(expense => {
      const category = expense.category;
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += Math.abs(expense.amount);
    });
    
    // Convert to array for chart
    const data = Object.keys(categoryMap).map((category, index) => ({
      name: category,
      value: categoryMap[category],
      color: COLORS[index % COLORS.length]
    }));
    
    // Sort by value (highest to lowest)
    data.sort((a, b) => b.value - a.value);
    
    setCategoryData(data);
  };
  
  // Preparar histórico de saldo
  const prepareBalanceHistory = () => {
    if (transactions.length === 0) return;
    
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    
    // Calculate running balance
    let balance = 0;
    const history = sortedTransactions.map(t => {
      balance += t.amount;
      return {
        date: new Date(t.date).toLocaleDateString(),
        balance
      };
    });
    
    // Only keep enough points to make the chart readable
    const step = Math.max(1, Math.floor(history.length / 15));
    const sampledHistory = history.filter((_, i) => i % step === 0);
    
    // Make sure the last point is included
    if (history.length > 0 && sampledHistory[sampledHistory.length - 1] !== history[history.length - 1]) {
      sampledHistory.push(history[history.length - 1]);
    }
    
    setBalanceHistory(sampledHistory);
  };
  
  // Calcular taxa de economia
  const calculateSavingsRate = () => {
    const recentMonths = 3; // Calculate savings rate for the last 3 months
    const today = new Date();
    
    // Filter transactions for recent months
    const recentTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      const monthDiff = (today.getFullYear() - tDate.getFullYear()) * 12 + today.getMonth() - tDate.getMonth();
      return monthDiff <= recentMonths;
    });
    
    const income = recentTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = recentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Avoid division by zero
    const rate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    setSavingsRate(rate);
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };
  
  // Don't render charts if there's no data
  if (transactions.length === 0) {
    return (
      <div className="dashboard empty-dashboard">
        <h2>Dashboard</h2>
        <p>Adicione algumas transações para visualizar métricas e gráficos.</p>
      </div>
    );
  }
  
  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="dashboard-summary">
        <div className="summary-card savings-rate">
          <h3>Taxa de Economia</h3>
          <div className={`rate-value ${savingsRate >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(savingsRate)}
          </div>
          <p>dos últimos 3 meses</p>
        </div>
        
        <div className="summary-card top-expense">
          <h3>Maior Categoria de Gasto</h3>
          {categoryData.length > 0 && (
            <>
              <div className="top-category">{categoryData[0].name}</div>
              <div className="top-value">{formatCurrency(categoryData[0].value)}</div>
            </>
          )}
        </div>
        
        <div className="summary-card month-comparison">
          <h3>Este mês vs. Mês Anterior</h3>
          {monthlyData.length >= 2 && (
            <div className="comparison">
              <div className={`percentage ${monthlyData[monthlyData.length-1].expense <= monthlyData[monthlyData.length-2].expense ? 'positive' : 'negative'}`}>
                {monthlyData[monthlyData.length-2].expense > 0 
                  ? formatPercentage((monthlyData[monthlyData.length-1].expense - monthlyData[monthlyData.length-2].expense) / monthlyData[monthlyData.length-2].expense * 100)
                  : '0%'
                }
              </div>
              <div className="direction">
                {monthlyData[monthlyData.length-1].expense <= monthlyData[monthlyData.length-2].expense 
                  ? 'Redução em gastos' 
                  : 'Aumento em gastos'
                }
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="chart-container">
        <div className="chart-card">
          <h3>Receitas vs. Despesas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="income" name="Receitas" fill="#4CAF50" />
              <Bar dataKey="expense" name="Despesas" fill="#F44336" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card">
          <h3>Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={balanceHistory}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line 
                type="monotone" 
                dataKey="balance" 
                name="Saldo" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card">
          <h3>Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;