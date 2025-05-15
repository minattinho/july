// src/components/FinanceOrganizerExtended.jsx
// Este é um componente estendido que será mesclado com o FinanceOrganizer existente
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TagManager from './TagManager';

// Este componente será usado em conjunto com o componente FinanceOrganizer existente

const TagSelector = ({ userId, selectedTags, setSelectedTags }) => {
  const [tags, setTags] = useState([]);
  const [showTagManager, setShowTagManager] = useState(false);
  
  // Buscar tags do usuário
  useEffect(() => {
    const fetchTags = async () => {
      if (!userId) return;
      
      try {
        const tagsRef = collection(db, 'tags');
        const q = query(tagsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        const tagsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordenar por nome
        tagsData.sort((a, b) => a.name.localeCompare(b.name));
        
        setTags(tagsData);
      } catch (error) {
        console.error('Erro ao buscar tags:', error);
      }
    };
    
    fetchTags();
  }, [userId, showTagManager]);
  
  // Alternar seleção de tag
  const toggleTag = (tag) => {
    if (selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // Remover tag da seleção
  const removeTag = (tagId) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };
  
  return (
    <div className="tag-selector">
      <div className="form-group">
        <label>Tags</label>
        <div className="selected-tags">
          {selectedTags.map(tag => (
            <span 
              key={tag.id} 
              className="tag-pill" 
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <span 
                className="tag-remove"
                onClick={() => removeTag(tag.id)}
              >
                ×
              </span>
            </span>
          ))}
        </div>
        
        <div className="tags-dropdown">
          <button 
            type="button"
            className="tags-dropdown-toggle"
            onClick={() => setShowTagManager(!showTagManager)}
          >
            {showTagManager ? 'Ocultar tags' : 'Selecionar/gerenciar tags'}
          </button>
          
          {showTagManager && (
            <div className="tags-dropdown-content">
              {tags.length > 0 ? (
                <div className="tags-list">
                  {tags.map(tag => (
                    <div 
                      key={tag.id} 
                      className={`tag-option ${selectedTags.some(t => t.id === tag.id) ? 'selected' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      <div 
                        className="tag-color" 
                        style={{ backgroundColor: tag.color }}
                      ></div>
                      <div className="tag-name">{tag.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tags-empty-dropdown">
                  <p>Nenhuma tag encontrada. Crie sua primeira tag!</p>
                </div>
              )}
              
              <div className="tags-dropdown-footer">
                <TagManager 
                  userId={userId} 
                  onSelectTag={toggleTag}
                  selectedTags={selectedTags}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { TagSelector };
