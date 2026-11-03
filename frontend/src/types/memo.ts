export type Memo = {
  id: number;
  careRecipientId: number;
  createdById: number;
  date: string; // YYYY-MM-DD
  content: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
};

export type CreateMemoPayload = {
  content: string;
};

export type UpdateMemoPayload = {
  content: string;
};
