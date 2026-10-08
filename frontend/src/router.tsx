import { createBrowserRouter } from 'react-router-dom';
import ConsentPage from './pages/ConsentPage';
import HomePage from './pages/HomePage';
import DailyRecordPage from './pages/DailyRecordPage';
import CareInfoPage from './pages/CareInfoPage';

export const router = createBrowserRouter([
  { path: '/', element: <ConsentPage /> },
  { path: '/home', element: <HomePage /> },
  { path: '/records', element: <DailyRecordPage /> },
  { path: '/care-info', element: <CareInfoPage /> },
]);
