import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Reports.css';

const Reports = ({ transactions }) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all',
    category: 'all'
  });
  
  const [reportType, setReportType] = useState('expenses-by-category');
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reportData, setReportData] = useState([]);
  
  // Cores para os gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#4CAF50', '#F44336', '#9C27B0', '#3F51B5'];
  
  // Tipos de relatórios disponíveis
  const reportTypes = [
    { id: 'expenses-by-category', name: 'Despesas por Categoria' },
    { id: 'income-by-category', name: 'Receitas por Categoria' },
    { id: 'monthly-balance', name: 'Balanço Mensal' },
    { id: 'expense-trends', name: 'Tendências de Gastos' },
    { id: 'comparison', name: 'Comparação de Períodos' }
  ];
  
  // Efeito para obter todas as categorias únicas
  useEffect(() => {
    if (transactions.length > 0) {
      const uniqueCategories = [...new Set(transactions.map(t => t.category))];
      setCategories(uniqueCategories);
    }
  }, [transactions]);
  
  // Efeito para filtrar transações quando os filtros mudarem
  useEffect(() => {
    if (transactions.length === 0) return;
    
    let filtered = [...transactions];
    
    // Filtrar por data de início
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }
    
    // Filtrar por data de fim
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Definir para o final do dia
      filtered = filtered.filter(t => new Date(t.date) <= endDate);
    }
    
    // Filtrar por tipo
    if (filters.type !== 'all') {
      if (filters.type === 'expense') {
        filtered = filtered.filter(t => t.amount < 0);
      } else if (filters.type === 'income') {
        filtered = filtered.filter(t => t.amount > 0);
      }
    }
    
    // Filtrar por categoria
    if (filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    
    setFilteredTransactions(filtered);
  }, [transactions, filters]);
  
  // Efeito para gerar os dados do relatório quando o tipo de relatório ou transações filtradas mudarem
  useEffect(() => {
    if (filteredTransactions.length === 0) {
      setReportData([]);
      return;
    }
    
    switch (reportType) {
      case 'expenses-by-category':
        generateExpensesByCategoryReport();
        break;
      case 'income-by-category':
        generateIncomeByCategoryReport();
        break;
      case 'monthly-balance':
        generateMonthlyBalanceReport();
        break;
      case 'expense-trends':
        generateExpenseTrendsReport();
        break;
      case 'comparison':
        generateComparisonReport();
        break;
      default:
        setReportData([]);
    }
  }, [reportType, filteredTransactions]);
  
  // Gerar relatório de despesas por categoria
  const generateExpensesByCategoryReport = () => {
    const expenses = filteredTransactions.filter(t => t.amount < 0);
    if (expenses.length === 0) {
      setReportData([]);
      return;
    }
    
    const categoryTotals = {};
    
    expenses.forEach(expense => {
      const category = expense.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += Math.abs(expense.amount);
    });
    
    const data = Object.keys(categoryTotals).map((category, index) => ({
      name: getCategoryName(category),
      value: categoryTotals[category],
      color: COLORS[index % COLORS.length]
    }));
    
    // Ordenar por valor (maior para menor)
    data.sort((a, b) => b.value - a.value);
    
    setReportData(data);
  };
  
  // Gerar relatório de receitas por categoria
  const generateIncomeByCategoryReport = () => {
    const incomes = filteredTransactions.filter(t => t.amount > 0);
    if (incomes.length === 0) {
      setReportData([]);
      return;
    }
    
    const categoryTotals = {};
    
    incomes.forEach(income => {
      const category = income.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += income.amount;
    });
    
    const data = Object.keys(categoryTotals).map((category, index) => ({
      name: getCategoryName(category),
      value: categoryTotals[category],
      color: COLORS[index % COLORS.length]
    }));
    
    // Ordenar por valor (maior para menor)
    data.sort((a, b) => b.value - a.value);
    
    setReportData(data);
  };
  
  // Gerar relatório de balanço mensal
  const generateMonthlyBalanceReport = () => {
    if (filteredTransactions.length === 0) {
      setReportData([]);
      return;
    }
    
    const monthlyData = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          month: new Date(date.getFullYear(), date.getMonth(), 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
          income: 0,
          expense: 0
        };
      }
      
      if (transaction.amount > 0) {
        monthlyData[monthYear].income += transaction.amount;
      } else {
        monthlyData[monthYear].expense += Math.abs(transaction.amount);
      }
    });
    
    // Converter para array e adicionar balanço
    const data = Object.values(monthlyData).map(item => ({
      ...item,
      balance: item.income - item.expense
    }));
    
    // Ordenar por data
    data.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA - dateB;
    });
    
    setReportData(data);
  };
  
  // Gerar relatório de tendências de gastos
  const generateExpenseTrendsReport = () => {
    const expenses = filteredTransactions.filter(t => t.amount < 0);
    if (expenses.length === 0) {
      setReportData([]);
      return;
    }
    
    // Agrupar despesas por semana
    const weeklyData = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-${weekNumber}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: `Semana ${weekNumber}`,
          date: new Date(date),
          total: 0
        };
      }
      
      weeklyData[weekKey].total += Math.abs(expense.amount);
    });
    
    // Converter para array
    const data = Object.values(weeklyData);
    
    // Ordenar por data
    data.sort((a, b) => a.date - b.date);
    
    // Limitar a últimas 12 semanas para melhor visualização
    const limitedData = data.slice(-12);
    
    setReportData(limitedData);
  };
  
  // Gerar relatório de comparação de períodos
  const generateComparisonReport = () => {
    if (filteredTransactions.length === 0) {
      setReportData([]);
      return;
    }
    
    // Encontrar data mais antiga e mais recente
    const dates = filteredTransactions.map(t => new Date(t.date));
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));
    
    // Calcular intervalo total em dias
    const totalDays = Math.floor((newestDate - oldestDate) / (1000 * 60 * 60 * 24));
    
    // Definir períodos para comparação (dividir o intervalo ao meio)
    const middleDate = new Date(oldestDate.getTime() + (newestDate - oldestDate) / 2);
    
    // Separar transações em dois períodos
    const period1Transactions = filteredTransactions.filter(
      t => new Date(t.date) >= oldestDate && new Date(t.date) < middleDate
    );
    
    const period2Transactions = filteredTransactions.filter(
      t => new Date(t.date) >= middleDate && new Date(t.date) <= newestDate
    );
    
    // Calcular totais de receitas e despesas para ambos os períodos
    const period1Income = period1Transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const period1Expense = period1Transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
    const period2Income = period2Transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const period2Expense = period2Transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Formatar datas para exibição
    const formatDate = date => date.toLocaleDateString();
    
    const data = [
      {
        name: `${formatDate(oldestDate)} - ${formatDate(new Date(middleDate.getTime() - 86400000))}`,
        income: period1Income,
        expense: period1Expense,
        balance: period1Income - period1Expense,
        period: 'Primeiro'
      },
      {
        name: `${formatDate(middleDate)} - ${formatDate(newestDate)}`,
        income: period2Income,
        expense: period2Expense,
        balance: period2Income - period2Expense,
        period: 'Segundo'
      }
    ];
    
    setReportData(data);
  };
  
  // Função auxiliar para obter número da semana
  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };
  
  // Função para obter nome amigável de categoria
  const getCategoryName = (categoryId) => {
    // Aqui você pode mapear IDs de categoria para nomes amigáveis
    // Por simplicidade, estamos apenas usando o ID da categoria
    return categoryId;
  };
  
  // Formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Formatar porcentagem
  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };
  
  // Renderizar gráfico apropriado com base no tipo de relatório
  const renderChart = () => {
    if (reportData.length === 0) {
      return (
        <div className="no-data">
          <p>Não há dados suficientes para gerar este relatório.</p>
          <p>Tente ajustar os filtros ou selecionar outro tipo de relatório.</p>
        </div>
      );
    }
    
    switch (reportType) {
      case 'expenses-by-category':
      case 'income-by-category':
        return (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={reportData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reportData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="summary-table">
              <h3>Resumo</h3>
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Valor</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => {
                    const total = reportData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = (item.value / total) * 100;
                    
                    return (
                      <tr key={index}>
                        <td>
                          <span className="color-dot" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}></span>
                          {item.name}
                        </td>
                        <td>{formatCurrency(item.value)}</td>
                        <td>{formatPercentage(percentage)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{formatCurrency(reportData.reduce((sum, item) => sum + item.value, 0))}</td>
                    <td>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      
      case 'monthly-balance':
        return (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={reportData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    return [formatCurrency(value), name === 'balance' ? 'Saldo' : name === 'income' ? 'Receitas' : 'Despesas'];
                  }}
                />
                <Legend
                  payload={[
                    { value: 'Receitas', type: 'square', color: '#4CAF50' },
                    { value: 'Despesas', type: 'square', color: '#F44336' },
                    { value: 'Saldo', type: 'square', color: '#2196F3' }
                  ]}
                />
                <Bar dataKey="income" name="Receitas" fill="#4CAF50" />
                <Bar dataKey="expense" name="Despesas" fill="#F44336" />
                <Bar dataKey="balance" name="Saldo" fill="#2196F3" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="summary-table">
              <h3>Resumo Mensal</h3>
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Receitas</th>
                    <th>Despesas</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.month}</td>
                      <td className="positive">{formatCurrency(item.income)}</td>
                      <td className="negative">{formatCurrency(item.expense)}</td>
                      <td className={item.balance >= 0 ? 'positive' : 'negative'}>
                        {formatCurrency(item.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="positive">
                      {formatCurrency(reportData.reduce((sum, item) => sum + item.income, 0))}
                    </td>
                    <td className="negative">
                      {formatCurrency(reportData.reduce((sum, item) => sum + item.expense, 0))}
                    </td>
                    <td className={reportData.reduce((sum, item) => sum + item.balance, 0) >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(reportData.reduce((sum, item) => sum + item.balance, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      
      case 'expense-trends':
        return (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={reportData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Gastos Semanais"
                  stroke="#F44336"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="trend-summary">
              <h3>Análise de Tendência</h3>
              
              {reportData.length >= 2 && (
                <div className="trend-stats">
                  <div className="trend-item">
                    <span className="trend-label">Média Semanal:</span>
                    <span className="trend-value">
                      {formatCurrency(reportData.reduce((sum, item) => sum + item.total, 0) / reportData.length)}
                    </span>
                  </div>
                  
                  <div className="trend-item">
                    <span className="trend-label">Maior Gasto:</span>
                    <span className="trend-value">
                      {formatCurrency(Math.max(...reportData.map(item => item.total)))}
                    </span>
                  </div>
                  
                  <div className="trend-item">
                    <span className="trend-label">Menor Gasto:</span>
                    <span className="trend-value">
                      {formatCurrency(Math.min(...reportData.map(item => item.total)))}
                    </span>
                  </div>
                  
                  <div className="trend-item">
                    <span className="trend-label">Última Tendência:</span>
                    <span className={`trend-value ${reportData[reportData.length - 1].total > reportData[reportData.length - 2].total ? 'negative' : 'positive'}`}>
                      {reportData[reportData.length - 1].total > reportData[reportData.length - 2].total ? '↑ Aumento' : '↓ Redução'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'comparison':
        return (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={reportData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    return [formatCurrency(value), name === 'balance' ? 'Saldo' : name === 'income' ? 'Receitas' : 'Despesas'];
                  }}
                />
                <Legend
                  payload={[
                    { value: 'Receitas', type: 'square', color: '#4CAF50' },
                    { value: 'Despesas', type: 'square', color: '#F44336' },
                    { value: 'Saldo', type: 'square', color: '#2196F3' }
                  ]}
                />
                <Bar dataKey="income" name="Receitas" fill="#4CAF50" />
                <Bar dataKey="expense" name="Despesas" fill="#F44336" />
                <Bar dataKey="balance" name="Saldo" fill="#2196F3" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="comparison-summary">
              <h3>Comparação de Períodos</h3>
              
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Datas</th>
                    <th>Receitas</th>
                    <th>Despesas</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.period} Período</td>
                      <td>{item.name}</td>
                      <td className="positive">{formatCurrency(item.income)}</td>
                      <td className="negative">{formatCurrency(item.expense)}</td>
                      <td className={item.balance >= 0 ? 'positive' : 'negative'}>
                        {formatCurrency(item.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {reportData.length === 2 && (
                <div className="period-comparison">
                  <h4>Análise Comparativa</h4>
                  
                  <div className="comparison-items">
                    <div className="comparison-item">
                      <span className="comparison-label">Variação de Receitas:</span>
                      <span className={`comparison-value ${reportData[1].income >= reportData[0].income ? 'positive' : 'negative'}`}>
                        {reportData[0].income > 0 
                          ? `${(((reportData[1].income - reportData[0].income) / reportData[0].income) * 100).toFixed(1)}%` 
                          : 'N/A'}
                        {reportData[1].income >= reportData[0].income ? ' ↑' : ' ↓'}
                      </span>
                    </div>
                    
                    <div className="comparison-item">
                      <span className="comparison-label">Variação de Despesas:</span>
                      <span className={`comparison-value ${reportData[1].expense <= reportData[0].expense ? 'positive' : 'negative'}`}>
                        {reportData[0].expense > 0 
                          ? `${(((reportData[1].expense - reportData[0].expense) / reportData[0].expense) * 100).toFixed(1)}%` 
                          : 'N/A'}
                        {reportData[1].expense <= reportData[0].expense ? ' ↓' : ' ↑'}
                      </span>
                    </div>
                    
                    <div className="comparison-item">
                      <span className="comparison-label">Variação de Saldo:</span>
                      <span className={`comparison-value ${reportData[1].balance >= reportData[0].balance ? 'positive' : 'negative'}`}>
                        {reportData[0].balance !== 0 
                          ? `${(((reportData[1].balance - reportData[0].balance) / Math.abs(reportData[0].balance)) * 100).toFixed(1)}%` 
                          : 'N/A'}
                        {reportData[1].balance >= reportData[0].balance ? ' ↑' : ' ↓'}
                      </span>
                    </div>
                    
                    <div className="comparison-item">
                      <span className="comparison-label">Conclusão:</span>
                      <span className={`comparison-value ${reportData[1].balance >= reportData[0].balance ? 'positive' : 'negative'}`}>
                        {reportData[1].balance >= reportData[0].balance 
                          ? 'Melhoria na situação financeira' 
                          : 'Deterioração na situação financeira'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return <div className="no-data">Selecione um tipo de relatório</div>;
    }
  };
  
  // Inicializar datas padrão para os últimos 3 meses se não estiverem definidas
  useEffect(() => {
    if (!filters.startDate && !filters.endDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      
      setFilters({
        ...filters,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    }
  }, []);
  
  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Relatórios</h2>
        <p>Analise seus dados financeiros com relatórios personalizados</p>
      </div>
      
      <div className="filters-panel">
        <h3>Filtros</h3>
        
        <div className="filters-form">
          <div className="filter-row">
            <div className="filter-group">
              <label>Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            
            <div className="filter-group">
              <label>Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-group">
              <label>Tipo</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
              >
                <option value="all">Todos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Categoria</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="all">Todas</option>
                {categories.map((category, index) => (
                  <option key={index} value={category}>
                    {getCategoryName(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="report-types">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              className={reportType === type.id ? 'active' : ''}
              onClick={() => setReportType(type.id)}
            >
              {type.name}
            </button>
          ))}
        </div>
        
        <div className="filter-summary">
          {filteredTransactions.length > 0 ? (
            <p>
              Mostrando {filteredTransactions.length} transações de um total de {transactions.length}.
            </p>
          ) : (
            <p>Nenhuma transação encontrada com os filtros atuais.</p>
          )}
        </div>
      </div>
      
      <div className="report-container">
        <div className="report-title">
          <h3>
            {reportTypes.find(t => t.id === reportType)?.name || 'Relatório'}
            {filters.startDate && filters.endDate && (
              <span className="report-date-range">
                {' '}({new Date(filters.startDate).toLocaleDateString()} - {new Date(filters.endDate).toLocaleDateString()})
              </span>
            )}
          </h3>
        </div>
        
        <div className="report-content">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default Reports;