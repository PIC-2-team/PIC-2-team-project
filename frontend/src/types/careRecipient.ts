export type CareRecipient = {
  id: number;
  name: string;
  careRecipientNumber?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  disabilityTypes?: string[];
  disabilityGrade?: number | null;
  otherDisabilityType?: string | null;
  latestRecordAt?: string | null;
  createdAt?: string;
};

