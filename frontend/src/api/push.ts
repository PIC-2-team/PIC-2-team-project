import { apiRequest } from './client';

export function getVapidPublicKey(): Promise<{ publicKey: string }> {
  return apiRequest('/api/push/vapid-public-key', { method: 'GET' });
}

export function saveSubscription(body: { endpoint: string; p256dh: string; auth: string }): Promise<void> {
  return apiRequest('/api/push/subscribe', { method: 'POST', body });
}
