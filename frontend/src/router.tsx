import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ConsentPage from './pages/ConsentPage';
import HomePage from './pages/HomePage';
import DailyRecordPage from './pages/DailyRecordPage';
import CareInfoPage from './pages/CareInfoPage';
import CareInfoDetailPage from './pages/CareInfoDetailPage';
import MorePage from './pages/MorePage';
import RecordFormPage from './pages/RecordFormPage';

export const router = createBrowserRouter([
  { path: '/', element: <ConsentPage /> },
  { path: '/records/new', element: <RecordFormPage /> },
  { path: '/care-info/:categoryId', element: <CareInfoDetailPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/records', element: <DailyRecordPage /> },
      { path: '/care-info', element: <CareInfoPage /> },
      { path: '/more', element: <MorePage /> },
    ],
  },
]);
