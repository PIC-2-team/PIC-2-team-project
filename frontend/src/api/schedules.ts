import type { Schedule, CreateSchedulePayload, UpdateSchedulePayload } from '../types/schedule';
import { apiRequest } from './client';

export function getSchedulesByMonth(
  recipientId: number,
  year: number,
  month: number,
): Promise<Schedule[]> {
  return apiRequest(`/api/care-recipients/${recipientId}/schedules?year=${year}&month=${month}`);
}

export function createSchedule(
  recipientId: number,
  payload: CreateSchedulePayload,
): Promise<Schedule> {
  return apiRequest(`/api/care-recipients/${recipientId}/schedules`, {
    method: 'POST',
    body: payload,
  });
}

export function updateSchedule(
  recipientId: number,
  scheduleId: number,
  payload: UpdateSchedulePayload,
): Promise<Schedule> {
  return apiRequest(`/api/care-recipients/${recipientId}/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteSchedule(recipientId: number, scheduleId: number): Promise<void> {
  return apiRequest(`/api/care-recipients/${recipientId}/schedules/${scheduleId}`, {
    method: 'DELETE',
  });
}
