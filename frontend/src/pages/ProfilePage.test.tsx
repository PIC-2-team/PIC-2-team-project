import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import * as careApi from '../api/careRecipients';
import * as routinesApi from '../api/routines';
import type { CareRecipient } from '../types/careRecipient';
import type { Routine } from '../types/routine';

let mockRole = 'GUARDIAN';
let mockRecipientId = 42;
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: mockRecipientId, user: { id: 1, role: mockRole } }),
}));

const recipient: CareRecipient = {
  id: 42, name: '김삼결', birthDate: '2010-05-15', gender: 'MALE',
  disabilityTypes: ['AUTISM', 'OTHER'], otherDisabilityType: '뇌병변', disabilitySeverity: 'SEVERE',
  hospitalName: '삼결병원', doctorName: '김의사', hospitalPhone: '053-000-0000',
  supportCenterName: '행복센터', supportCenterManagerName: '박담당', supportCenterPhone: '053-111-1111',
};
const routines: Routine[] = [
  { id: 2, careRecipientId: 42, time: '19:00', title: '저녁 식사', memo: null },
  { id: 1, careRecipientId: 42, time: '07:30', title: '기상', memo: '천천히' },
];

beforeEach(() => {
  vi.spyOn(careApi, 'getCareRecipient').mockResolvedValue(recipient);
  vi.spyOn(routinesApi, 'listRoutines').mockResolvedValue(routines);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); mockRole = 'GUARDIAN'; mockRecipientId = 42; });

async function renderPage() {
  render(<MemoryRouter><ProfilePage /></MemoryRouter>);
  await screen.findByText('김삼결');
}

it('보호자에게 저장된 프로필과 시간순 루틴을 보여준다', async () => {
  await renderPage();
  expect(screen.getByLabelText('병원명')).toHaveValue('삼결병원');
  expect(screen.getByLabelText('센터 연락처')).toHaveValue('053-111-1111');
  expect(screen.getByRole('radio', { name: '심한 장애' })).toBeChecked();
  const items = screen.getAllByRole('listitem').map(li => li.textContent);
  expect(items[0]).toContain('07:30');
  expect(items[0]).toContain('기상');
  expect(items[1]).toContain('19:00');
});

it('프로필을 저장하면 기존 장애 유형 설명은 유지하고 비운 칸은 빈 문자열로 보낸다', async () => {
  const update = vi.spyOn(careApi, 'updateCareRecipient').mockResolvedValue(recipient);
  await renderPage();
  fireEvent.click(screen.getByRole('radio', { name: '심하지 않은 장애' }));
  fireEvent.change(screen.getByLabelText('병원명'), { target: { value: ' 새병원 ' } });
  fireEvent.change(screen.getByLabelText('주치의 이름'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }));

  await waitFor(() => expect(update).toHaveBeenCalledWith(42, {
    disabilitySeverity: 'NOT_SEVERE', otherDisabilityType: '뇌병변',
    hospitalName: '새병원', doctorName: '', hospitalPhone: '053-000-0000',
    supportCenterName: '행복센터', supportCenterManagerName: '박담당', supportCenterPhone: '053-111-1111',
  }));
  expect(await screen.findByText('저장했어요.')).toBeInTheDocument();
});

it('프로필 저장에 실패하면 오류를 보여준다', async () => {
  vi.spyOn(careApi, 'updateCareRecipient').mockRejectedValue(new Error('저장 실패'));
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('저장 실패');
});

it('루틴을 추가하면 시간 순서에 맞춰 목록에 표시한다', async () => {
  const create = vi.spyOn(routinesApi, 'createRoutine').mockResolvedValue(
    { id: 3, careRecipientId: 42, time: '12:00', title: '점심 식사', memo: null });
  await renderPage();
  fireEvent.change(screen.getByLabelText('루틴 시간'), { target: { value: '12:00' } });
  fireEvent.change(screen.getByLabelText('루틴 제목'), { target: { value: ' 점심 식사 ' } });
  fireEvent.click(screen.getByRole('button', { name: '루틴 추가' }));

  await waitFor(() => expect(create).toHaveBeenCalledWith(42, { time: '12:00', title: '점심 식사', memo: null }));
  await waitFor(() => {
    const items = screen.getAllByRole('listitem').map(li => li.textContent ?? '');
    expect(items.map(t => t.slice(0, 5))).toEqual(['07:30', '12:00', '19:00']);
  });
  expect(screen.getByLabelText('루틴 제목')).toHaveValue('');
});

it('제목이나 시간이 비어 있으면 루틴을 추가하지 않는다', async () => {
  const create = vi.spyOn(routinesApi, 'createRoutine');
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: '루틴 추가' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('시간과 제목을 입력해 주세요.');
  expect(create).not.toHaveBeenCalled();
});

it('루틴을 수정한다', async () => {
  const update = vi.spyOn(routinesApi, 'updateRoutine').mockResolvedValue(
    { id: 1, careRecipientId: 42, time: '07:30', title: '기상 후 스트레칭', memo: '천천히' });
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: '기상 수정' }));
  expect(screen.getByLabelText('루틴 제목')).toHaveValue('기상');
  expect(screen.getByLabelText('루틴 메모')).toHaveValue('천천히');
  fireEvent.change(screen.getByLabelText('루틴 제목'), { target: { value: '기상 후 스트레칭' } });
  fireEvent.click(screen.getByRole('button', { name: '루틴 수정 완료' }));

  await waitFor(() => expect(update).toHaveBeenCalledWith(42, 1, { time: '07:30', title: '기상 후 스트레칭', memo: '천천히' }));
  expect(await screen.findByText('기상 후 스트레칭')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '루틴 추가' })).toBeInTheDocument();
});

it('루틴을 삭제한다', async () => {
  const remove = vi.spyOn(routinesApi, 'deleteRoutine').mockResolvedValue(undefined);
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: '기상 삭제' }));
  await waitFor(() => expect(remove).toHaveBeenCalledWith(42, 1));
  await waitFor(() => expect(screen.queryByText('기상')).not.toBeInTheDocument());
});

it('루틴이 없으면 안내 문구를 보여준다', async () => {
  vi.spyOn(routinesApi, 'listRoutines').mockResolvedValue([]);
  await renderPage();
  expect(screen.getByText('등록된 루틴이 없어요.')).toBeInTheDocument();
});

it('활동지원사는 프로필과 루틴을 읽기만 할 수 있다', async () => {
  mockRole = 'SUPPORT_WORKER';
  await renderPage();
  const list = screen.getAllByRole('list')[0];
  expect(within(list).getByText('기상')).toBeInTheDocument();
  expect(screen.getByText('심한 장애')).toBeInTheDocument();
  expect(screen.getByText(/삼결병원/)).toBeInTheDocument();
  expect(screen.queryByLabelText('병원명')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '프로필 저장' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '루틴 추가' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '기상 삭제' })).not.toBeInTheDocument();
});

it('당사자를 전환하면 이전 당사자의 폼과 루틴을 지우고 새 데이터가 올 때까지 편집할 수 없다', async () => {
  const other: CareRecipient = { ...recipient, id: 43, name: '이하늘', hospitalName: '다른병원' };
  const view = render(<MemoryRouter><ProfilePage /></MemoryRouter>);
  await screen.findByText('김삼결');
  expect(screen.getByText('기상')).toBeInTheDocument();

  let resolveOther!: (r: CareRecipient) => void;
  vi.spyOn(careApi, 'getCareRecipient').mockImplementation(() => new Promise(resolve => { resolveOther = resolve; }));
  vi.spyOn(routinesApi, 'listRoutines').mockResolvedValue([]);
  mockRecipientId = 43;
  view.rerender(<MemoryRouter><ProfilePage /></MemoryRouter>);

  await waitFor(() => expect(screen.queryByText('김삼결')).not.toBeInTheDocument());
  expect(screen.queryByLabelText('병원명')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '프로필 저장' })).not.toBeInTheDocument();
  expect(screen.queryByText('기상')).not.toBeInTheDocument();

  resolveOther(other);
  expect(await screen.findByText('이하늘')).toBeInTheDocument();
  expect(screen.getByLabelText('병원명')).toHaveValue('다른병원');
});
