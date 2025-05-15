// src/components/Notifications.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import './Notifications.css';

const Notifications = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    transactionReminders: true,
    goalAlerts: true,
    budgetAlerts: true,
    emailNotifications: false,
    spendingLimitAmount: 500
  });
  const [showSettings, setShowSettings] = useState(false);

  // Buscar notificações do usuário
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        // Buscar configurações
        const settingsRef = collection(db, 'notificationSettings');
        const settingsQuery = query(settingsRef, where('userId', '==', userId));
        const settingsSnapshot = await getDocs(settingsQuery);
        
        if (!settingsSnapshot.empty) {
          const settingsData = settingsSnapshot.docs[0].data();
          setNotificationSettings({
            id: settingsSnapshot.docs[0].id,
            ...settingsData
          });
        }
        
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        
        // Ordenar por data (mais recentes primeiro)
        notificationsData.sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [userId]);

  // Marcar como lida
  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      
      // Atualizar estado local
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Excluir notificação
  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      
      // Atualizar estado local
      setNotifications(notifications.filter(notification => 
        notification.id !== notificationId
      ));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
    }
  };

  // Salvar configurações
  const saveSettings = async () => {
    try {
      if (notificationSettings.id) {
        // Atualizar configurações existentes
        await updateDoc(doc(db, 'notificationSettings', notificationSettings.id), {
          transactionReminders: notificationSettings.transactionReminders,
          goalAlerts: notificationSettings.goalAlerts,
          budgetAlerts: notificationSettings.budgetAlerts,
          emailNotifications: notificationSettings.emailNotifications,
          spendingLimitAmount: Number(notificationSettings.spendingLimitAmount)
        });
      } else {
        // Criar novas configurações
        const docRef = await addDoc(collection(db, 'notificationSettings'), {
          userId,
          transactionReminders: notificationSettings.transactionReminders,
          goalAlerts: notificationSettings.goalAlerts,
          budgetAlerts: notificationSettings.budgetAlerts,
          emailNotifications: notificationSettings.emailNotifications,
          spendingLimitAmount: Number(notificationSettings.spendingLimitAmount),
          createdAt: new Date()
        });
        
        setNotificationSettings({
          ...notificationSettings,
          id: docRef.id
        });
      }
      
      setShowSettings(false);
    } catch (error) {
      console.error('Erro ao salvar configurações de notificação:', error);
    }
  };

  // Formatar data
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="notifications-container">
      <button 
        className="notifications-toggle"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <span className="notifications-icon">🔔</span>
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="notifications-badge">
            {notifications.filter(n => !n.read).length}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notificações</h3>
            <div className="notifications-actions">
              <button 
                className="settings-button"
                onClick={() => setShowSettings(!showSettings)}
                title="Configurações de notificação"
              >
                ⚙️
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="notifications-loading">Carregando...</div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">
              <p>Você não tem notificações.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    {notification.type === 'transaction' && '💰'}
                    {notification.type === 'goal' && '🎯'}
                    {notification.type === 'budget' && '📊'}
                    {notification.type === 'system' && '🔔'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatDate(notification.timestamp)}</div>
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button 
                        className="notification-read-button"
                        onClick={() => markAsRead(notification.id)}
                        title="Marcar como lida"
                      >
                        ✓
                      </button>
                    )}
                    <button 
                      className="notification-delete-button"
                      onClick={() => deleteNotification(notification.id)}
                      title="Excluir notificação"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {showSettings && (
        <div className="notification-settings-modal">
          <div className="notification-settings-content">
            <h3>Configurações de Notificação</h3>
            
            <div className="settings-form">
              <div className="settings-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={notificationSettings.transactionReminders}
                    onChange={() => setNotificationSettings({
                      ...notificationSettings,
                      transactionReminders: !notificationSettings.transactionReminders
                    })}
                  />
                  <span className="toggle-text">Lembrar sobre transações recorrentes</span>
                </label>
              </div>
              
              <div className="settings-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={notificationSettings.goalAlerts}
                    onChange={() => setNotificationSettings({
                      ...notificationSettings,
                      goalAlerts: !notificationSettings.goalAlerts
                    })}
                  />
                  <span className="toggle-text">Alertas sobre prazos de metas</span>
                </label>
              </div>
              
              <div className="settings-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={notificationSettings.budgetAlerts}
                    onChange={() => setNotificationSettings({
                      ...notificationSettings,
                      budgetAlerts: !notificationSettings.budgetAlerts
                    })}
                  />
                  <span className="toggle-text">Alertas de limite de gastos</span>
                </label>
              </div>
              
              {notificationSettings.budgetAlerts && (
                <div className="settings-group">
                  <label>
                    Limite de gastos (R$):
                    <input
                      type="number"
                      value={notificationSettings.spendingLimitAmount}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        spendingLimitAmount: e.target.value
                      })}
                      min="0"
                      step="50"
                    />
                  </label>
                </div>
              )}
              
              <div className="settings-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={() => setNotificationSettings({
                      ...notificationSettings,
                      emailNotifications: !notificationSettings.emailNotifications
                    })}
                  />
                  <span className="toggle-text">Receber notificações por email</span>
                </label>
              </div>
            </div>
            
            <div className="settings-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowSettings(false)}
              >
                Cancelar
              </button>
              <button 
                className="save-button"
                onClick={saveSettings}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
