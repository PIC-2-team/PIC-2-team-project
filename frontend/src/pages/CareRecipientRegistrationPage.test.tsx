import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { CareRecipientRegistrationPage } from './CareRecipientRegistrationPage';
import { setTokenProvider } from '../api/client';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setTokenProvider(() => null);
});

it('당사자 기본정보와 장애 유형을 제출하고 등록 완료 후 홈으로 이동한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: true,
    data: { id: 42, name: '김하늘' },
  }), { status: 201 }));
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/care-recipients/new']}>
        <Routes>
          <Route path="/care-recipients/new" element={<CareRecipientRegistrationPage />} />
          <Route path="/home" element={<p>홈 화면</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김하늘' } });
  fireEvent.change(screen.getByLabelText('생년월일'), { target: { value: '2010-01-01' } });
  fireEvent.click(screen.getByRole('radio', { name: '여성' }));
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '자폐성 장애' }));
  fireEvent.click(screen.getByRole('button', { name: '등록하기' }));

  await screen.findByText('홈 화면');
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/care-recipients', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({
      name: '김하늘', birthDate: '2010-01-01', gender: 'FEMALE', disabilityTypes: ['AUTISM'],
      disabilityGrade: null, otherDisabilityType: null,
    }),
  })));
});

it('장애 유형을 선택하지 않으면 등록 요청을 보내지 않는다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');
  render(
    <AuthProvider>
      <MemoryRouter>
        <CareRecipientRegistrationPage />
      </MemoryRouter>
    </AuthProvider>,
  );
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김하늘' } });
  fireEvent.change(screen.getByLabelText('생년월일'), { target: { value: '2010-01-01' } });
  fireEvent.click(screen.getByRole('radio', { name: '여성' }));
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('장애 유형을 하나 이상 선택해 주세요.');
  expect(fetchMock).not.toHaveBeenCalled();
});
