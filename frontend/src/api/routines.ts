import type { Routine, RoutinePayload } from '../types/routine';
import { apiRequest } from './client';

export function listRoutines(recipientId: number): Promise<Routine[]> {
  return apiRequest(`/api/care-recipients/${recipientId}/routines`);
}

export function createRoutine(recipientId: number, payload: RoutinePayload): Promise<Routine> {
  return apiRequest(`/api/care-recipients/${recipientId}/routines`, { method: 'POST', body: payload });
}

export function updateRoutine(recipientId: number, routineId: number, payload: RoutinePayload): Promise<Routine> {
  return apiRequest(`/api/care-recipients/${recipientId}/routines/${routineId}`, { method: 'PUT', body: payload });
}

export function deleteRoutine(recipientId: number, routineId: number): Promise<void> {
  return apiRequest(`/api/care-recipients/${recipientId}/routines/${routineId}`, { method: 'DELETE' });
}
