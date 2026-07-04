import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api, { MOCK_JOBS } from '../services/api';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Plus,
  RefreshCw,
  AlertTriangle,
  FolderOpen,
  Terminal,
  Server,
  Layers,
  Gauge,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

export const DashboardHome: React.FC = () => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [taskType, setTaskType] = useState('sendEmail');
  const [priority, setPriority] = useState(1);
  const [delaySeconds, setDelaySeconds] = useState(0);

  // Form states for payload details
  const [emailTo, setEmailTo] = useState('user@test.com');
  const [paymentAmount, setPaymentAmount] = useState(250);

  // 1. Fetch Metrics
  const { data: metricsData } = useQuery({
    queryKey: ['metrics', activeProject?.id],
    queryFn: () => api.metrics.get(activeProject!.id),
    enabled: !!activeProject?.id,
  });

  // 2. Fetch Queues for Dropdown Selection
  const { data: queuesData } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => api.queue.list(activeProject!.id),
    enabled: !!activeProject?.id,
  });

  // 3. Fetch Recent Activity Job Stream
  const { data: jobsData } = useQuery({
    queryKey: ['recentJobs', activeProject?.id],
    queryFn: () =>
      api.job.list({
        projectId: activeProject!.id,
        limit: 6,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    enabled: !!activeProject?.id,
  });

  // 4. Job Creation Mutation
  const createJobMutation = useMutation({
    mutationFn: (newJob: any) => api.job.create(newJob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentJobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setShowAddJobModal(false);
    },
  });

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueue || !activeProject) return;

    let payload = {};
    if (taskType === 'sendEmail') {
      payload = { type: 'sendEmail', to: emailTo, subject: 'Immediate Scheduler Notification' };
    } else if (taskType === 'processPayment') {
      payload = { type: 'processPayment', amount: paymentAmount, userId: 'usr-local-302' };
    } else {
      payload = { type: 'simulateFailure' };
    }

    createJobMutation.mutate({
      projectId: activeProject.id,
      queueId: selectedQueue,
      payload,
      priority,
      delaySeconds: delaySeconds > 0 ? delaySeconds : undefined,
    });
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center select-none font-jakarta">
        <FolderOpen size={48} className="text-gray-600 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-gray-300 font-display">No Project Selected</h3>
        <p className="text-sm text-gray-500 max-w-sm mt-2">
          Select or create a project in the top header to begin monitoring your distributed job queues.
        </p>
      </div>
    );
  }

  const stats = metricsData?.data?.jobs || {
    total: 0,
    PENDING: 0,
    CLAIMED: 0,
    RUNNING: 0,
    COMPLETED: 0,
    FAILED: 0,
    RETRYING: 0,
    successRate: 100,
    failureRate: 0,
    averageExecutionTimeMs: 0,
  };
  const workers = metricsData?.data?.workers || { total: 0, ONLINE: 0, BUSY: 0, IDLE: 0 };
  const recentJobs = jobsData?.data?.jobs || [];
  const queues = queuesData?.data?.queues || [];

  // Recharts Fake Timeline Data for Throughput trends
  const throughputData = [
    { name: '10:00', completed: 15, failed: 1 },
    { name: '11:00', completed: 28, failed: 2 },
    { name: '12:00', completed: 22, failed: 0 },
    { name: '13:00', completed: 35, failed: 4 },
    { name: '14:00', completed: Math.max(12, stats.COMPLETED - 8), failed: Math.max(0, stats.FAILED - 1) },
    { name: '15:00', completed: stats.COMPLETED, failed: stats.FAILED },
  ];

  // Pie/Donut Chart data representing global status distribution
  const allocationData = [
    { name: 'Completed', value: stats.COMPLETED, color: '#10B981' },
    { name: 'Failed', value: stats.FAILED + (metricsData?.data?.deadLetterQueueCount || 0), color: '#EF4444' },
    { name: 'Running', value: stats.RUNNING + stats.CLAIMED, color: '#3B82F6' },
    { name: 'Pending', value: stats.PENDING, color: '#F59E0B' },
    { name: 'Retrying', value: stats.RETRYING, color: '#8B5CF6' },
  ].filter(item => item.value > 0);

  // Fallback if data is empty
  const hasAllocationData = allocationData.length > 0;
  const pieData = hasAllocationData ? allocationData : [{ name: 'System Idle', value: 1, color: '#1F2937' }];

  // Queue utilization (Bar Chart) mapping pending job queues sizes
  const queueLengthData = queues.map((q: any) => ({
    name: q.name.length > 12 ? q.name.substring(0, 10) + '..' : q.name,
    pending: MOCK_JOBS.filter(j => j.queueId === q.id && j.status === 'PENDING').length,
    running: MOCK_JOBS.filter(j => j.queueId === q.id && j.status === 'RUNNING').length,
  }));

  return (
    <div className="space-y-8 select-none font-jakarta">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[20%] right-[10%] w-80 h-80 rounded-full bg-purple-600/5 blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[20%] left-[10%] w-80 h-80 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none -z-10"></div>

      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] text-neonPurple font-bold uppercase tracking-widest font-display">System Cluster Core</span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-display bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mt-1">
            {activeProject.name}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="p-2.5 bg-darkCard border border-white/5 hover:border-white/10 hover:bg-darkBorder/40 rounded-2xl text-gray-400 hover:text-white transition-all duration-300"
            title="Refresh Metrics"
          >
            <RefreshCw size={16} className="hover:rotate-180 transition-transform duration-500" />
          </button>
          <button
            onClick={() => {
              if (queues.length > 0) {
                setSelectedQueue(queues[0].id);
              }
              setShowAddJobModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-purple-500/20 transition-all duration-300 glow-btn"
          >
            <Plus size={14} />
            Dispatch Job Node
          </button>
        </div>
      </div>

      {/* METRIC CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active queue depth */}
        <div className="glass p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-neonPurple border border-purple-500/10">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display">Active Queue Depth</p>
              <h4 className="text-3xl font-extrabold text-white mt-1.5 font-display">
                {stats.PENDING + stats.RUNNING + stats.RETRYING}
              </h4>
              <p className="text-[10px] text-gray-400 mt-1 font-semibold">Pending execution items</p>
            </div>
          </div>
        </div>

        {/* Completed Jobs */}
        <div className="glass p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display">Processed Success</p>
              <h4 className="text-3xl font-extrabold text-white mt-1.5 font-display">{stats.COMPLETED}</h4>
              <p className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-green"></span>
                {stats.successRate}% completion index
              </p>
            </div>
          </div>
        </div>

        {/* Failed Jobs */}
        <div className="glass p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/10">
              <XCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display">Total Failures</p>
              <h4 className="text-3xl font-extrabold text-white mt-1.5 font-display">
                {stats.FAILED + (metricsData?.data?.deadLetterQueueCount || 0)}
              </h4>
              <p className="text-[10px] text-red-400 mt-1 font-semibold">{stats.failureRate}% failure index</p>
            </div>
          </div>
        </div>

        {/* Active Worker Nodes */}
        <div className="glass p-6 rounded-3xl border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-neonCyan border border-cyan-500/10">
              <Cpu size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display">Worker Clusters</p>
              <h4 className="text-3xl font-extrabold text-white mt-1.5 font-display">
                {workers.total}
              </h4>
              <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                {workers.BUSY + workers.IDLE} active • {workers.OFFLINE} offline
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* THREE-COLUMN DENSE VISUALIZATION PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Job Throughput Chart */}
        <div className="glass p-6 rounded-3xl border-white/5 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-display flex items-center gap-2">
              <Activity size={14} className="text-neonPurple" /> Job Processing Throughput
            </h3>
            <span className="text-[9px] font-bold text-neonPurple border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 rounded-full font-display">REAL-TIME TELEMETRY</span>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughputData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--c-tooltip-bg)',
                    borderColor: 'var(--c-tooltip-border)',
                    borderRadius: '16px',
                    fontSize: '11px',
                    color: 'var(--c-text-primary)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Success Jobs"
                  stroke="#A855F7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  name="Failures/DLQ"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global composition (Donut/Pie Chart) */}
        <div className="glass p-6 rounded-3xl border-white/5 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-display flex items-center gap-2">
            <Gauge size={14} className="text-neonCyan" /> Queue Status Distribution
          </h3>

          <div className="h-44 relative flex items-center justify-center mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry: any, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--c-tooltip-bg)',
                    borderColor: 'var(--c-tooltip-border)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: 'var(--c-text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Hollow circle details indicator */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-display">TOTAL</span>
              <span className="text-xl font-extrabold text-white font-display mt-0.5">{stats.total}</span>
            </div>
          </div>

          {/* Allocation Legends */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-white/5 pt-4">
            {allocationData.length === 0 ? (
              <div className="col-span-2 text-center text-[10px] text-gray-500 font-semibold py-1">
                No active execution status values
              </div>
            ) : (
              allocationData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-400 font-semibold truncate">{item.name}</span>
                  <span className="text-white font-bold font-display ml-auto">{item.value}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Queue depth chart (Bar Chart) */}
        <div className="glass p-6 rounded-3xl border-white/5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-display flex items-center gap-2 mb-6">
            <Layers size={14} className="text-neonPink" /> Active Queue Depths
          </h3>

          <div className="h-56">
            {queueLengthData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-600 font-semibold">
                No active queues detected
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queueLengthData} barSize={8}>
                  <XAxis dataKey="name" stroke="#4B5563" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4B5563" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--c-tooltip-bg)',
                      borderColor: 'var(--c-tooltip-border)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: 'var(--c-text-primary)',
                    }}
                  />
                  <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="running" name="Running" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Worker Telemetry Utilization Summary */}
        <div className="glass p-6 rounded-3xl border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-display flex items-center gap-2">
              <Server size={14} className="text-neonCyan" /> Node Hardware Telemetry
            </h3>
            
            <div className="space-y-4 mt-6">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5">
                  <span>Cluster CPU Utilization</span>
                  <span>{workers.avgCpu}%</span>
                </div>
                <div className="w-full h-2 bg-darkBg rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-neonPurple to-neonCyan transition-all duration-500 rounded-full"
                    style={{ width: `${workers.avgCpu}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5">
                  <span>Cluster Memory Load</span>
                  <span>{workers.avgMemory}%</span>
                </div>
                <div className="w-full h-2 bg-darkBg rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-neonPurple to-neonCyan transition-all duration-500 rounded-full"
                    style={{ width: `${workers.avgMemory}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 mt-6">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-display mb-3">Online Queues ({queues.length})</h4>
            <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
              {queues.length === 0 ? (
                <div className="text-[10px] text-gray-600 font-semibold py-1">No queues created</div>
              ) : (
                queues.map((q: any) => {
                  const pendingCount = MOCK_JOBS.filter(j => j.queueId === q.id && j.status === 'PENDING').length;
                  return (
                    <div key={q.id} className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400 font-semibold">{q.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-950/20 text-neonPurple border border-purple-500/10 font-bold font-display">
                        {pendingCount} pending
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RECENT JOBS STREAM */}
        <div className="glass rounded-3xl border-white/5 overflow-hidden lg:col-span-3">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-darkCard/20">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-display flex items-center gap-2">
                <Terminal size={14} className="text-neonPurple animate-pulse" /> Live Execution Stream
              </h3>
              <p className="text-[9px] text-gray-500 mt-1 font-semibold">Real-time status changes of queue job pipelines.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead style={{ backgroundColor: 'var(--c-table-head-bg)' }} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 font-display">
                <tr>
                  <th className="px-6 py-4">Job ID</th>
                  <th className="px-6 py-4">Queue</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-gray-600 font-semibold">
                      No recent job activity registered in this project.
                    </td>
                  </tr>
                ) : (
                  recentJobs.map((job: any) => (
                    <tr
                      key={job.id}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() => navigate(`/jobs?jobId=${job.id}`)}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-neonCyan">{job.id.substring(0, 8)}...</td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-400">{job.queue?.name || 'payments-queue'}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-300">
                        {(job.payload as any)?.type || 'CustomTask'}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-400 font-bold">{job.priority}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20'
                              : job.status === 'RUNNING'
                              ? 'bg-blue-950/20 text-blue-400 border-blue-500/20'
                              : job.status === 'PENDING'
                              ? 'bg-amber-950/20 text-amber-400 border-amber-500/20'
                              : job.status === 'FAILED'
                              ? 'bg-red-950/20 text-red-400 border-red-500/20'
                              : 'bg-purple-950/20 text-neonPurple border-purple-500/20'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SUBMIT JOB MODAL */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateJob}
            className="bg-darkCard border border-white/5 p-8 rounded-[24px] w-full max-w-md shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-cyan-500 opacity-60"></div>
            
            <h3 className="text-xl font-bold text-gray-100 mb-6 font-display">Dispatch Job Node</h3>
            
            {queues.length === 0 ? (
              <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-2xl text-xs text-red-400 flex items-center gap-2.5 font-semibold">
                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                <span>You must create a Queue first before submitting a job!</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select Queue */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest font-display">Target Queue</label>
                  <select
                    value={selectedQueue}
                    onChange={(e) => setSelectedQueue(e.target.value)}
                    className="w-full bg-darkCard border border-white/5 hover:border-white/10 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 rounded-2xl px-4 py-3 text-sm focus:outline-none text-white transition-all duration-300 cursor-pointer"
                  >
                    {queues.map((q: any) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Type */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest font-display">Payload Handler</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-darkCard border border-white/5 hover:border-white/10 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 rounded-2xl px-4 py-3 text-sm focus:outline-none text-white transition-all duration-300 cursor-pointer"
                  >
                    <option value="sendEmail">Dispatch Email Notification (sendEmail)</option>
                    <option value="processPayment">Process Payment Gateway (processPayment)</option>
                    <option value="simulateFailure">Trigger Sim Failure (simulateFailure)</option>
                  </select>
                </div>

                {/* Conditional Payload Parameters */}
                {taskType === 'sendEmail' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest font-display">Recipient Email</label>
                    <input
                      type="email"
                      required
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      className="w-full bg-darkCard border border-white/5 hover:border-white/10 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 rounded-2xl px-4 py-2.5 text-sm focus:outline-none text-white transition-all duration-300"
                    />
                  </div>
                )}

                {taskType === 'processPayment' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest font-display">Payment Amount ($)</label>
                    <input
                      type="number"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full bg-darkCard border border-white/5 hover:border-white/10 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 rounded-2xl px-4 py-2.5 text-sm focus:outline-none text-white transition-all duration-300"
                    />
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest font-display">Priority Priority (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full bg-darkCard border border-white/5 hover:border-white/10 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 rounded-2xl px-4 py-3 text-sm focus:outline-none text-white"
                  />
                </div>

                {/* Delay */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest font-display">Execution Delay (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-full bg-darkCard border border-white/5 hover:border-white/10 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 rounded-2xl px-4 py-3 text-sm focus:outline-none text-white"
                    placeholder="0 for instant execution"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowAddJobModal(false)}
                className="px-5 py-2.5 bg-darkBorder/40 hover:bg-darkBorder/60 text-gray-300 rounded-2xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              {queues.length > 0 && (
                <button
                  type="submit"
                  disabled={createJobMutation.isPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all duration-300 glow-btn"
                >
                  {createJobMutation.isPending ? 'Scheduling...' : 'Enqueue Node'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
