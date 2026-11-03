export type Routine = {
  id: number;
  careRecipientId: number;
  time: string; // HH:mm
  title: string;
  memo: string | null;
};

export type RoutinePayload = {
  time: string;
  title: string;
  memo: string | null;
};
