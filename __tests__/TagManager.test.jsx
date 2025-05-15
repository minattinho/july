import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TagManager from "../src/components/TagManager";

// Mock do Firebase
jest.mock("../src/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => {
  return {
    collection: jest.fn(),
    addDoc: jest.fn().mockResolvedValue({ id: "new-tag-id" }),
    updateDoc: jest.fn().mockResolvedValue({}),
    deleteDoc: jest.fn().mockResolvedValue({}),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn().mockResolvedValue({
      docs: [
        {
          id: "tag1",
          data: () => ({
            name: "Alimentação",
            color: "#6366F1",
            userId: "test-user-id",
          }),
        },
        {
          id: "tag2",
          data: () => ({
            name: "Transporte",
            color: "#10B981",
            userId: "test-user-id",
          }),
        },
        {
          id: "tag3",
          data: () => ({
            name: "Lazer",
            color: "#F97316",
            userId: "test-user-id",
          }),
        },
      ],
    }),
    doc: jest.fn().mockReturnValue({}),
  };
});

// Mock da função window.confirm
global.confirm = jest.fn().mockReturnValue(true);

describe("Componente TagManager", () => {
  const mockOnSelectTag = jest.fn();
  const userId = "test-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deve renderizar corretamente e buscar tags do usuário", async () => {
    render(<TagManager userId={userId} onSelectTag={mockOnSelectTag} />);

    // Inicialmente deve mostrar o estado de carregamento
    expect(screen.getByText("Carregando...")).toBeInTheDocument();

    // Depois do carregamento deve mostrar as tags
    await waitFor(() => {
      expect(screen.getByText("Alimentação")).toBeInTheDocument();
      expect(screen.getByText("Transporte")).toBeInTheDocument();
      expect(screen.getByText("Lazer")).toBeInTheDocument();
    });
  });

  test("deve abrir modal para adicionar nova tag", async () => {
    render(<TagManager userId={userId} onSelectTag={mockOnSelectTag} />);

    // Esperar carregamento das tags
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Clicar no botão para adicionar nova tag
    fireEvent.click(screen.getByText("+ Nova Tag"));

    // Verificar se o modal foi aberto
    expect(screen.getByText("Nova Tag")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Ex: Viagem, Educação, etc.")
    ).toBeInTheDocument();
  });

  test("deve adicionar uma nova tag", async () => {
    const { addDoc } = require("firebase/firestore");

    render(<TagManager userId={userId} onSelectTag={mockOnSelectTag} />);

    // Esperar carregamento das tags
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Abrir modal para adicionar nova tag
    fireEvent.click(screen.getByText("+ Nova Tag"));

    // Preencher formulário
    fireEvent.change(
      screen.getByPlaceholderText("Ex: Viagem, Educação, etc."),
      { target: { value: "Viagem" } }
    );

    // Submeter o formulário
    fireEvent.click(screen.getByText("Salvar"));

    // Verificar se a função addDoc foi chamada com os parâmetros corretos
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
      const call = addDoc.mock.calls[0];
      expect(call[1]).toMatchObject({
        userId: "test-user-id",
        name: "Viagem",
        color: expect.any(String),
      });
    });
  });

  test("deve iniciar edição de uma tag existente", async () => {
    render(<TagManager userId={userId} onSelectTag={mockOnSelectTag} />);

    // Esperar carregamento das tags
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Encontrar todos os botões de edição e clicar no primeiro
    const editButtons = screen.getAllByText("✏️");
    fireEvent.click(editButtons[0]);

    // Verificar se o modal de edição foi aberto
    expect(screen.getByText("Editar Tag")).toBeInTheDocument();

    // O input deve conter o nome da tag sendo editada
    const input = screen.getByPlaceholderText("Ex: Viagem, Educação, etc.");
    expect(input.value).toBe("Alimentação");
  });

  test("deve atualizar uma tag existente", async () => {
    const { updateDoc } = require("firebase/firestore");

    render(<TagManager userId={userId} onSelectTag={mockOnSelectTag} />);

    // Esperar carregamento das tags
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Encontrar todos os botões de edição e clicar no primeiro
    const editButtons = screen.getAllByText("✏️");
    fireEvent.click(editButtons[0]);

    // Modificar o nome da tag
    const input = screen.getByPlaceholderText("Ex: Viagem, Educação, etc.");
    fireEvent.change(input, { target: { value: "Refeições" } });

    // Salvar alterações
    fireEvent.click(screen.getByText("Atualizar"));

    // Verificar se a função updateDoc foi chamada
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
      const call = updateDoc.mock.calls[0];
      expect(call[1]).toMatchObject({
        name: "Refeições",
        color: expect.any(String),
        updatedAt: expect.any(Date),
      });
    });
  });

  test("deve excluir uma tag existente", async () => {
    const { deleteDoc } = require("firebase/firestore");

    render(<TagManager userId={userId} onSelectTag={mockOnSelectTag} />);

    // Esperar carregamento das tags
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Encontrar todos os botões de exclusão e clicar no primeiro
    const deleteButtons = screen.getAllByText("🗑️");
    fireEvent.click(deleteButtons[0]);

    // Verificar se a função confirm foi chamada
    expect(confirm).toHaveBeenCalledWith(
      "Tem certeza que deseja excluir esta tag?"
    );

    // Verificar se a função deleteDoc foi chamada
    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  test("deve selecionar uma tag quando clicada", async () => {
    render(<TagManager userId={userId} onSelectTag={mockOnSelectTag} />);

    // Esperar carregamento das tags
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Clicar em uma tag
    fireEvent.click(screen.getByText("Alimentação"));

    // Verificar se a função onSelectTag foi chamada com a tag correta
    expect(mockOnSelectTag).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "tag1",
        name: "Alimentação",
      })
    );
  });

  test("deve mostrar mensagem quando não há tags", async () => {
    const { getDocs } = require("firebase/firestore");

    // Simular retorno vazio
    getDocs.mockResolvedValueOnce({
      docs: [],
    });

    render(<TagManager userId={userId} onSelectTag={mockOnSelectTag} />);

    // Inicialmente deve mostrar o estado de carregamento
    expect(screen.getByText("Carregando...")).toBeInTheDocument();

    // Após o carregamento deve mostrar a mensagem de nenhuma tag
    await waitFor(() => {
      expect(
        screen.getByText("Você ainda não criou nenhuma tag.")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Tags ajudam a categorizar suas transações de forma personalizada."
        )
      ).toBeInTheDocument();
    });
  });
});
