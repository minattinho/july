import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TransactionTags from "../src/components/TransactionTags";

describe("Componente TransactionTags", () => {
  test("deve renderizar corretamente quando tags estão presentes", () => {
    const tags = [
      { id: "1", name: "Comida", color: "#FF5733" },
      { id: "2", name: "Lazer", color: "#33FF57" },
      { id: "3", name: "Transporte", color: "#3357FF" },
    ];

    render(<TransactionTags tags={tags} />);

    // Verificar se cada tag é renderizada
    tags.forEach((tag) => {
      expect(screen.getByText(tag.name)).toBeInTheDocument();
    });
  });

  test("não deve renderizar quando tags é null", () => {
    render(<TransactionTags tags={null} />);

    // O componente deve retornar null, então não deve haver elementos renderizados
    expect(screen.queryByTestId("transaction-tags")).not.toBeInTheDocument();
  });

  test("não deve renderizar quando tags é um array vazio", () => {
    render(<TransactionTags tags={[]} />);

    // O componente deve retornar null, então não deve haver elementos renderizados
    expect(screen.queryByTestId("transaction-tags")).not.toBeInTheDocument();
  });
});
