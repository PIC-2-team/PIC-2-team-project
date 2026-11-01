import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WorkerOrganizationPage } from './WorkerOrganizationPage';
import * as organizationsApi from '../api/organizations';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('QR의 기관 코드를 입력해 기존 소속을 확인한다', async () => {
  const verify = vi.spyOn(organizationsApi, 'verifyWorkerOrganization').mockResolvedValue({
    id: 10, name: '행복복지관', organizationCode: 'KNU001', createdAt: '',
  });
  const user = userEvent.setup();
  render(<MemoryRouter><WorkerOrganizationPage /></MemoryRouter>);

  await user.type(screen.getByRole('textbox', { name: '기관 코드' }), 'knu001');
  await user.click(screen.getByRole('button', { name: '기관 연결 확인' }));

  expect(verify).toHaveBeenCalledWith('KNU001');
  expect(await screen.findByRole('status')).toHaveTextContent('행복복지관');
});

it('미등록 활동지원사에게 기관 등록 요청을 안내한다', async () => {
  vi.spyOn(organizationsApi, 'verifyWorkerOrganization').mockRejectedValue(
    new Error('소속 활동지원사로 등록되어 있지 않습니다. 기관 담당자에게 등록을 요청해 주세요.'),
  );
  const user = userEvent.setup();
  render(<MemoryRouter><WorkerOrganizationPage /></MemoryRouter>);

  await user.type(screen.getByRole('textbox', { name: '기관 코드' }), 'KNU001');
  await user.click(screen.getByRole('button', { name: '기관 연결 확인' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('기관 담당자에게 등록을 요청해 주세요.');
});

it('QR 인식 미지원 브라우저에서는 직접 입력을 안내한다', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><WorkerOrganizationPage /></MemoryRouter>);

  await user.click(screen.getByRole('button', { name: /QR 코드 스캔/ }));

  expect(await screen.findByRole('alert')).toHaveTextContent('기관 코드를 직접 입력해 주세요.');
});
