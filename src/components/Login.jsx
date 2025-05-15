import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState('verificando');

  // Verificar estado de autenticação ao carregar o componente
  useEffect(() => {
    console.log('Login componente montado, verificando autenticação...');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Usuário já autenticado:', user.uid);
        setAuthState('autenticado');
      } else {
        console.log('Nenhum usuário autenticado');
        setAuthState('não-autenticado');
      }
    }, (error) => {
      console.error('Erro ao verificar estado de autenticação:', error);
      setAuthState('erro');
      setError('Erro ao verificar autenticação: ' + error.message);
    });

    return () => unsubscribe();
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log(`Tentando ${isLogin ? 'login' : 'cadastro'} com email: ${email}`);
      
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login realizado com sucesso:', userCredential.user.uid);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Usuário criado com sucesso:', userCredential.user.uid);
      }
    } catch (error) {
      console.error('Erro de autenticação:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);
      
      // Tratamento de erro mais detalhado
      switch(error.code) {
        case 'auth/user-not-found':
          setError('Usuário não encontrado. Verifique seu email.');
          break;
        case 'auth/wrong-password':
          setError('Senha incorreta. Tente novamente.');
          break;
        case 'auth/email-already-in-use':
          setError('Este email já está em uso.');
          break;
        case 'auth/invalid-credential':
          setError('Credenciais inválidas. Verifique seu email e senha.');
          break;
        case 'auth/network-request-failed':
          setError('Falha na conexão de rede. Verifique sua internet.');
          break;
        default:
          setError(`Erro: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Se ainda estiver verificando a autenticação
  if (authState === 'verificando') {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="loading-spinner"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

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