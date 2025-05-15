import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Goals from "../src/components/Goals";

// Mock do Firebase
jest.mock("../src/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => {
  return {
    collection: jest.fn(),
    addDoc: jest.fn().mockResolvedValue({ id: "new-goal-id" }),
    updateDoc: jest.fn().mockResolvedValue({}),
    deleteDoc: jest.fn().mockResolvedValue({}),
    doc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "goal1",
          data: () => ({
            userId: "test-user-id",
            title: "Comprar um carro",
            targetAmount: 50000,
            currentAmount: 15000,
            targetDate: new Date("2023-12-31").toISOString(),
            category: "purchase",
            color: "#FF9800",
            createdAt: new Date("2023-01-15").toISOString(),
            updatedAt: new Date("2023-06-10").toISOString(),
          }),
        },
        {
          id: "goal2",
          data: () => ({
            userId: "test-user-id",
            title: "Fundo de emergência",
            targetAmount: 10000,
            currentAmount: 7500,
            targetDate: new Date("2023-10-15").toISOString(),
            category: "emergency",
            color: "#795548",
            createdAt: new Date("2023-02-20").toISOString(),
            updatedAt: new Date("2023-07-05").toISOString(),
          }),
        },
      ],
    }),
  };
});

// Mock da função window.confirm
global.confirm = jest.fn().mockReturnValue(true);

// Mock da função alert
global.alert = jest.fn();

describe("Componente Goals", () => {
  const userId = "test-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deve renderizar corretamente e mostrar metas do usuário", async () => {
    render(<Goals userId={userId} />);

    // Inicialmente deve mostrar o estado de carregamento
    expect(screen.getByText("Carregando metas...")).toBeInTheDocument();

    // Depois do carregamento deve mostrar as metas
    await waitFor(() => {
      expect(screen.getByText("Comprar um carro")).toBeInTheDocument();
      expect(screen.getByText("Fundo de emergência")).toBeInTheDocument();
    });
  });

  test("deve exibir o progresso correto das metas", async () => {
    render(<Goals userId={userId} />);

    await waitFor(() => {
      expect(screen.queryByText("Carregando metas...")).not.toBeInTheDocument();
    });

    // Verificar progresso da primeira meta (15000 / 50000 = 30%)
    expect(screen.getByText("30% completo")).toBeInTheDocument();

    // Verificar progresso da segunda meta (7500 / 10000 = 75%)
    expect(screen.getByText("75% completo")).toBeInTheDocument();
  });

  test("deve mostrar o formulário de adição de meta quando o botão é clicado", async () => {
    render(<Goals userId={userId} />);

    await waitFor(() => {
      expect(screen.queryByText("Carregando metas...")).not.toBeInTheDocument();
    });

    // Inicialmente o formulário não deve estar visível
    expect(screen.queryByText("Adicionar Nova Meta")).not.toBeInTheDocument();

    // Clicar no botão para adicionar nova meta
    fireEvent.click(screen.getByText("+ Nova Meta"));

    // Verificar se o formulário está visível
    expect(screen.getByText("Adicionar Nova Meta")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Ex: Comprar um carro")
    ).toBeInTheDocument();
  });

  test("deve adicionar uma nova meta quando o formulário for enviado", async () => {
    const { addDoc } = require("firebase/firestore");

    render(<Goals userId={userId} />);

    await waitFor(() => {
      expect(screen.queryByText("Carregando metas...")).not.toBeInTheDocument();
    });

    // Abrir formulário de adição de meta
    fireEvent.click(screen.getByText("+ Nova Meta"));

    // Preencher formulário
    fireEvent.change(screen.getByPlaceholderText("Ex: Comprar um carro"), {
      target: { value: "Viagem para Europa" },
    });

    fireEvent.change(screen.getAllByPlaceholderText("0.00")[0], {
      target: { value: "15000" },
    });

    fireEvent.change(screen.getAllByPlaceholderText("0.00")[1], {
      target: { value: "5000" },
    });

    // Data atual + 1 ano    const targetDate = new Date();    targetDate.setFullYear(targetDate.getFullYear() + 1);    const dateString = targetDate.toISOString().split("T")[0];        // Obter o terceiro input do formulário (1º: nome da meta, 2º e 3º: valores, 4º: data)    const inputs = screen.getAllByRole('textbox').concat(screen.getAllByRole('spinbutton'));    const dateInput = screen.getByDisplayValue('');        fireEvent.change(dateInput, {      target: { value: dateString },    });

    // Selecionar categoria    const selectElement = screen.getByRole('combobox');    fireEvent.change(selectElement, {      target: { value: "travel" },    });

    // Enviar formulário
    fireEvent.click(screen.getByText("Salvar Meta"));

    // Verificar se a função addDoc foi chamada
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
      const call = addDoc.mock.calls[0];
      expect(call[1]).toMatchObject({
        userId: "test-user-id",
        title: "Viagem para Europa",
        targetAmount: 15000,
        currentAmount: 5000,
        category: "travel",
      });
    });

    // Verificar se o formulário foi fechado
    expect(screen.queryByText("Adicionar Nova Meta")).not.toBeInTheDocument();
  });

  test("deve adicionar valor a uma meta existente", async () => {
    const { updateDoc } = require("firebase/firestore");

    render(<Goals userId={userId} />);

    await waitFor(() => {
      expect(screen.queryByText("Carregando metas...")).not.toBeInTheDocument();
    });

    // Obter inputs de adicionar valor - há um para cada meta
    const inputs = screen.getAllByPlaceholderText("Adicionar valor");
    const addButtons = screen.getAllByText("Adicionar");

    // Adicionar valor à primeira meta
    fireEvent.change(inputs[0], { target: { value: "5000" } });
    fireEvent.click(addButtons[0]);

    // Verificar se updateDoc foi chamado com os valores corretos
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
      const call = updateDoc.mock.calls[0];
      expect(call[1]).toMatchObject({
        currentAmount: 15000 + 5000, // valor original + novo valor
        updatedAt: expect.any(String),
      });
    });
  });

  test("deve mostrar alerta quando valor inválido é adicionado à meta", async () => {
    render(<Goals userId={userId} />);

    await waitFor(() => {
      expect(screen.queryByText("Carregando metas...")).not.toBeInTheDocument();
    });

    // Obter inputs de adicionar valor - há um para cada meta
    const inputs = screen.getAllByPlaceholderText("Adicionar valor");
    const addButtons = screen.getAllByText("Adicionar");

    // Tentar adicionar valor inválido à primeira meta
    fireEvent.change(inputs[0], { target: { value: "0" } });
    fireEvent.click(addButtons[0]);

    // Verificar se o alerta foi mostrado
    expect(alert).toHaveBeenCalledWith("Por favor, informe um valor válido");
  });

  test("deve remover uma meta quando o botão de exclusão é clicado", async () => {
    const { deleteDoc } = require("firebase/firestore");

    render(<Goals userId={userId} />);

    await waitFor(() => {
      expect(screen.queryByText("Carregando metas...")).not.toBeInTheDocument();
    });

    // Obter todos os botões de exclusão (×) e clicar no primeiro
    const removeButtons = screen.getAllByText("×");
    fireEvent.click(removeButtons[0]);

    // Verificar se a confirmação foi solicitada
    expect(confirm).toHaveBeenCalledWith(
      "Tem certeza que deseja excluir esta meta?"
    );

    // Verificar se deleteDoc foi chamado
    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  test("deve mostrar mensagem quando não há metas", async () => {
    const { getDocs } = require("firebase/firestore");

    // Simular retorno vazio
    getDocs.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    render(<Goals userId={userId} />);

    // Inicialmente deve mostrar o estado de carregamento
    expect(screen.getByText("Carregando metas...")).toBeInTheDocument();

    // Após o carregamento deve mostrar a mensagem de nenhuma meta
    await waitFor(() => {
      expect(
        screen.getByText("Você ainda não tem metas financeiras.")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Crie uma meta para acompanhar seu progresso em direção aos seus objetivos financeiros!"
        )
      ).toBeInTheDocument();
    });
  });
});
