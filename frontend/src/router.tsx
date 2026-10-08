import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ConsentPage from './pages/ConsentPage';
import HomePage from './pages/HomePage';
import DailyRecordPage from './pages/DailyRecordPage';
import CareInfoPage from './pages/CareInfoPage';

export const router = createBrowserRouter([
  { path: '/', element: <ConsentPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/records', element: <DailyRecordPage /> },
      { path: '/care-info', element: <CareInfoPage /> },
    ],
  },
]);
