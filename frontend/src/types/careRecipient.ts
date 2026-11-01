export type CareRecipient = {
  id: number;
  name: string;
  careRecipientNumber?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  disabilityTypes?: string[];
  disabilityGrade?: number | null;
  disabilitySeverity?: 'SEVERE' | 'LESS_SEVERE' | null;
  otherDisabilityType?: string | null;
  latestRecordAt?: string | null;
  createdAt?: string;
  guardianName?: string;
  guardianPhone?: string;
  emergencyContactPhone?: string;
  doctorHospital?: string;
  medicationInfo?: string;
  allergyNotes?: string;
};

