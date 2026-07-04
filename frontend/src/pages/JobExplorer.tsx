import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../services/api';
import {
  Filter,
  RefreshCw,
  X,
  Terminal,
  ChevronRight,
  MinusCircle,
  FileCode,
} from 'lucide-react';

export const JobExplorer: React.FC = () => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedQueue, setSelectedQueue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);

  // Selected Job Detail side-drawer state
  const selectedJobId = searchParams.get('jobId') || null;
  const [showDrawer, setShowDrawer] = useState(!!selectedJobId);

  // Close drawer
  const handleCloseDrawer = () => {
    setShowDrawer(false);
    // Remove jobId parameter from query params
    searchParams.delete('jobId');
    setSearchParams(searchParams);
  };

  // Open drawer
  const handleOpenJob = (id: string) => {
    searchParams.set('jobId', id);
    setSearchParams(searchParams);
    setShowDrawer(true);
  };

  useEffect(() => {
    if (selectedJobId) {
      setShowDrawer(true);
    }
  }, [selectedJobId]);

  // Fetch queues list for filter dropdown
  const { data: queuesRes } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => api.queue.list(activeProject!.id),
    enabled: !!activeProject?.id,
  });

  // Fetch Jobs list
  const { data: jobsRes, isLoading } = useQuery({
    queryKey: ['jobs', activeProject?.id, selectedQueue, selectedStatus, page],
    queryFn: () =>
      api.job.list({
        projectId: activeProject!.id,
        queueId: selectedQueue || undefined,
        status: selectedStatus || undefined,
        page,
        limit: 10,
      }),
    enabled: !!activeProject?.id,
  });

  // Fetch selected Job Details
  const { data: jobDetailsRes, refetch: refetchJobDetails } = useQuery({
    queryKey: ['jobDetails', selectedJobId],
    queryFn: () => api.job.get(selectedJobId!),
    enabled: !!selectedJobId,
  });

  // Cancel Job Mutation
  const cancelJobMutation = useMutation({
    mutationFn: (jobId: string) => api.job.cancel(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (selectedJobId) refetchJobDetails();
    },
  });

  if (!activeProject) return null;

  const queues = queuesRes?.data?.queues || [];
  const jobs = jobsRes?.data?.jobs || [];
  const total = jobsRes?.data?.pagination?.total || 0;
  const totalPages = jobsRes?.data?.pagination?.totalPages || 1;

  const selectedJob = jobDetailsRes?.data?.job;

  return (
    <div className="space-y-6 animate-fade-in relative select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Job Explorer</h2>
          <p className="text-sm text-gray-500 mt-1">Audit, monitor logs, and cancel queued job instances.</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries()}
          className="p-2.5 bg-darkCard border border-darkBorder hover:bg-darkBorder/40 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="glass p-4 rounded-2xl border-darkBorder/60 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <Filter size={14} className="text-neonPurple" />
          <span>Filters</span>
        </div>

        {/* Queue Filter */}
        <select
          value={selectedQueue}
          onChange={(e) => {
            setSelectedQueue(e.target.value);
            setPage(1);
          }}
          className="bg-darkBg border border-darkBorder hover:border-gray-600 focus:border-purple-500 rounded-xl px-3 py-2 text-xs focus:outline-none text-white transition-colors cursor-pointer"
        >
          <option value="">All Queues</option>
          {queues.map((q: any) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="bg-darkBg border border-darkBorder hover:border-gray-600 focus:border-purple-500 rounded-xl px-3 py-2 text-xs focus:outline-none text-white transition-colors cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="RUNNING">RUNNING</option>
          <option value="CLAIMED">CLAIMED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="FAILED">FAILED</option>
          <option value="RETRYING">RETRYING</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* JOBS GRID/TABLE */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-gray-500 font-semibold">Loading jobs...</div>
      ) : (
        <div className="glass rounded-2xl border-darkBorder/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-darkCard/30 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-darkBorder">
                <tr>
                  <th className="px-6 py-4">Job ID</th>
                  <th className="px-6 py-4">Queue</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Attempts</th>
                  <th className="px-6 py-4">Scheduled For</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBorder/40">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-gray-500 font-semibold">
                      No jobs matched the current filters.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job: any) => (
                    <tr
                      key={job.id}
                      className={`hover:bg-darkCard/10 cursor-pointer transition-colors ${
                        selectedJobId === job.id ? 'bg-purple-950/5' : ''
                      }`}
                      onClick={() => handleOpenJob(job.id)}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-neonCyan">{job.id}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-400">{job.queue?.name || 'payments-queue'}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2 py-0.5 rounded bg-darkBorder text-gray-400 font-bold">{job.priority}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-400">
                        {job.currentRetry} / {job.maxRetries}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(job.runAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            job.status === 'COMPLETED'
                              ? 'bg-green-950/20 text-green-400 border-green-500/20'
                              : job.status === 'RUNNING'
                              ? 'bg-blue-950/20 text-blue-400 border-blue-500/20'
                              : job.status === 'PENDING'
                              ? 'bg-yellow-950/20 text-yellow-400 border-yellow-500/20'
                              : job.status === 'FAILED'
                              ? 'bg-red-950/20 text-red-400 border-red-500/20'
                              : 'bg-purple-950/20 text-neonPurple border-purple-500/20'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenJob(job.id)}
                          className="p-1 hover:bg-darkBorder/40 rounded text-gray-400 hover:text-white"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION PANEL */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-darkBorder flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold">Total: {total} records</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 bg-darkCard border border-darkBorder text-gray-300 disabled:opacity-40 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-darkCard border border-darkBorder text-gray-300 disabled:opacity-40 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* JOB DETAILS DRAWER PANEL */}
      {showDrawer && selectedJob && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-darkCard border-l border-darkBorder shadow-2xl z-40 flex flex-col justify-between animate-slide-in select-none">
          {/* Header */}
          <div className="h-16 border-b border-darkBorder px-6 flex items-center justify-between bg-darkCard/90 backdrop-blur">
            <div className="flex items-center gap-3">
              <Terminal size={18} className="text-neonPurple" />
              <div>
                <h3 className="font-bold text-sm text-gray-200">Job Diagnostics</h3>
                <p className="text-[10px] text-gray-500 font-semibold uppercase font-mono">{selectedJob.id.substring(0, 18)}</p>
              </div>
            </div>
            <button
              onClick={handleCloseDrawer}
              className="p-1 hover:bg-darkBorder/40 rounded-lg text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 gap-4 bg-darkBg/50 p-4 rounded-2xl border border-darkBorder">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Status</span>
                <p className="mt-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedJob.status === 'COMPLETED'
                        ? 'bg-green-950/20 text-green-400 border-green-500/20'
                        : selectedJob.status === 'FAILED'
                        ? 'bg-red-950/20 text-red-400 border-red-500/20'
                        : 'bg-purple-950/20 text-neonPurple border-purple-500/20'
                    }`}
                  >
                    {selectedJob.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Queue</span>
                <p className="text-xs font-bold text-gray-300 mt-1">{selectedJob.queue?.name || 'payments-queue'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Priority</span>
                <p className="text-xs font-bold text-gray-300 mt-1">{selectedJob.priority}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Attempts</span>
                <p className="text-xs font-bold text-gray-300 mt-1">
                  {selectedJob.currentRetry} of {selectedJob.maxRetries}
                </p>
              </div>
            </div>

            {/* Actions Panel */}
            {(selectedJob.status === 'PENDING' || selectedJob.status === 'RETRYING') && (
              <div className="p-4 bg-yellow-950/10 border border-yellow-500/10 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Active Scheduler Task</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">This job has not been executed yet.</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Cancel this job?')) {
                      cancelJobMutation.mutate(selectedJob.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 rounded-xl text-xs font-semibold"
                >
                  <MinusCircle size={12} />
                  Cancel Job
                </button>
              </div>
            )}

            {/* Payload JSON Inspector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <FileCode size={14} className="text-neonCyan" />
                <span>Job Payload (JSON)</span>
              </div>
              <pre className="bg-darkBg p-4 rounded-xl border border-darkBorder font-mono text-[11px] text-neonCyan overflow-x-auto max-h-48">
                {JSON.stringify(selectedJob.payload, null, 2)}
              </pre>
            </div>

            {/* Executions Logs stream */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <Terminal size={14} className="text-neonPurple" />
                <span>Execution Logs Stream</span>
              </div>
              <div className="bg-darkBg border border-darkBorder rounded-xl p-4 font-mono text-[10px] text-gray-400 h-64 overflow-y-auto space-y-2.5">
                {selectedJob.logs?.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">No execution logs written for this job.</div>
                ) : (
                  selectedJob.logs?.map((log: any, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-gray-600 font-semibold">{new Date(log.timestamp).toLocaleTimeString()}:</span>
                      <span
                        className={
                          log.level === 'ERROR'
                            ? 'text-red-400'
                            : log.level === 'WARN'
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobExplorer;
