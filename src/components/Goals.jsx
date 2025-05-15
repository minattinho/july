import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import './Goals.css';

const Goals = ({ userId }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: 'savings',
    color: '#4CAF50'
  });
  
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  
  // Categorias de metas
  const goalCategories = [
    { id: 'savings', name: 'Poupança', color: '#4CAF50' },
    { id: 'investment', name: 'Investimento', color: '#2196F3' },
    { id: 'debt', name: 'Quitar Dívida', color: '#F44336' },
    { id: 'purchase', name: 'Compra', color: '#FF9800' },
    { id: 'travel', name: 'Viagem', color: '#9C27B0' },
    { id: 'education', name: 'Educação', color: '#3F51B5' },
    { id: 'emergency', name: 'Emergência', color: '#795548' },
    { id: 'retirement', name: 'Aposentadoria', color: '#607D8B' },
    { id: 'other', name: 'Outro', color: '#9E9E9E' }
  ];
  
  // Buscar metas do usuário
// Buscar metas do usuário
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        
        const goalsRef = collection(db, 'goals');
        const q = query(goalsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setGoals([]);
        } else {
          const goalsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Ordenar por progresso (ascendente)
          goalsData.sort((a, b) => {
            const progressA = a.currentAmount / a.targetAmount;
            const progressB = b.currentAmount / b.targetAmount;
            return progressA - progressB;
          });
          
          setGoals(goalsData);
        }
      } catch (error) {
        console.error('Erro ao buscar metas:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchGoals();
    }
  }, [userId]);
  
  // Adicionar nova meta
  const handleAddGoal = async (e) => {
    e.preventDefault();
    
    if (!newGoal.title || !newGoal.targetAmount || !newGoal.targetDate) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    try {
      const goalData = {
        userId,
        title: newGoal.title,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: parseFloat(newGoal.currentAmount || 0),
        targetDate: new Date(newGoal.targetDate).toISOString(),
        category: newGoal.category,
        color: goalCategories.find(cat => cat.id === newGoal.category)?.color || '#4CAF50',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'goals'), goalData);
      
      setGoals([...goals, { id: docRef.id, ...goalData }]);
      
      // Reset form
      setNewGoal({
        title: '',
        targetAmount: '',
        currentAmount: '',
        targetDate: '',
        category: 'savings',
        color: '#4CAF50'
      });
      
      setIsAddingGoal(false);
    } catch (error) {
      console.error('Erro ao adicionar meta:', error);
      alert('Erro ao salvar a meta. Tente novamente.');
    }
  };
  
  // Adicionar valor à meta
  const handleAddToGoal = async (goalId, amount) => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Por favor, informe um valor válido');
      return;
    }
    
    try {
      const goalIndex = goals.findIndex(g => g.id === goalId);
      if (goalIndex === -1) return;
      
      const goal = goals[goalIndex];
      const newAmount = goal.currentAmount + parseFloat(amount);
      
      // Atualizar no banco de dados
      await updateDoc(doc(db, 'goals', goalId), {
        currentAmount: newAmount,
        updatedAt: new Date().toISOString()
      });
      
      // Atualizar localmente
      const updatedGoals = [...goals];
      updatedGoals[goalIndex] = {
        ...goal,
        currentAmount: newAmount,
        updatedAt: new Date().toISOString()
      };
      
      setGoals(updatedGoals);
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      alert('Erro ao atualizar a meta. Tente novamente.');
    }
  };
  
  // Remover meta
  const handleRemoveGoal = async (goalId) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'goals', goalId));
      
      setGoals(goals.filter(goal => goal.id !== goalId));
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      alert('Erro ao excluir a meta. Tente novamente.');
    }
  };
  
  // Calcular progresso da meta
  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };
  
  // Formatar valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Formatar data
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };
  
  // Calcular dias restantes
  const calculateDaysRemaining = (targetDate) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  return (
    <div className="goals-container">
      <div className="goals-header">
        <h2>Metas Financeiras</h2>
        <button
          className="add-goal-button"
          onClick={() => setIsAddingGoal(!isAddingGoal)}
        >
          {isAddingGoal ? 'Cancelar' : '+ Nova Meta'}
        </button>
      </div>
      
      {isAddingGoal && (
        <div className="add-goal-form">
          <h3>Adicionar Nova Meta</h3>
          
          <form onSubmit={handleAddGoal}>
            <div className="form-group">
              <label>Nome da Meta</label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                placeholder="Ex: Comprar um carro"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Valor Alvo (R$)</label>
                <input
                  type="number"
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Valor Atual (R$)</label>
                <input
                  type="number"
                  value={newGoal.currentAmount}
                  onChange={(e) => setNewGoal({...newGoal, currentAmount: e.target.value})}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Data Alvo</label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Categoria</label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                >
                  {goalCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={() => setIsAddingGoal(false)} className="cancel-button">
                Cancelar
              </button>
              <button type="submit" className="submit-button">
                Salvar Meta
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <div className="loading">Carregando metas...</div>
      ) : goals.length === 0 ? (
        <div className="empty-goals">
          <p>Você ainda não tem metas financeiras.</p>
          <p>Crie uma meta para acompanhar seu progresso em direção aos seus objetivos financeiros!</p>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map(goal => {
            const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
            const daysRemaining = calculateDaysRemaining(goal.targetDate);
            
            return (
              <div key={goal.id} className="goal-card">
                <div className="goal-header" style={{ borderColor: goal.color }}>
                  <div className="goal-category">
                    <span className="category-dot" style={{ backgroundColor: goal.color }}></span>
                    {goalCategories.find(cat => cat.id === goal.category)?.name || 'Outro'}
                  </div>
                  <button className="remove-goal" onClick={() => handleRemoveGoal(goal.id)}>
                    ×
                  </button>
                </div>
                
                <h3 className="goal-title">{goal.title}</h3>
                
                <div className="goal-progress-container">
                  <div className="goal-progress-bar">
                    <div
                      className="goal-progress-fill"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: goal.color
                      }}
                    ></div>
                  </div>
                  <div className="goal-progress-text">
                    {progress.toFixed(0)}% completo
                  </div>
                </div>
                
                <div className="goal-details">
                  <div className="goal-amount">
                    <div>{formatCurrency(goal.currentAmount)}</div>
                    <div className="goal-target">de {formatCurrency(goal.targetAmount)}</div>
                  </div>
                  
                  <div className="goal-date">
                    <div className={`days-remaining ${daysRemaining < 0 ? 'overdue' : ''}`}>
                      {daysRemaining < 0 
                        ? `${Math.abs(daysRemaining)} dias atrasados` 
                        : `${daysRemaining} dias restantes`}
                    </div>
                    <div className="target-date">
                      Meta para {formatDate(goal.targetDate)}
                    </div>
                  </div>
                </div>
                
                <div className="goal-actions">
                  <div className="add-progress-form">
                    <input
                      type="number"
                      placeholder="Adicionar valor"
                      min="0.01"
                      step="0.01"
                      id={`add-amount-${goal.id}`}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`add-amount-${goal.id}`);
                        handleAddToGoal(goal.id, input.value);
                        input.value = '';
                      }}
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Goals;