import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard,
  Layers,
  Search,
  Cpu,
  Skull,
  LogOut,
  User,
  FolderOpen,
  Briefcase,
  Plus,
  Sun,
  Moon,
} from 'lucide-react';
import api from '../services/api';

export const Layout: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const {
    user,
    organizations,
    projects,
    activeOrg,
    activeProject,
    setActiveOrg,
    setActiveProject,
    logout,
    refreshContext,
  } = useAuth();
  const navigate = useNavigate();

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showProjModal, setShowProjModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      await api.org.create({ name: newOrgName });
      setNewOrgName('');
      setShowOrgModal(false);
      await refreshContext();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !activeOrg) return;
    try {
      await api.project.create({
        organizationId: activeOrg.id,
        name: newProjName,
        description: newProjDesc,
      });
      setNewProjName('');
      setNewProjDesc('');
      setShowProjModal(false);
      await refreshContext();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-darkBg bg-mesh text-gray-100 font-jakarta">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-darkCard border-r border-darkBorder flex flex-col justify-between select-none">
        <div>
          {/* Brand header */}
          <div className="h-16 flex items-center px-6 border-b border-darkBorder gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-neonPurple to-neonCyan flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
              ⏱️
            </div>
            <div>
              <h1 className="font-bold text-base bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Codity</h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Job Scheduler</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600/10 text-neonPurple border border-purple-500/25 shadow-[0_0_15px_rgba(168,85,247,0.05)]'
                    : 'text-gray-400 hover:bg-darkBorder/30 hover:text-gray-200 border border-transparent'
                }`
              }
            >
              <LayoutDashboard size={18} />
              Dashboard
            </NavLink>
            <NavLink
              to="/queues"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600/10 text-neonPurple border border-purple-500/25'
                    : 'text-gray-400 hover:bg-darkBorder/30 hover:text-gray-200 border border-transparent'
                }`
              }
            >
              <Layers size={18} />
              Queues
            </NavLink>
            <NavLink
              to="/jobs"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600/10 text-neonPurple border border-purple-500/25'
                    : 'text-gray-400 hover:bg-darkBorder/30 hover:text-gray-200 border border-transparent'
                }`
              }
            >
              <Search size={18} />
              Job Explorer
            </NavLink>
            <NavLink
              to="/workers"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600/10 text-neonPurple border border-purple-500/25'
                    : 'text-gray-400 hover:bg-darkBorder/30 hover:text-gray-200 border border-transparent'
                }`
              }
            >
              <Cpu size={18} />
              Workers
            </NavLink>
            <NavLink
              to="/dlq"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-gray-400 hover:bg-darkBorder/30 hover:text-gray-200 border border-transparent'
                }`
              }
            >
              <Skull size={18} />
              Dead Letter Queue
            </NavLink>
          </nav>
        </div>

        {/* Sidebar Footer User Details */}
        <div className="p-4 border-t border-darkBorder">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-darkBorder border border-gray-700 flex items-center justify-center text-gray-300">
              <User size={16} />
            </div>
            <div className="truncate w-36">
              <p className="text-xs font-semibold text-gray-200 truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 hover:border-red-900/50 text-red-400 rounded-xl text-xs font-medium transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 backdrop-blur-md border-b border-darkBorder px-8 flex items-center justify-between" style={{ backgroundColor: 'var(--c-header-bg)' }}>
          <div className="flex items-center gap-6">
            {/* Organization Selector */}
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-gray-400" />
              <select
                value={activeOrg?.id || ''}
                onChange={(e) => {
                  const org = organizations.find((o) => o.id === e.target.value);
                  if (org) setActiveOrg(org);
                }}
                className="bg-transparent text-sm font-semibold border-none focus:outline-none focus:ring-0 cursor-pointer pr-8 text-gray-200 hover:text-white"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-darkCard text-gray-200">
                    {org.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowOrgModal(true)}
                className="p-1 hover:bg-darkBorder/40 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Create Organization"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Separator line */}
            <div className="h-4 w-px bg-darkBorder"></div>

            {/* Project Selector */}
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-neonCyan" />
              {projects.length > 0 ? (
                <select
                  value={activeProject?.id || ''}
                  onChange={(e) => {
                    const proj = projects.find((p) => p.id === e.target.value);
                    if (proj) setActiveProject(proj);
                  }}
                  className="bg-transparent text-sm font-semibold border-none focus:outline-none focus:ring-0 cursor-pointer pr-8 text-gray-200 hover:text-white"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="bg-darkCard text-gray-200">
                      {proj.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-gray-500 font-medium">No projects found</span>
              )}
              {activeOrg && (
                <button
                  onClick={() => setShowProjModal(true)}
                  className="p-1 hover:bg-darkBorder/40 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Create Project"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-darkBorder/40 rounded-xl text-gray-400 hover:text-white transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2 font-display bg-darkBg/60 px-3 py-1.5 rounded-full border border-white/5">
              <span>Live Sync Connected</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-green"></span>
            </div>
          </div>
        </header>

        {/* View Workspace */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>

      {/* CREATE ORG MODAL */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOrg}
            className="bg-darkCard border border-darkBorder p-6 rounded-2xl w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-100 mb-4">Create Organization</h3>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Organization Name</label>
              <input
                type="text"
                required
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full bg-darkBg border border-darkBorder hover:border-gray-600 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-white transition-colors"
                placeholder="e.g. Acme Corporation"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowOrgModal(false)}
                className="px-4 py-2 bg-darkBorder/40 hover:bg-darkBorder/60 text-gray-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/25 transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showProjModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProj}
            className="bg-darkCard border border-darkBorder p-6 rounded-2xl w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-100 mb-4">Create Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-600 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-white transition-colors"
                  placeholder="e.g. Email Dispatch Pipeline"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-600 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-white transition-colors h-24 resize-none"
                  placeholder="Summarize this project's scheduling queue needs..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowProjModal(false)}
                className="px-4 py-2 bg-darkBorder/40 hover:bg-darkBorder/60 text-gray-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/25 transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Layout;
