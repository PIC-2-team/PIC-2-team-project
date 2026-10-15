import type { User } from '../types/user';
import { apiRequest } from './client';

export function getMe(): Promise<User> {
  return apiRequest('/api/users/me');
}
