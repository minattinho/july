import {
  createNotification,
  checkSpendingLimit,
  checkGoalDeadlines,
  checkRecurringTransactions,
} from "../src/utils/notificationSystem";

// Mock para o módulo Firebase
jest.mock("../src/firebase", () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
  },
  collection: jest.fn().mockReturnThis(),
  addDoc: jest.fn().mockResolvedValue({ id: "mock-doc-id" }),
  query: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getDocs: jest.fn().mockResolvedValue({
    empty: false,
    docs: [
      {
        id: "mock-doc-id",
        data: () => ({
          userId: "test-user-id",
          budgetAlerts: true,
          goalAlerts: true,
          transactionReminders: true,
          spendingLimitAmount: 1000,
        }),
      },
    ],
  }),
  Timestamp: {
    now: jest.fn().mockReturnValue({ seconds: 1234567890, nanoseconds: 0 }),
  },
}));

// Mock de console.error para evitar poluição nos logs de teste
global.console.error = jest.fn();

describe("Sistema de Notificações", () => {
  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe("createNotification", () => {
    test("deve criar uma notificação com sucesso", async () => {
      const result = await createNotification(
        "test-user-id",
        "test-type",
        "Mensagem de teste",
        { testData: "data" }
      );

      expect(result).toBe(true);
    });

    test("deve retornar false quando ocorrer um erro", async () => {
      // Mock para simular falha
      const { addDoc } = require("../src/firebase");
      addDoc.mockRejectedValueOnce(new Error("Erro de teste"));

      const result = await createNotification(
        "test-user-id",
        "test-type",
        "Mensagem de teste"
      );

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("checkSpendingLimit", () => {
    test("não deve criar notificação para receitas (valores positivos)", async () => {
      const transaction = {
        id: "trans1",
        amount: 100, // Valor positivo (receita)
        description: "Receita de teste",
      };

      await checkSpendingLimit("test-user-id", transaction);

      const { addDoc } = require("../src/firebase");
      expect(addDoc).not.toHaveBeenCalled();
    });

    test("deve criar notificação quando gasto excede limite", async () => {
      const transaction = {
        id: "trans2",
        amount: -1500, // Valor negativo (despesa) acima do limite
        description: "Despesa de teste",
      };

      await checkSpendingLimit("test-user-id", transaction);

      const { addDoc } = require("../src/firebase");
      expect(addDoc).toHaveBeenCalled();
    });

    test("não deve criar notificação quando gasto não excede limite", async () => {
      const transaction = {
        id: "trans3",
        amount: -500, // Valor negativo (despesa) abaixo do limite
        description: "Despesa pequena",
      };

      await checkSpendingLimit("test-user-id", transaction);

      const { addDoc } = require("../src/firebase");
      expect(addDoc).not.toHaveBeenCalled();
    });
  });

  describe("checkGoalDeadlines", () => {
    test("deve criar notificação para metas próximas do prazo", async () => {
      // Mock para simular busca de metas
      const { getDocs } = require("../src/firebase");

      // Uma meta que está próxima do prazo
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + 5); // 5 dias a partir de hoje

      getDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: "goal1",
              data: () => ({
                userId: "test-user-id",
                budgetAlerts: true,
                goalAlerts: true,
                spendingLimitAmount: 1000,
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: "goal1",
              data: () => ({
                userId: "test-user-id",
                title: "Meta de teste",
                targetDate: targetDate.toISOString(),
                currentAmount: 500,
                targetAmount: 1000,
              }),
            },
          ],
        });

      await checkGoalDeadlines("test-user-id");

      const { addDoc } = require("../src/firebase");
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe("checkRecurringTransactions", () => {
    test("deve criar notificação para parcelas próximas do vencimento", async () => {
      // Mock para simular busca de configurações e transações
      const { getDocs } = require("../src/firebase");

      // Data de hoje e próxima parcela em 2 dias
      const today = new Date();
      const installmentDate = new Date(today);
      installmentDate.setDate(today.getDate() + 2);

      getDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: "settings1",
              data: () => ({
                userId: "test-user-id",
                transactionReminders: true,
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: "transaction1",
              data: () => ({
                userId: "test-user-id",
                isInstallment: true,
                groupId: "group1",
                installmentNumber: 2,
                totalInstallments: 12,
                description: "Compra parcelada",
                date: installmentDate.toISOString(),
                amount: -100,
              }),
            },
          ],
        });

      await checkRecurringTransactions("test-user-id");

      const { addDoc } = require("../src/firebase");
      expect(addDoc).toHaveBeenCalled();
    });
  });
});
