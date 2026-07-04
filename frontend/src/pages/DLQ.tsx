import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../App';
import api from '../services/api';
import {
  Skull,
  RefreshCw,
  Play,
  Trash2,
  AlertTriangle,
  X,
  FileCode,
} from 'lucide-react';

export const DLQ: React.FC = () => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();

  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Fetch DLQ entries
  const { data: dlqRes, isLoading } = useQuery({
    queryKey: ['dlq', activeProject?.id],
    queryFn: () => api.dlq.list(activeProject!.id),
    enabled: !!activeProject?.id,
  });

  // Re-queue / Retry job from DLQ
  const retryMutation = useMutation({
    mutationFn: (dlqId: string) => api.dlq.retry(dlqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentJobs'] });
      setShowDrawer(false);
    },
  });

  // Delete DLQ entry permanently
  const deleteMutation = useMutation({
    mutationFn: (dlqId: string) => api.dlq.delete(dlqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setShowDrawer(false);
    },
  });

  if (!activeProject) return null;

  const entries = dlqRes?.data?.entries || [];

  return (
    <div className="space-y-6 animate-fade-in select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Dead Letter Queue (DLQ)</h2>
          <p className="text-sm text-gray-500 mt-1">Audit, inspect, and retry jobs that exceeded their retry limit.</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dlq'] })}
          className="p-2.5 bg-darkCard border border-darkBorder hover:bg-darkBorder/40 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-gray-500 font-semibold">Loading DLQ entries...</div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-2xl border-darkBorder/60 p-12 text-center flex flex-col items-center">
          <Skull size={40} className="text-gray-600 mb-3" />
          <h4 className="text-sm font-bold text-gray-300">Dead Letter Queue is empty</h4>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Excellent! No jobs have exceeded their retry bounds in this project.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl border-darkBorder/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-darkCard/30 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-darkBorder">
                <tr>
                  <th className="px-6 py-4">Original Job ID</th>
                  <th className="px-6 py-4">Queue</th>
                  <th className="px-6 py-4">Failure Reason</th>
                  <th className="px-6 py-4">Attempts</th>
                  <th className="px-6 py-4">Failed At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBorder/40">
                {entries.map((entry: any) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-darkCard/10 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedEntry(entry);
                      setShowDrawer(true);
                    }}
                  >
                    <td className="px-6 py-4 font-mono text-xs text-red-400">{entry.originalJobId.substring(0, 8)}...</td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-400">{entry.queue?.name || 'payments-queue'}</td>
                    <td className="px-6 py-4 text-xs truncate max-w-xs text-gray-300">{entry.failureReason}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-400">{entry.attempts} attempts</td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            if (confirm('Retry this job? This will reset retry count and schedule it immediately.')) {
                              retryMutation.mutate(entry.id);
                            }
                          }}
                          className="p-1.5 bg-green-950/20 hover:bg-green-900/30 border border-green-900/30 text-green-400 rounded-lg"
                          title="Retry Job"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Permanently delete this failed job from DLQ and database?')) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          className="p-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 rounded-lg"
                          title="Delete Job"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DLQ INSPECT SIDE-DRAWER */}
      {showDrawer && selectedEntry && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-darkCard border-l border-darkBorder shadow-2xl z-40 flex flex-col justify-between animate-slide-in select-none">
          {/* Header */}
          <div className="h-16 border-b border-darkBorder px-6 flex items-center justify-between bg-darkCard/90 backdrop-blur">
            <div className="flex items-center gap-3">
              <Skull size={18} className="text-red-400 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-gray-200">DLQ Diagnostics</h3>
                <p className="text-[10px] text-gray-500 font-semibold font-mono">Job: {selectedEntry.originalJobId.substring(0, 18)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1 hover:bg-darkBorder/40 rounded-lg text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Stats */}
            <div className="bg-red-950/10 border border-red-500/10 p-4 rounded-2xl space-y-2">
              <div className="flex gap-2 text-xs font-bold text-red-400">
                <AlertTriangle size={16} />
                <span>Permanent Failure Details</span>
              </div>
              <p className="text-xs font-bold text-gray-200">{selectedEntry.failureReason}</p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase">Failed at: {new Date(selectedEntry.createdAt).toLocaleString()}</p>
            </div>

            {/* Payload JSON Inspector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <FileCode size={14} className="text-neonCyan" />
                <span>Job Payload (JSON)</span>
              </div>
              <pre className="bg-darkBg p-4 rounded-xl border border-darkBorder font-mono text-[11px] text-neonCyan overflow-x-auto max-h-48">
                {JSON.stringify(selectedEntry.payload, null, 2)}
              </pre>
            </div>

            {/* Error Stack Trace */}
            {selectedEntry.stackTrace && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Error Stack Trace</span>
                <pre className="bg-darkBg border border-darkBorder rounded-xl p-4 font-mono text-[10px] text-red-400 overflow-x-auto max-h-64 whitespace-pre">
                  {selectedEntry.stackTrace}
                </pre>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-darkBorder flex gap-3 bg-darkCard/80 backdrop-blur">
            <button
              onClick={() => {
                if (confirm('Re-queue this job now?')) {
                  retryMutation.mutate(selectedEntry.id);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-green-500/20"
            >
              <Play size={12} />
              Re-queue Job
            </button>
            <button
              onClick={() => {
                if (confirm('Permanently delete?')) {
                  deleteMutation.mutate(selectedEntry.id);
                }
              }}
              className="px-4 py-2.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 rounded-xl text-xs font-semibold"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DLQ;
