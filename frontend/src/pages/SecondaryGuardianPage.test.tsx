import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SecondaryGuardianPage } from './SecondaryGuardianPage';
import * as careRecipientsApi from '../api/careRecipients';

let mockUser: { id: number; name: string; email: string; role: string; publicCode?: string } | null = {
  id: 42,
  name: '김보호',
  email: 'guardian@test.com',
  role: 'GUARDIAN',
  publicCode: 'P-TEST1234',
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: 42, user: mockUser }),
}));

describe('SecondaryGuardianPage', () => {
  beforeEach(() => {
    mockUser = {
      id: 42,
      name: '김보호',
      email: 'guardian@test.com',
      role: 'GUARDIAN',
      publicCode: 'P-TEST1234',
    };
    vi.clearAllMocks();
  });


  afterEach(() => {
    cleanup();
  });

  it('지정된 세컨드 보호자가 없으면 안내 문구와 초대 폼을 렌더링한다', async () => {
    vi.spyOn(careRecipientsApi, 'getSecondaryGuardian').mockResolvedValue(null);

    render(
      <MemoryRouter>
        <SecondaryGuardianPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/아직 지정된 세컨드 보호자가 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '초대할 보호자 고유 식별 코드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '세컨드 보호자 초대하기' })).toBeInTheDocument();
  });

  it('고유 코드를 입력하고 초대하기 버튼을 누르면 초대 API를 호출하고 성공 피드백을 표시한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(careRecipientsApi, 'getSecondaryGuardian')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 1,
        careRecipientId: 42,
        guardianId: 105,
        status: 'PENDING',
        invitationToken: 'token-abc',
        invitationExpiresAt: '2026-10-21T00:00:00Z',
        createdAt: '2026-10-20T00:00:00Z',
      });

    const inviteSpy = vi.spyOn(careRecipientsApi, 'inviteSecondaryGuardian').mockResolvedValue({
      id: 1,
      careRecipientId: 42,
      guardianId: 105,
      status: 'PENDING',
      invitationToken: 'token-abc',
      invitationExpiresAt: '2026-10-21T00:00:00Z',
      createdAt: '2026-10-20T00:00:00Z',
    });

    render(
      <MemoryRouter>
        <SecondaryGuardianPage />
      </MemoryRouter>,
    );

    const input = await screen.findByRole('textbox', { name: '초대할 보호자 고유 식별 코드' });
    await user.type(input, 'USR-TEST99');
    await user.click(screen.getByRole('button', { name: '세컨드 보호자 초대하기' }));

    expect(inviteSpy).toHaveBeenCalledWith(42, 'USR-TEST99');
    expect(await screen.findByRole('status')).toHaveTextContent('세컨드 보호자 초대를 전송했습니다.');
  });

  it('지정된 세컨드 보호자가 있으면 정보를 표시하고 지정 해제를 진행할 수 있다', async () => {
    const user = userEvent.setup();
    vi.spyOn(careRecipientsApi, 'getSecondaryGuardian').mockResolvedValue({
      id: 2,
      careRecipientId: 42,
      guardianId: 108,
      status: 'ACTIVE',
      invitationToken: null,
      invitationExpiresAt: null,
      createdAt: '2026-10-15T00:00:00Z',
    });

    const revokeSpy = vi.spyOn(careRecipientsApi, 'revokeSecondaryGuardian').mockResolvedValue();

    render(
      <MemoryRouter>
        <SecondaryGuardianPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('지정된 세컨드 보호자')).toBeInTheDocument();
    expect(screen.getByText('지정 완료')).toBeInTheDocument();
    expect(screen.getByText(/#108/)).toBeInTheDocument();

    const revokeBtn = screen.getByRole('button', { name: '지정 해제' });
    await user.click(revokeBtn);

    // 모달 확인
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('세컨드 보호자를 해제할까요?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: '해제하기' });
    await user.click(confirmBtn);

    expect(revokeSpy).toHaveBeenCalledWith(42);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('세컨드 보호자 지정이 해제되었습니다.');
    });
  });

  it('초대 API 실패 시 에러 알림을 노출한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(careRecipientsApi, 'getSecondaryGuardian').mockResolvedValue(null);
    vi.spyOn(careRecipientsApi, 'inviteSecondaryGuardian').mockRejectedValue(new Error('사용자를 찾을 수 없습니다.'));

    render(
      <MemoryRouter>
        <SecondaryGuardianPage />
      </MemoryRouter>,
    );

    const input = await screen.findByRole('textbox', { name: '초대할 보호자 고유 식별 코드' });
    await user.type(input, 'USR-NOTFOUND');
    await user.click(screen.getByRole('button', { name: '세컨드 보호자 초대하기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('사용자를 찾을 수 없습니다.');
  });

  it('초대 대기 중일 때 발급된 초대 코드가 노출되고 초대 코드 복사 버튼이 동작한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(careRecipientsApi, 'getSecondaryGuardian').mockResolvedValue({
      id: 3,
      careRecipientId: 42,
      guardianId: 201,
      status: 'PENDING',
      invitationToken: 'invite-secret-code-777',
      invitationExpiresAt: '2026-10-22T00:00:00Z',
      createdAt: '2026-10-21T00:00:00Z',
    });

    render(
      <MemoryRouter>
        <SecondaryGuardianPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('발급된 초대 코드')).toBeInTheDocument();
    expect(screen.getByText('invite-secret-code-777')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: '초대 코드 복사' });
    await user.click(copyBtn);

    expect(await screen.findByRole('status')).toHaveTextContent('초대 코드가 복사되었습니다.');
  });

  it('사용자에게 등록된 내 보호자 고유 코드가 표시되고 복사할 수 있다', async () => {
    const user = userEvent.setup();
    vi.spyOn(careRecipientsApi, 'getSecondaryGuardian').mockResolvedValue(null);

    render(
      <MemoryRouter>
        <SecondaryGuardianPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('내 보호자 고유 코드')).toBeInTheDocument();
    expect(screen.getByText('P-TEST1234')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: '코드 복사' });
    await user.click(copyBtn);

    expect(await screen.findByRole('status')).toHaveTextContent('내 보호자 코드가 복사되었습니다.');
  });
});

