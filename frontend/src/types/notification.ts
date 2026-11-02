export type NotificationType =
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'ASSIGNMENT_CHANGED'
  | 'RECORD_FORWARDED'
  | 'ORGANIZATION_LINK_REQUESTED';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}
