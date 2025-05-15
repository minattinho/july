import { useState, useEffect } from 'react';
import { auth } from '../firebase'; // Corrigido
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import './Login.css';

// Resto do código permanece o mesmo

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Log para verificar se o Firebase Auth está inicializado corretamente
  useEffect(() => {
    console.log("Auth inicializado:", auth);
    console.log("Auth config:", auth.config);
    console.log("Auth app:", auth.app);
  }, []);

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    console.log("Iniciando processo de", isRegistering ? "cadastro" : "login");
    console.log("Email:", email);
    console.log("Senha: ***" + password.substr(-3)); // Mostra apenas o final da senha para depuração

    try {
      if (isRegistering) {
        // Criar nova conta
        console.log("Tentando criar usuário com createUserWithEmailAndPassword");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Usuário criado com sucesso:", userCredential.user.uid);
        setSuccessMessage('Conta criada com sucesso!');
      } else {
        // Login em conta existente
        console.log("Tentando fazer login com signInWithEmailAndPassword");
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login bem-sucedido:", userCredential.user.uid);
      }
    } catch (err) {
      console.error("ERRO DE AUTENTICAÇÃO:", err);
      console.error("Código do erro:", err.code);
      console.error("Mensagem do erro:", err.message);
      
      // Tratamento detalhado de erros
      switch(err.code) {
        case 'auth/email-already-in-use':
          setError('Este email já está sendo usado por outra conta.');
          break;
        case 'auth/invalid-email':
          setError('O formato do email é inválido.');
          break;
        case 'auth/weak-password':
          setError('A senha é muito fraca. Use pelo menos 6 caracteres.');
          break;
        case 'auth/user-not-found':
          setError('Não existe usuário com este email.');
          break;
        case 'auth/wrong-password':
          setError('Senha incorreta.');
          break;
        case 'auth/network-request-failed':
          setError('Erro de conexão. Verifique sua internet.');
          break;
        case 'auth/too-many-requests':
          setError('Muitas tentativas. Tente novamente mais tarde.');
          break;
        case 'auth/api-key-not-valid':
        case 'auth/invalid-api-key':
          setError('Erro de configuração do Firebase. Chave API inválida.');
          break;
        default:
          setError(`Erro: ${err.code} - ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Digite seu email para recuperar a senha.');
      return;
    }

    resetMessages();
    setLoading(true);

    try {
      console.log("Tentando enviar email de recuperação para:", email);
      await sendPasswordResetEmail(auth, email);
      console.log("Email de recuperação enviado com sucesso");
      setSuccessMessage('Email de recuperação enviado. Verifique sua caixa de entrada.');
    } catch (err) {
      console.error("Erro ao recuperar senha:", err);
      setError(`Erro ao recuperar senha: ${err.code} - ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    resetMessages();
    setIsRegistering(!isRegistering);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Organizador Financeiro</h1>
          <h2>{isRegistering ? 'Criar Conta' : 'Entrar'}</h2>
        </div>

        {error && <div className="alert error">{error}</div>}
        {successMessage && <div className="alert success">{successMessage}</div>}

        <form onSubmit={handleAuth} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Sua senha"
              minLength="6"
            />
            <small className="password-hint">A senha deve ter pelo menos 6 caracteres</small>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading 
              ? 'Carregando...' 
              : isRegistering 
                ? 'Cadastrar' 
                : 'Entrar'
            }
          </button>
        </form>

        {!isRegistering && (
          <button 
            className="forgot-password" 
            onClick={handleForgotPassword}
            disabled={loading}
          >
            Esqueci minha senha
          </button>
        )}

        <div className="toggle-mode">
          <button onClick={toggleMode} disabled={loading}>
            {isRegistering 
              ? 'Já tenho uma conta' 
              : 'Criar nova conta'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;