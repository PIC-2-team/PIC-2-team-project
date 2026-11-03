import type { User, WithdrawalDecision, WithdrawalPreview } from '../types/user';
import { apiRequest } from './client';

export function getMe(): Promise<User> {
  return apiRequest('/api/users/me');
}

export function getWithdrawalPreview(): Promise<WithdrawalPreview> {
  return apiRequest('/api/users/me/withdrawal-preview');
}

export function withdrawAccount(decisions: WithdrawalDecision[]): Promise<void> {
  return apiRequest('/api/users/me', { method: 'DELETE', body: { decisions } });
}
