import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "../src/components/Login";

// Mock das funções de autenticação do Firebase
jest.mock("firebase/auth", () => {
  const authMock = require("../__mocks__/authMock");
  return {
    signInWithEmailAndPassword: authMock.signInWithEmailAndPassword,
    createUserWithEmailAndPassword: authMock.createUserWithEmailAndPassword,
    onAuthStateChanged: authMock.onAuthStateChanged,
  };
});

// Mock do objeto auth do Firebasejest.mock("../src/firebase", () => ({  auth: {},}));

describe("Componente Login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deve renderizar o componente de login corretamente", async () => {
    render(<Login />);

    // Aguardar a verificação de autenticação
    await waitFor(() => {
      expect(
        screen.queryByText("Verificando autenticação...")
      ).not.toBeInTheDocument();
    });

    // Verificar se os elementos do formulário estão presentes
    expect(screen.getByText("Bem-vindo!")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  test("deve alternar entre login e cadastro", async () => {
    render(<Login />);

    // Aguardar a verificação de autenticação
    await waitFor(() => {
      expect(
        screen.queryByText("Verificando autenticação...")
      ).not.toBeInTheDocument();
    });

    // Verificar se começa com o modo de login
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();

    // Clicar no link para criar conta
    fireEvent.click(screen.getByText("Criar nova conta"));

    // Verificar se mudou para o modo de cadastro
    expect(
      screen.getByRole("button", { name: /criar conta/i })
    ).toBeInTheDocument();

    // Voltar para o modo de login
    fireEvent.click(screen.getByText("Já tenho uma conta"));

    // Verificar se voltou para o modo de login
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  test("deve realizar login com sucesso", async () => {
    const { signInWithEmailAndPassword } = require("firebase/auth");

    render(<Login />);

    // Aguardar a verificação de autenticação
    await waitFor(() => {
      expect(
        screen.queryByText("Verificando autenticação...")
      ).not.toBeInTheDocument();
    });

    // Preencher o formulário de login
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "teste@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha123" },
    });

    // Submeter o formulário
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    // Verificar se a função de login foi chamada com os parâmetros corretos
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "teste@example.com",
        "senha123"
      );
    });

    // Não deve exibir mensagens de erro
    expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
  });

  test("deve exibir erro quando o usuário não é encontrado", async () => {
    render(<Login />);

    // Aguardar a verificação de autenticação
    await waitFor(() => {
      expect(
        screen.queryByText("Verificando autenticação...")
      ).not.toBeInTheDocument();
    });

    // Preencher o formulário com email não existente
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "erro@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "qualquersenha" },
    });

    // Submeter o formulário
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    // Verificar se a mensagem de erro é exibida
    await waitFor(() => {
      expect(
        screen.getByText("Usuário não encontrado. Verifique seu email.")
      ).toBeInTheDocument();
    });
  });

  test("deve exibir erro quando a senha está incorreta", async () => {
    render(<Login />);

    // Aguardar a verificação de autenticação
    await waitFor(() => {
      expect(
        screen.queryByText("Verificando autenticação...")
      ).not.toBeInTheDocument();
    });

    // Preencher o formulário com senha incorreta
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "qualquer@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senhaerrada" },
    });

    // Submeter o formulário
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    // Verificar se a mensagem de erro é exibida
    await waitFor(() => {
      expect(
        screen.getByText("Senha incorreta. Tente novamente.")
      ).toBeInTheDocument();
    });
  });

  test("deve realizar cadastro com sucesso", async () => {
    const { createUserWithEmailAndPassword } = require("firebase/auth");

    render(<Login />);

    // Aguardar a verificação de autenticação
    await waitFor(() => {
      expect(
        screen.queryByText("Verificando autenticação...")
      ).not.toBeInTheDocument();
    });

    // Mudar para o modo de cadastro
    fireEvent.click(screen.getByText("Criar nova conta"));

    // Preencher o formulário de cadastro
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "novo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha123" },
    });

    // Submeter o formulário
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    // Verificar se a função de cadastro foi chamada com os parâmetros corretos
    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "novo@example.com",
        "senha123"
      );
    });

    // Não deve exibir mensagens de erro
    expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
  });

  test("deve exibir erro quando o email já está em uso", async () => {
    render(<Login />);

    // Aguardar a verificação de autenticação
    await waitFor(() => {
      expect(
        screen.queryByText("Verificando autenticação...")
      ).not.toBeInTheDocument();
    });

    // Mudar para o modo de cadastro
    fireEvent.click(screen.getByText("Criar nova conta"));

    // Preencher o formulário com email já existente
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "existente@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha123" },
    });

    // Submeter o formulário
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    // Verificar se a mensagem de erro é exibida
    await waitFor(() => {
      expect(
        screen.getByText("Este email já está em uso.")
      ).toBeInTheDocument();
    });
  });
});
