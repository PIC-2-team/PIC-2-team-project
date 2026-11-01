export type Schedule = {
  id: number;
  careRecipientId: number;
  createdById: number;
  title: string;
  description?: string | null;
  scheduledAt: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
};

export type CreateSchedulePayload = {
  title: string;
  description?: string;
  scheduledAt: string;
};

export type UpdateSchedulePayload = {
  title?: string;
  description?: string;
  scheduledAt?: string;
};
