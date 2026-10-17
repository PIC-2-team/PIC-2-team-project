import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { RequireRecipient } from './components/RequireRecipient';
import { RequireRole } from './components/RequireRole';
import { ConsentPage } from './pages/ConsentPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { DailyRecordPage } from './pages/DailyRecordPage';
import { RecordFormPage } from './pages/RecordFormPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { CareInfoPage } from './pages/CareInfoPage';
import { MorePage } from './pages/MorePage';
import { AgencyDashboardPage } from './pages/agency/AgencyDashboardPage';
import { CareRecipientRegistrationPage } from './pages/CareRecipientRegistrationPage';
import { GoogleRegisterPage } from './pages/GoogleRegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/consent', element: <ConsentPage /> },
  { path: '/google-register', element: <GoogleRegisterPage /> },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole role="GUARDIAN" />,
        children: [{ path: '/care-recipients/new', element: <CareRecipientRegistrationPage /> }],
      },
      {
        element: <AppLayout />,
        children: [
          { path: '/home', element: <HomePage /> },
          {
            element: <RequireRecipient />,
            children: [
              { path: '/records', element: <DailyRecordPage /> },
              { path: '/care-info', element: <CareInfoPage /> },
            ],
          },
          { path: '/more', element: <MorePage /> },
        ],
      },
      {
        element: <RequireRecipient />,
        children: [{ path: '/records/:id', element: <RecordDetailPage /> }],
      },
    ],
  },

  // GUARDIAN 전용 — 활동지원사는 기록 작성 불가
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole role="GUARDIAN" />,
        children: [{
          element: <RequireRecipient />,
          children: [{ path: '/records/new', element: <RecordFormPage /> }],
        }],
      },
    ],
  },

  // AGENCY 전용 — 백엔드 AGENCY enum 확정 후 완전 활성화
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole role="AGENCY" />,
        children: [{ path: '/agency', element: <AgencyDashboardPage /> }],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
