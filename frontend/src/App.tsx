import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from './services/api';

// Create TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 3000, // Auto-refresh all dashboard data every 3 seconds for real-time visualization!
      refetchOnWindowFocus: false,
    },
  },
});

// Authentication and Context Global State
interface AuthContextType {
  user: any;
  token: string | null;
  activeOrg: any;
  activeProject: any;
  organizations: any[];
  projects: any[];
  setActiveOrg: (org: any) => void;
  setActiveProject: (proj: any) => void;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeOrg, setActiveOrgState] = useState<any>(null);
  const [activeProject, setActiveProjectState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshContext = async () => {
    try {
      const meRes = await api.auth.me();
      setUser(meRes.data.user);

      const orgRes = await api.org.list();
      const orgs = orgRes.data.organizations;
      setOrganizations(orgs);

      if (orgs.length > 0) {
        const storedOrgId = localStorage.getItem('activeOrgId');
        const defaultOrg = orgs.find((o: any) => o.id === storedOrgId) || orgs[0];
        setActiveOrgState(defaultOrg);

        const projRes = await api.project.list(defaultOrg.id);
        const projs = projRes.data.projects;
        setProjects(projs);

        if (projs.length > 0) {
          const storedProjId = localStorage.getItem('activeProjId');
          const defaultProj = projs.find((p: any) => p.id === storedProjId) || projs[0];
          setActiveProjectState(defaultProj);
        } else {
          setActiveProjectState(null);
        }
      }
    } catch (err) {
      console.error('Failed to load user session profiles', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshContext();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (credentials: any) => {
    await api.auth.login(credentials);
    setToken(localStorage.getItem('token'));
  };

  const register = async (data: any) => {
    await api.auth.register(data);
    setToken(localStorage.getItem('token'));
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    setToken(null);
    setOrganizations([]);
    setProjects([]);
    setActiveOrgState(null);
    setActiveProjectState(null);
    localStorage.removeItem('token');
    localStorage.removeItem('activeOrgId');
    localStorage.removeItem('activeProjId');
  };

  const setActiveOrg = async (org: any) => {
    setActiveOrgState(org);
    localStorage.setItem('activeOrgId', org.id);
    setLoading(true);
    try {
      const projRes = await api.project.list(org.id);
      const projs = projRes.data.projects;
      setProjects(projs);
      if (projs.length > 0) {
        setActiveProjectState(projs[0]);
        localStorage.setItem('activeProjId', projs[0].id);
      } else {
        setActiveProjectState(null);
        localStorage.removeItem('activeProjId');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setActiveProject = (proj: any) => {
    setActiveProjectState(proj);
    localStorage.setItem('activeProjId', proj.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeOrg,
        activeProject,
        organizations,
        projects,
        setActiveOrg,
        setActiveProject,
        login,
        register,
        logout,
        refreshContext,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Import Layout and Pages
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardHome from './pages/DashboardHome';
import QueuesPage from './pages/Queues';
import JobExplorer from './pages/JobExplorer';
import WorkersPage from './pages/Workers';
import DLQPage from './pages/DLQ';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="queues" element={<QueuesPage />} />
              <Route path="jobs" element={<JobExplorer />} />
              <Route path="workers" element={<WorkersPage />} />
              <Route path="dlq" element={<DLQPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
