import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { AppShell } from '../components/layout/AppShell';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Skeleton } from '../components/ui/Skeleton';

// Lazy-loaded pages
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const TwoFactor = lazy(() => import('../pages/auth/TwoFactor'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
const Feed = lazy(() => import('../pages/annonces/Feed'));
const Carte = lazy(() => import('../pages/annonces/Carte'));
const Detail = lazy(() => import('../pages/annonces/Detail'));
const Publier = lazy(() => import('../pages/annonces/Publier'));
const Recherche = lazy(() => import('../pages/Recherche'));
const Recommandations = lazy(() => import('../pages/Recommandations'));
const Messagerie = lazy(() => import('../pages/Messagerie'));
const Visites = lazy(() => import('../pages/Visites'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Historique = lazy(() => import('../pages/Historique'));
const PublicProfile = lazy(() => import('../pages/profil/PublicProfile'));
const Settings = lazy(() => import('../pages/profil/Settings'));
const TrouverOffreur = lazy(() => import('../pages/TrouverOffreur'));

const PageLoader = () => (
  <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <Skeleton style={{ height: '48px', borderRadius: '12px' }} />
    <Skeleton style={{ height: '200px', borderRadius: '12px' }} />
    <Skeleton style={{ height: '200px', borderRadius: '12px' }} />
  </div>
);

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/annonces" replace />;
  }
  return <Outlet />;
}

const router = createBrowserRouter([
  // Public routes (no shell)
  {
    element: (
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    ),
    children: [
      { path: '/', element: <Home /> },
    ],
  },
  // Auth routes (public only)
  {
    element: (
      <PublicOnlyRoute />
    ),
    children: [
      {
        element: <Suspense fallback={<PageLoader />}><Outlet /></Suspense>,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
          { path: '/2fa', element: <TwoFactor /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
          { path: '/reset-password', element: <ResetPassword /> },
        ],
      },
    ],
  },
  // Protected routes with AppShell
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: (
          <AppShell>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </AppShell>
        ),
        children: [
          { path: '/annonces', element: <Feed /> },
          { path: '/annonces/carte', element: <Carte /> },
          { path: '/annonces/:id', element: <Detail /> },
          { path: '/annonces/publier', element: <Publier /> },
          { path: '/recherche', element: <Recherche /> },
          { path: '/recommandations', element: <Recommandations /> },
          { path: '/messagerie', element: <Messagerie /> },
          { path: '/messagerie/:id', element: <Messagerie /> },
          { path: '/visites', element: <Visites /> },
          { path: '/historique', element: <Historique /> },
          { path: '/notifications', element: <Notifications /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/profil/:id', element: <PublicProfile /> },
          { path: '/trouver-offreur', element: <TrouverOffreur /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
