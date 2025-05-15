import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Transaction from "../src/components/Transaction";

// Mock para o componente TransactionTags
jest.mock("../src/components/TransactionTags", () => {
  return function MockTransactionTags({ tags }) {
    if (!tags || tags.length === 0) return null;
    return (
      <div data-testid="transaction-tags">
        {tags.map((tag) => (
          <span key={tag.id}>{tag.name}</span>
        ))}
      </div>
    );
  };
});

describe("Componente Transaction", () => {
  const mockOnDelete = jest.fn();

  const paymentMethods = [
    { id: "pm1", name: "Cartão de Crédito" },
    { id: "pm2", name: "Dinheiro" },
  ];

  const categories = [
    { id: "cat1", name: "Alimentação" },
    { id: "cat2", name: "Transporte" },
  ];

  const transaction = {
    id: "1",
    date: "2023-07-15",
    description: "Supermercado",
    category: "cat1",
    paymentMethod: "pm1",
    tags: [
      { id: "tag1", name: "Essencial", color: "#FF5733" },
      { id: "tag2", name: "Mensal", color: "#33FF57" },
    ],
    amount: -150.75,
  };

  beforeEach(() => {
    mockOnDelete.mockClear();
  });

  test("deve renderizar corretamente uma transação de despesa", () => {
    // Mock da função formatDate para retornar uma data consistente
    const originalDate = global.Date;
    global.Date = class extends Date {
      toLocaleDateString() {
        return "15/07/2023";
      }
    };

    render(
      <table>
        <tbody>
          <Transaction
            transaction={transaction}
            onDelete={mockOnDelete}
            paymentMethods={paymentMethods}
            categories={categories}
          />
        </tbody>
      </table>
    );

    // Restaurar a função Date original após o teste
    global.Date = originalDate;

    // Verificar se os dados da transação são exibidos corretamente
    expect(screen.getByText("15/07/2023")).toBeInTheDocument();
    expect(screen.getByText("Supermercado")).toBeInTheDocument();
    expect(screen.getByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText("Cartão de Crédito")).toBeInTheDocument();

    // Verificar formato do valor negativo
    const amountElement = screen.getByText(/-R\$ 150,75/i);
    expect(amountElement).toBeInTheDocument();
    expect(amountElement).toHaveClass("negative");
  });

  test("deve renderizar corretamente uma transação de receita", () => {
    const receiptTransaction = {
      ...transaction,
      amount: 250.5,
      description: "Salário",
    };

    render(
      <table>
        <tbody>
          <Transaction
            transaction={receiptTransaction}
            onDelete={mockOnDelete}
            paymentMethods={paymentMethods}
            categories={categories}
          />
        </tbody>
      </table>
    );

    // Verificar formato do valor positivo
    const amountElement = screen.getByText(/R\$ 250,50/i);
    expect(amountElement).toBeInTheDocument();
    expect(amountElement).toHaveClass("positive");
  });

  test("deve chamar onDelete quando o botão de excluir é clicado", () => {
    render(
      <table>
        <tbody>
          <Transaction
            transaction={transaction}
            onDelete={mockOnDelete}
            paymentMethods={paymentMethods}
            categories={categories}
          />
        </tbody>
      </table>
    );

    // Clicar no botão de excluir
    fireEvent.click(screen.getByTitle("Excluir transação"));

    // Verificar se a função onDelete foi chamada com os parâmetros corretos
    expect(mockOnDelete).toHaveBeenCalledWith("1", undefined);
  });

  test('deve exibir "Não categorizado" quando a categoria não é encontrada', () => {
    const transactionWithInvalidCategory = {
      ...transaction,
      category: "cat-invalid",
    };

    render(
      <table>
        <tbody>
          <Transaction
            transaction={transactionWithInvalidCategory}
            onDelete={mockOnDelete}
            paymentMethods={paymentMethods}
            categories={categories}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText("Não categorizado")).toBeInTheDocument();
  });

  test('deve exibir "Não especificado" quando o método de pagamento não é encontrado', () => {
    const transactionWithInvalidPaymentMethod = {
      ...transaction,
      paymentMethod: "pm-invalid",
    };

    render(
      <table>
        <tbody>
          <Transaction
            transaction={transactionWithInvalidPaymentMethod}
            onDelete={mockOnDelete}
            paymentMethods={paymentMethods}
            categories={categories}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText("Não especificado")).toBeInTheDocument();
  });

  test("deve aplicar classe offline-transaction para transações offline", () => {
    const offlineTransaction = {
      ...transaction,
      id: "local_123",
    };

    render(
      <table>
        <tbody>
          <Transaction
            transaction={offlineTransaction}
            onDelete={mockOnDelete}
            paymentMethods={paymentMethods}
            categories={categories}
          />
        </tbody>
      </table>
    );

    // Primeiro tr deve ter a classe offline-transaction
    const trElement = screen.getByText("Supermercado").closest("tr");
    expect(trElement).toHaveClass("offline-transaction");
  });
});
