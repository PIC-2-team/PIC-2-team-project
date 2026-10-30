import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { RequireRecipient } from './components/RequireRecipient';
import { RequireRole } from './components/RequireRole';
import { ConsentPage } from './pages/ConsentPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { DailyRecordPage } from './pages/DailyRecordPage';
import { DeletedRecordsPage } from './pages/DeletedRecordsPage';
import { RecordFormPage } from './pages/RecordFormPage';
import { CareInfoPage } from './pages/CareInfoPage';
import CareInfoDetailPage from './pages/CareInfoDetailPage';
import { MorePage } from './pages/MorePage';
import { AgencyDashboardPage } from './pages/agency/AgencyDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CareRecipientRegistrationPage } from './pages/CareRecipientRegistrationPage';
import { GoogleRegisterPage } from './pages/GoogleRegisterPage';
import { RegisterPage } from './pages/RegisterPage';
import { SecondaryGuardianPage } from './pages/SecondaryGuardianPage';
import { CareRelationsPage } from './pages/CareRelationsPage';
import { NotificationInboxPage } from './pages/NotificationInboxPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LegacyRecordDetailRedirect } from './components/LegacyRecordDetailRedirect';

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
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
            ],
          },
          { path: '/more', element: <MorePage /> },
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
