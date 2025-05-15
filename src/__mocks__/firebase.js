// Mock para o Firebase
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  addDoc: jest.fn().mockResolvedValue({ id: "mock-doc-id" }),
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
  query: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
};

const mockTimestamp = {
  now: jest.fn().mockReturnValue({ seconds: 1234567890, nanoseconds: 0 }),
};

const mockAuth = {
  currentUser: { uid: "test-user-id" },
};

export const db = mockFirestore;
export const auth = mockAuth;
export const collection = mockFirestore.collection;
export const addDoc = mockFirestore.addDoc;
export const query = mockFirestore.query;
export const where = mockFirestore.where;
export const getDocs = mockFirestore.getDocs;
export const Timestamp = mockTimestamp;

export default { db, auth };
