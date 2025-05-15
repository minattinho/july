import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import LoadingScreen from "../src/components/LoadingScreen";

describe("Componente LoadingScreen", () => {
  beforeEach(() => {
    // Mock da função window.location.reload
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { reload: jest.fn() },
    });
  });

  afterEach(() => {
    // Restaurar o mock
    jest.restoreAllMocks();
  });

  test("deve renderizar corretamente no estado de carregamento", () => {
    render(<LoadingScreen />);

    // Verificar se o spinner de carregamento está presente
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    // Verificar se a mensagem padrão é exibida
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  test("deve renderizar mensagem personalizada de carregamento", () => {
    const mensagemPersonalizada = "Processando dados...";
    render(<LoadingScreen message={mensagemPersonalizada} />);

    expect(screen.getByText(mensagemPersonalizada)).toBeInTheDocument();
  });

  test("deve renderizar corretamente no estado de erro", () => {
    const mensagemErro = "Falha ao conectar com o servidor";
    render(<LoadingScreen error={mensagemErro} />);

    // Verificar se não exibe o spinner de carregamento
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();

    // Verificar se exibe a mensagem de erro
    expect(screen.getByText(mensagemErro)).toBeInTheDocument();
    expect(screen.getByText("Erro")).toBeInTheDocument();
    expect(screen.getByText("Tente recarregar a página")).toBeInTheDocument();
  });

  test("deve chamar window.location.reload quando o botão de recarregar é clicado", () => {
    render(<LoadingScreen error="Erro de teste" />);

    // Clicar no botão de recarregar
    fireEvent.click(screen.getByText("Recarregar"));

    // Verificar se a função window.location.reload foi chamada
    expect(window.location.reload).toHaveBeenCalled();
  });
});
