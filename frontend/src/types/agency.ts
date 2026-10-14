// TODO: 기관 관련 API endpoint 전체 미정 (API-Spec.md §후속 화면 흐름)
export type ProviderAssignment = {
  id: number;
  providerId: number;
  recipientId: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
};
