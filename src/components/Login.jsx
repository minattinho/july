import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('Erro de autenticação:', error);
      setError(
        error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password'
          ? 'Email ou senha inválidos'
          : error.code === 'auth/email-already-in-use'
          ? 'Este email já está em uso'
          : 'Ocorreu um erro. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        </div>
        
        <h1 style={{ color: '#326E37', fontSize: '2.5rem', marginBottom: '0.5rem' }}>July</h1>
        <h1 className="welcome-title">Bem-vindo!</h1>
        
        <div className="form-container">
          <p className="info-text">Entre com suas credenciais:</p>
          
          <form onSubmit={handleSubmit}>
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <label className="input-label">Senha</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="password-help">A senha deve ter pelo menos 6 caracteres</p>
            
            {error && <p className="error-message">{error}</p>}
            
            <button 
              type="submit" 
              className="enter-button"
              disabled={loading}
            >
              {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
          
          {isLogin && (
            <a href="#" className="alt-login" onClick={(e) => {
              e.preventDefault();
              // Implementar recuperação de senha
            }}>
              Esqueci minha senha
            </a>
          )}
          
          <div className="divider"></div>
          
          <a 
            href="#" 
            className="create-account-link"
            onClick={(e) => {
              e.preventDefault();
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            {isLogin ? 'Criar nova conta' : 'Já tenho uma conta'}
          </a>
        </div>
      </div>
      
      <div className="banner">
        <h1>Seu organizador financeiro</h1>
        <p>
          Gerencie suas finanças pessoais com facilidade e inteligência. 
          O July ajuda você a controlar gastos, criar orçamentos, 
          acompanhar investimentos e alcançar suas metas financeiras 
          de forma simples e eficaz.
        </p>
      </div>
    </div>
  );
}