import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireRole } from './RequireRole';

let role = 'GUARDIAN';
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role } }) }));
afterEach(() => { cleanup(); role = 'GUARDIAN'; });

it.each(['GUARDIAN', 'SUPPORT_WORKER'])('%s는 공동 기록 작성 경로에 접근할 수 있다', userRole => {
  role = userRole;
  render(<MemoryRouter initialEntries={['/records/new']}><Routes>
    <Route element={<RequireRole role={['GUARDIAN', 'SUPPORT_WORKER']} />}>
      <Route path="/records/new" element={<p>기록 작성</p>} />
    </Route>
  </Routes></MemoryRouter>);
  expect(screen.getByText('기록 작성')).toBeInTheDocument();
});

it('기관 계정은 기록 작성 경로에서 기관 화면으로 이동한다', () => {
  role = 'INSTITUTION';
  render(<MemoryRouter initialEntries={['/records/new']}><Routes>
    <Route element={<RequireRole role={['GUARDIAN', 'SUPPORT_WORKER']} />}>
      <Route path="/records/new" element={<p>기록 작성</p>} />
    </Route>
    <Route path="/agency" element={<p>기관 화면</p>} />
  </Routes></MemoryRouter>);
  expect(screen.getByText('기관 화면')).toBeInTheDocument();
  expect(screen.queryByText('기록 작성')).not.toBeInTheDocument();
});
