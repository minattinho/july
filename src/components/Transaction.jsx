import React from 'react';
import './Transaction.css';
import TransactionTags from './TransactionTags';

// Componente para exibir uma única transação
function Transaction({ transaction, onDelete, paymentMethods, categories }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Não categorizado';
  };

  const getPaymentMethodName = (methodId) => {
    const method = paymentMethods.find(m => m.id === methodId);
    return method ? method.name : 'Não especificado';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isOffline = transaction.id.toString().startsWith('local_');

  return (
    <tr className={isOffline ? 'offline-transaction' : ''}>
      <td>{formatDate(transaction.date)}</td>
      <td>{transaction.description}</td>
      <td>{getCategoryName(transaction.category)}</td>
      <td>{transaction.paymentMethod ? getPaymentMethodName(transaction.paymentMethod) : 'Não especificado'}</td>
      <td>
        <TransactionTags tags={transaction.tags} />
      </td>
      <td className={transaction.amount >= 0 ? 'positive' : 'negative'}>
        {formatCurrency(transaction.amount)}
      </td>
      <td>
        <button
          className="delete-button"
          onClick={() => onDelete(transaction.id, transaction.groupId)}
          title="Excluir transação"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

export default Transaction;