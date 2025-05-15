// Mock das funções de autenticação do Firebase
export const mockUser = {
  uid: "test-user-123",
  email: "teste@example.com",
  displayName: "Usuário Teste",
};

export const signInWithEmailAndPassword = jest
  .fn()
  .mockImplementation((auth, email, password) => {
    return new Promise((resolve, reject) => {
      if (email === "teste@example.com" && password === "senha123") {
        resolve({ user: mockUser });
      } else if (email === "erro@example.com") {
        reject({
          code: "auth/user-not-found",
          message: "Usuário não encontrado",
        });
      } else if (password === "senhaerrada") {
        reject({ code: "auth/wrong-password", message: "Senha incorreta" });
      } else if (email === "rede@example.com") {
        reject({
          code: "auth/network-request-failed",
          message: "Falha na conexão de rede",
        });
      } else {
        reject({
          code: "auth/invalid-credential",
          message: "Credenciais inválidas",
        });
      }
    });
  });

export const createUserWithEmailAndPassword = jest
  .fn()
  .mockImplementation((auth, email, password) => {
    return new Promise((resolve, reject) => {
      if (email === "novo@example.com") {
        resolve({ user: { ...mockUser, email, uid: "new-user-456" } });
      } else if (email === "existente@example.com") {
        reject({
          code: "auth/email-already-in-use",
          message: "Email já está em uso",
        });
      } else {
        resolve({ user: { ...mockUser, email, uid: "new-user-789" } });
      }
    });
  });

export const onAuthStateChanged = jest
  .fn()
  .mockImplementation((auth, onSuccess, onError) => {
    // Simular autenticação bem-sucedida por padrão
    setTimeout(() => onSuccess(mockUser), 100);

    // Retornar função de cancelamento
    return jest.fn();
  });
