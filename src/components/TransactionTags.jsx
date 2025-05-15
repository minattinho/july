// src/components/TransactionTags.jsx
import React from 'react';
import './TagSelector.css';

const TransactionTags = ({ tags = [] }) => {
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className="transaction-tags">
      {tags.map(tag => (
        <span 
          key={tag.id} 
          className="tag-pill" 
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
};

export default TransactionTags;