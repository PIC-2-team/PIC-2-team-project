import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { RequireRecipient } from './components/RequireRecipient';
import { RequireRole } from './components/RequireRole';
import { ConsentPage } from './pages/ConsentPage';
import { LoginPage } from './pages/LoginPage';
import { DemoEntryPage } from './pages/DemoEntryPage';
import { HomePage } from './pages/HomePage';
import { DailyRecordPage } from './pages/DailyRecordPage';
import { DeletedRecordsPage } from './pages/DeletedRecordsPage';
import { RecordFormPage } from './pages/RecordFormPage';
import { CareInfoPage } from './pages/CareInfoPage';
import CareInfoDetailPage from './pages/CareInfoDetailPage';
import { MorePage } from './pages/MorePage';
import { WithdrawPage } from './pages/WithdrawPage';
import { ProfilePage } from './pages/ProfilePage';
import { AgencyDashboardPage } from './pages/agency/AgencyDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CareRecipientRegistrationPage } from './pages/CareRecipientRegistrationPage';
import { GoogleRegisterPage } from './pages/GoogleRegisterPage';
import { RegisterPage } from './pages/RegisterPage';
import { SecondaryGuardianPage } from './pages/SecondaryGuardianPage';
import { CareRelationsPage } from './pages/CareRelationsPage';
import { WorkerOrganizationPage } from './pages/WorkerOrganizationPage';
import { NotificationInboxPage } from './pages/NotificationInboxPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LegacyRecordDetailRedirect } from './components/LegacyRecordDetailRedirect';

export const router = createBrowserRouter([
  { path: '/', element: <DemoEntryPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/consent', element: <ConsentPage /> },
  { path: '/register', element: <RegisterPage /> },
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
              {
                element: <RequireRole role={['GUARDIAN', 'SUPPORT_WORKER']} />,
                children: [{ path: '/records/deleted', element: <DeletedRecordsPage /> }],
              },
              { path: '/care-info', element: <CareInfoPage /> },
              { path: '/profile', element: <ProfilePage /> },
            ],
          },
          { path: '/more', element: <MorePage /> },
          {
            // 관리자는 탈퇴 대상이 아니다. 더보기에서만 들어오지만 주소로 직접 열 수도 있어 막는다
            element: <RequireRole role={['GUARDIAN', 'SUPPORT_WORKER', 'INSTITUTION']} />,
            children: [{ path: '/withdraw', element: <WithdrawPage /> }],
          },
          { path: '/notifications', element: <NotificationInboxPage /> },
        ],
      },
      {
        element: <RequireRole role={['GUARDIAN', 'SUPPORT_WORKER']} />,
        children: [{
          element: <RequireRecipient />,
          children: [{ path: '/records/new', element: <RecordFormPage /> }],
        }],
      },
      {
        element: <RequireRecipient />,
        children: [
          { path: '/records/:id', element: <LegacyRecordDetailRedirect /> },
          { path: '/care-info/:categoryId', element: <CareInfoDetailPage /> },
        ],
      },
    ],
  },

  // GUARDIAN 전용
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole role="GUARDIAN" />,
        children: [{
          element: <RequireRecipient />,
          children: [
            { path: '/secondary-guardian', element: <SecondaryGuardianPage /> },
            { path: '/care-relations', element: <CareRelationsPage /> },
          ],
        }],
      },
    ],
  },

  // SUPPORT_WORKER 전용 — 활동지원사 돌봄 내용 수정 요청
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole role="SUPPORT_WORKER" />,
        children: [{ path: '/worker/organization', element: <WorkerOrganizationPage /> }],
      },
    ],
  },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole role="INSTITUTION" />,
        children: [{ path: '/agency', element: <AgencyDashboardPage /> }],
      },
    ],
  },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole role="ADMIN" />,
        children: [{ path: '/admin', element: <AdminDashboardPage /> }],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as { __router?: typeof router }).__router = router;
}
