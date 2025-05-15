// src/components/TagManager.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, doc } from 'firebase/firestore';
import './TagManager.css';

const TagManager = ({ userId, onSelectTag, selectedTags = [] }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#6366F1' });
  const [editingTag, setEditingTag] = useState(null);
  
  // Cores predefinidas para tags
  const predefinedColors = [
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#8B5CF6'  // Purple
  ];

  // Buscar tags do usuário
  useEffect(() => {
    const fetchTags = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchTags();
  }, [userId]);

  // Adicionar nova tag
  const addTag = async (e) => {
    e.preventDefault();
    
    if (!newTag.name.trim()) return;
    
    try {
      const tagData = {
        userId,
        name: newTag.name.trim(),
        color: newTag.color,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'tags'), tagData);
      
      // Atualizar estado local
      setTags([...tags, { id: docRef.id, ...tagData }]);
      
      // Resetar formulário
      setNewTag({ name: '', color: '#6366F1' });
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
    }
  };

  // Editar tag existente
  const updateTag = async (e) => {
    e.preventDefault();
    
    if (!editingTag || !editingTag.name.trim()) return;
    
    try {
      await updateDoc(doc(db, 'tags', editingTag.id), {
        name: editingTag.name.trim(),
        color: editingTag.color,
        updatedAt: new Date()
      });
      
      // Atualizar estado local
      setTags(tags.map(tag => 
        tag.id === editingTag.id 
          ? { ...tag, name: editingTag.name, color: editingTag.color }
          : tag
      ));
      
      // Resetar formulário de edição
      setEditingTag(null);
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao atualizar tag:', error);
    }
  };

  // Excluir tag
  const deleteTag = async (tagId) => {
    if (!confirm('Tem certeza que deseja excluir esta tag?')) return;
    
    try {
      await deleteDoc(doc(db, 'tags', tagId));
      
      // Atualizar estado local
      setTags(tags.filter(tag => tag.id !== tagId));
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
    }
  };

  // Iniciar edição de tag
  const startEditTag = (tag) => {
    setEditingTag(tag);
    setShowModal(true);
  };

  // Alternar seleção de tag
  const toggleTagSelection = (tag) => {
    if (onSelectTag) {
      onSelectTag(tag);
    }
  };

  // Verificar se a tag está selecionada
  const isTagSelected = (tagId) => {
    return selectedTags.some(tag => tag.id === tagId);
  };

  return (
    <div className="tag-manager">
      <div className="tag-manager-header">
        <h3>Tags</h3>
        <button 
          className="add-tag-button"
          onClick={() => {
            setEditingTag(null);
            setNewTag({ name: '', color: '#6366F1' });
            setShowModal(true);
          }}
        >
          + Nova Tag
        </button>
      </div>
      
      {loading ? (
        <div className="tags-loading">Carregando...</div>
      ) : tags.length === 0 ? (
        <div className="tags-empty">
          <p>Você ainda não criou nenhuma tag.</p>
          <p>Tags ajudam a categorizar suas transações de forma personalizada.</p>
        </div>
      ) : (
        <div className="tags-grid">
          {tags.map(tag => (
            <div 
              key={tag.id} 
              className={`tag-item ${isTagSelected(tag.id) ? 'selected' : ''}`}
              onClick={() => toggleTagSelection(tag)}
            >
              <div 
                className="tag-color" 
                style={{ backgroundColor: tag.color }}
              ></div>
              <div className="tag-name">{tag.name}</div>
              <div className="tag-actions">
                <button 
                  className="edit-tag-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditTag(tag);
                  }}
                >
                  ✏️
                </button>
                <button 
                  className="delete-tag-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTag(tag.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showModal && (
        <div className="tag-modal">
          <div className="tag-modal-content">
            <h3>{editingTag ? 'Editar Tag' : 'Nova Tag'}</h3>
            
            <form onSubmit={editingTag ? updateTag : addTag}>
              <div className="form-group">
                <label>Nome da Tag</label>
                <input
                  type="text"
                  value={editingTag ? editingTag.name : newTag.name}
                  onChange={(e) => 
                    editingTag 
                      ? setEditingTag({...editingTag, name: e.target.value})
                      : setNewTag({...newTag, name: e.target.value})
                  }
                  placeholder="Ex: Viagem, Educação, etc."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Cor</label>
                <div className="color-picker">
                  {predefinedColors.map((color, index) => (
                    <div 
                      key={index}
                      className={`color-option ${
                        (editingTag && editingTag.color === color) || 
                        (!editingTag && newTag.color === color) 
                          ? 'selected' 
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => 
                        editingTag 
                          ? setEditingTag({...editingTag, color})
                          : setNewTag({...newTag, color})
                      }
                    ></div>
                  ))}
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="save-button"
                >
                  {editingTag ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManager;
