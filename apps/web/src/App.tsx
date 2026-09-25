/**
 * Composant racine de l'application web.
 * Déclare le routeur (React Router) avec les gardes d'authentification et
 * d'accès admin, enveloppant chaque page dans le layout principal (Atelier & DSI ITIL & AIOS).
 * Auteur : Martial Zinsou
 */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import MachineDetail from './pages/MachineDetail';
import Parts from './pages/Parts';
import Benchmark from './pages/Benchmark';
import WorkOrders from './pages/WorkOrders';
import WorkOrderDetail from './pages/WorkOrderDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ItilDashboard from './pages/itil/ItilDashboard';
import ItilIncidents from './pages/itil/ItilIncidents';
import ItilCmdb from './pages/itil/ItilCmdb';
import ItilChanges from './pages/itil/ItilChanges';
import ItilProblems from './pages/itil/ItilProblems';
import ItilServiceCatalog from './pages/itil/ItilServiceCatalog';
import AiosDashboard from './pages/aios/AiosDashboard';
import AiosChat from './pages/aios/AiosChat';
import AiosAgents from './pages/aios/AiosAgents';
import AiosModels from './pages/aios/AiosModels';
import AiosWorkflows from './pages/aios/AiosWorkflows';
import AiosAnalytics from './pages/aios/AiosAnalytics';
import AiosSettings from './pages/aios/AiosSettings';

/** Garde de route : redirige vers /login si aucun utilisateur n'est connecté. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

/** Garde de route : réserve le contenu aux administrateurs uniquement. */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Définit l'arbre des routes de l'application, imbriqué dans AuthProvider. */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout>
                <Dashboard />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/machines"
          element={
            <RequireAuth>
              <Layout>
                <Machines />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/machines/:id"
          element={
            <RequireAuth>
              <Layout>
                <MachineDetail />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/parts"
          element={
            <RequireAuth>
              <Layout>
                <Parts />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/benchmark"
          element={
            <RequireAuth>
              <Layout>
                <Benchmark />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/work-orders"
          element={
            <RequireAuth>
              <Layout>
                <WorkOrders />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/work-orders/:id"
          element={
            <RequireAuth>
              <Layout>
                <WorkOrderDetail />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth>
              <Layout>
                <Reports />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <AdminOnly>
                <Layout>
                  <Settings />
                </Layout>
              </AdminOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/itil"
          element={
            <RequireAuth>
              <Layout>
                <ItilDashboard />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/itil/incidents"
          element={
            <RequireAuth>
              <Layout>
                <ItilIncidents />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/itil/cmdb"
          element={
            <RequireAuth>
              <Layout>
                <ItilCmdb />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/itil/changes"
          element={
            <RequireAuth>
              <Layout>
                <ItilChanges />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/itil/problems"
          element={
            <RequireAuth>
              <Layout>
                <ItilProblems />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/itil/services"
          element={
            <RequireAuth>
              <Layout>
                <ItilServiceCatalog />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/aios"
          element={
            <RequireAuth>
              <Layout>
                <AiosDashboard />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/aios/chat"
          element={
            <RequireAuth>
              <Layout>
                <AiosChat />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/aios/agents"
          element={
            <RequireAuth>
              <Layout>
                <AiosAgents />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/aios/models"
          element={
            <RequireAuth>
              <Layout>
                <AiosModels />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/aios/workflows"
          element={
            <RequireAuth>
              <Layout>
                <AiosWorkflows />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/aios/analytics"
          element={
            <RequireAuth>
              <Layout>
                <AiosAnalytics />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/aios/settings"
          element={
            <RequireAuth>
              <AdminOnly>
                <Layout>
                  <AiosSettings />
                </Layout>
              </AdminOnly>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}