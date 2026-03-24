import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout.tsx';
import { AdDetailsPage } from '../pages/AdDetailsPage.tsx';
import { AdEditPage } from '../pages/AdEditPage.tsx';
import { AdsListPage } from '../pages/AdsListPage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/ads" replace />,
      },
      {
        path: 'ads',
        element: <AdsListPage />,
      },
      {
        path: 'ads/:id',
        element: <AdDetailsPage />,
      },
      {
        path: 'ads/:id/edit',
        element: <AdEditPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
