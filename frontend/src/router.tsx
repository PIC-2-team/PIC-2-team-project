import { createBrowserRouter } from 'react-router-dom';
import { DemoProvider } from './demo/Store';
import { DemoLayout, NotFound } from './demo/UI';
import {
  Account,
  AgencyCode,
  Consent,
  DemoGuide,
  Onboarding,
  Profile,
  ProfileForm,
} from './demo/EntryPages';
import {
  History,
  RecordDetail,
  RecordForm,
  RecordList,
  SuggestForm,
  Suggestions,
} from './demo/RecordPages';
import {
  AgencyHome,
  Assign,
  Providers,
  Recipients,
  Relations,
  Transfer,
} from './demo/AgencyPages';
import {
  AccessLog,
  Notifications,
  RequestForm,
  Requests,
  Secondary,
} from './demo/CollaborationPages';
import { Help, Home, Info, More, Settings } from './demo/HomePages';
export const router = createBrowserRouter([
  {
    element: (
      <DemoProvider>
        <DemoLayout />
      </DemoProvider>
    ),
    children: [
      { path: '/', element: <Consent /> },
      { path: '/demo', element: <DemoGuide /> },
      { path: '/onboarding', element: <Onboarding /> },
      { path: '/onboarding/code', element: <AgencyCode /> },
      { path: '/login', element: <Account /> },
      { path: '/register', element: <Account register /> },
      { path: '/home', element: <Home /> },
      { path: '/profile', element: <Profile /> },
      { path: '/profile/new', element: <ProfileForm /> },
      { path: '/profile/:id/edit', element: <ProfileForm /> },
      { path: '/records', element: <RecordList /> },
      { path: '/records/new', element: <RecordForm /> },
      { path: '/records/:id', element: <RecordDetail /> },
      { path: '/records/:id/edit', element: <RecordForm /> },
      { path: '/records/:id/suggest', element: <SuggestForm /> },
      { path: '/history', element: <History /> },
      { path: '/care-info', element: <RecordList care /> },
      { path: '/care-info/:categoryId', element: <RecordList care /> },
      { path: '/suggestions', element: <Suggestions /> },
      { path: '/relations', element: <Relations /> },
      { path: '/transfer', element: <Transfer /> },
      { path: '/secondary', element: <Secondary /> },
      { path: '/agency', element: <AgencyHome /> },
      { path: '/agency/assign', element: <Assign /> },
      { path: '/agency/providers', element: <Providers /> },
      { path: '/agency/recipients', element: <Recipients /> },
      { path: '/requests', element: <Requests /> },
      { path: '/requests/new', element: <RequestForm /> },
      { path: '/notifications', element: <Notifications /> },
      { path: '/access-log', element: <AccessLog /> },
      { path: '/more', element: <More /> },
      { path: '/settings', element: <Settings /> },
      { path: '/help', element: <Help /> },
      { path: '/info/:topic', element: <Info /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
