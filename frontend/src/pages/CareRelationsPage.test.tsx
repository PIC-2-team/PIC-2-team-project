import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CareRelationsPage } from './CareRelationsPage';
import { ApiError } from '../api/client';
import * as careRecipientsApi from '../api/careRecipients';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: 42 }),
}));

describe('CareRelationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('조회 API가 없으면 빈 관계 목록 대신 안내와 재시도를 표시한다', async () => {
    const fetch = vi.spyOn(careRecipientsApi, 'getCareRelations')
      .mockRejectedValueOnce(new ApiError('NOT_FOUND', '요청한 리소스를 찾을 수 없습니다.', 404))
      .mockResolvedValueOnce({ careRecipientId: 42, organizations: [], assignments: [] });
    const user = userEvent.setup();
    render(<MemoryRouter><CareRelationsPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('돌봄 관계 조회 기능이 서버에 반영되지 않았어요.');
    expect(screen.queryByText('아직 연결된 기관이 없습니다.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(await screen.findByText('아직 연결된 기관이 없습니다.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('관계 조회 실패 후에도 기관 연결 요청을 전송할 수 있다', async () => {
    vi.spyOn(careRecipientsApi, 'getCareRelations').mockRejectedValue(
      new ApiError('NOT_FOUND', '요청한 리소스를 찾을 수 없습니다.', 404),
    );
    const request = vi.spyOn(careRecipientsApi, 'requestOrganizationLink').mockResolvedValue();
    const user = userEvent.setup();
    render(<MemoryRouter><CareRelationsPage /></MemoryRouter>);
    await screen.findByRole('alert');
    await user.type(screen.getByRole('textbox', { name: '연결할 기관 코드' }), 'new002');
    await user.click(screen.getByRole('button', { name: '기관 연결 요청하기' }));
    expect(request).toHaveBeenCalledWith(42, 'NEW002');
    expect(await screen.findByRole('status')).toHaveTextContent('기관 연결 요청을 전송했습니다.');
    expect(await screen.findByRole('textbox', { name: '연결할 기관 코드' })).toBeInTheDocument();
  });

  it('연결된 기관과 배정된 지원사 목록을 정상적으로 렌더링한다', async () => {
    vi.spyOn(careRecipientsApi, 'getCareRelations').mockResolvedValue({
      careRecipientId: 42,
      organizations: [
        {
          linkId: 1,
          organizationId: 10,
          organizationName: '행복복지관',
          organizationCode: 'KNU001',
          status: 'ACCEPTED',
          requestedAt: '2026-10-15T00:00:00Z',
        },
      ],
      assignments: [
        {
          assignmentId: 101,
          supportWorkerId: 5,
          supportWorkerName: '이돌봄',
          organizationId: 10,
          organizationName: '행복복지관',
          startDate: '2026-10-01',
          endDate: null,
          endedAt: null,
        },
      ],
    });

    render(
      <MemoryRouter>
        <CareRelationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('행복복지관')).toBeInTheDocument();
    expect(screen.getByText('연결 완료')).toBeInTheDocument();
    expect(screen.getByText('기관 코드 · KNU001')).toBeInTheDocument();

    expect(screen.getByText('이돌봄 지원사')).toBeInTheDocument();
    expect(screen.getByText('배정 중')).toBeInTheDocument();
    expect(screen.getByText(/소속 · 행복복지관/)).toBeInTheDocument();
  });

  it('연결된 기관이나 배정된 지원사가 없으면 빈 상태 문구를 표시한다', async () => {
    vi.spyOn(careRecipientsApi, 'getCareRelations').mockResolvedValue({
      careRecipientId: 42,
      organizations: [],
      assignments: [],
    });

    render(
      <MemoryRouter>
        <CareRelationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('아직 연결된 기관이 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('현재 배정된 활동지원사가 없습니다.')).toBeInTheDocument();
  });

  it('기관 코드를 입력하고 연결 요청을 전송하면 성공 피드백을 표시한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(careRecipientsApi, 'getCareRelations')
      .mockResolvedValueOnce({
        careRecipientId: 42,
        organizations: [],
        assignments: [],
      })
      .mockResolvedValueOnce({
        careRecipientId: 42,
        organizations: [
          {
            linkId: 2,
            organizationId: 20,
            organizationName: '새봄센터',
            organizationCode: 'NEW002',
            status: 'PENDING',
            requestedAt: '2026-10-20T00:00:00Z',
          },
        ],
        assignments: [],
      });

    const linkSpy = vi.spyOn(careRecipientsApi, 'requestOrganizationLink').mockResolvedValue();

    render(
      <MemoryRouter>
        <CareRelationsPage />
      </MemoryRouter>,
    );

    const input = await screen.findByRole('textbox', { name: '연결할 기관 코드' });
    await user.type(input, 'new002');
    await user.click(screen.getByRole('button', { name: '기관 연결 요청하기' }));

    expect(linkSpy).toHaveBeenCalledWith(42, 'NEW002');
    expect(await screen.findByRole('status')).toHaveTextContent('기관 연결 요청을 전송했습니다.');
  });

  it('연결 요청 실패 시 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(careRecipientsApi, 'getCareRelations').mockResolvedValue({
      careRecipientId: 42,
      organizations: [],
      assignments: [],
    });

    vi.spyOn(careRecipientsApi, 'requestOrganizationLink').mockRejectedValue(
      new Error('존재하지 않는 기관 코드입니다.'),
    );

    render(
      <MemoryRouter>
        <CareRelationsPage />
      </MemoryRouter>,
    );

    const input = await screen.findByRole('textbox', { name: '연결할 기관 코드' });
    await user.type(input, 'WRONGCODE');
    await user.click(screen.getByRole('button', { name: '기관 연결 요청하기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('존재하지 않는 기관 코드입니다.');
  });
});
