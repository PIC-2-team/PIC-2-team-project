export type DisabilitySeverity = 'SEVERE' | 'NOT_SEVERE';

export const DISABILITY_SEVERITY_LABELS: Record<DisabilitySeverity, string> = {
  SEVERE: '심한 장애',
  NOT_SEVERE: '심하지 않은 장애',
};

export type CareRecipient = {
  id: number;
  name: string;
  careRecipientNumber?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  disabilityTypes?: string[];
  disabilitySeverity?: DisabilitySeverity | null;
  otherDisabilityType?: string | null;
  latestRecordAt?: string | null;
  createdAt?: string;
  guardianName?: string;
  guardianPhone?: string;
};

