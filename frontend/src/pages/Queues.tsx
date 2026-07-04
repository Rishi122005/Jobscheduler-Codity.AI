import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../App';
import api from '../services/api';
import {
  Layers,
  Pause,
  Play,
  Trash2,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';

export const Queues: React.FC = () => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [concurrencyLimit, setConcurrencyLimit] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Fetch queues list
  const { data: queuesRes, isLoading } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => api.queue.list(activeProject!.id),
    enabled: !!activeProject?.id,
  });

  // Create Queue Mutation
  const createQueueMutation = useMutation({
    mutationFn: (newQueue: any) => api.queue.create(newQueue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setConcurrencyLimit(1);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create queue.');
    },
  });

  // Pause Queue Mutation
  const pauseMutation = useMutation({
    mutationFn: (queueId: string) => api.queue.pause(queueId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });

  // Resume Queue Mutation
  const resumeMutation = useMutation({
    mutationFn: (queueId: string) => api.queue.resume(queueId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });

  // Delete Queue Mutation
  const deleteMutation = useMutation({
    mutationFn: (queueId: string) => api.queue.delete(queueId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !activeProject) return;

    createQueueMutation.mutate({
      projectId: activeProject.id,
      name: name.trim(),
      description: description.trim() || undefined,
      concurrencyLimit,
    });
  };

  if (!activeProject) return null;

  const queues = queuesRes?.data?.queues || [];

  return (
    <div className="space-y-6 animate-fade-in select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Queue Management</h2>
          <p className="text-sm text-gray-500 mt-1">Configure concurrency, limits, and control job execution queues.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-500/25 transition-colors"
        >
          <Plus size={16} />
          Create Queue
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-gray-500 font-semibold">Loading queues...</div>
      ) : queues.length === 0 ? (
        <div className="glass rounded-2xl border-darkBorder/60 p-12 text-center flex flex-col items-center">
          <Layers size={40} className="text-gray-600 mb-3" />
          <h4 className="text-sm font-bold text-gray-300">No queues configured</h4>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Create an execution queue to start scheduling background jobs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queues.map((q: any) => (
            <div key={q.id} className="glass p-6 rounded-2xl border-darkBorder/60 flex flex-col justify-between relative overflow-hidden">
              {/* Highlight accent on paused state */}
              {q.isPaused && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-yellow-500"></div>
              )}

              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-bold text-gray-100">{q.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                      q.isPaused
                        ? 'bg-yellow-950/20 text-yellow-400 border-yellow-500/20'
                        : 'bg-green-950/20 text-green-400 border-green-500/20'
                    }`}
                  >
                    {q.isPaused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>
                
                <p className="text-xs text-gray-400 mt-2 line-clamp-2 h-8 font-medium">
                  {q.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-darkBorder/40">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Concurrency Limit</span>
                    <p className="text-sm font-bold text-gray-300 mt-0.5">{q.concurrencyLimit} task(s)</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Created</span>
                    <p className="text-sm font-medium text-gray-400 mt-0.5">{new Date(q.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-darkBorder/40">
                {q.isPaused ? (
                  <button
                    onClick={() => resumeMutation.mutate(q.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-950/20 hover:bg-green-900/30 border border-green-900/30 text-green-400 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Play size={12} />
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={() => pauseMutation.mutate(q.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-yellow-950/20 hover:bg-yellow-900/30 border border-yellow-900/30 text-yellow-400 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Pause size={12} />
                    Pause
                  </button>
                )}

                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this queue? This action will cascade delete all jobs.')) {
                      deleteMutation.mutate(q.id);
                    }
                  }}
                  className="p-2 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 hover:border-red-900/50 text-red-400 rounded-xl transition-colors"
                  title="Delete Queue"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE QUEUE DIALOG */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-darkCard border border-darkBorder p-6 rounded-2xl w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-100">Create Queue</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 py-2.5 px-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2 font-medium">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Queue Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-600 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-white transition-colors"
                  placeholder="e.g. transactional-emails"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-600 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-white transition-colors h-20 resize-none"
                  placeholder="Describe what jobs are handled in this queue..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Concurrency Limit</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={concurrencyLimit}
                  onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
                  className="w-full bg-darkBg border border-darkBorder hover:border-gray-600 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-white"
                />
                <p className="text-[10px] text-gray-500 mt-1 font-semibold">Maximum concurrent tasks processed by workers in this queue.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-darkBorder/40 hover:bg-darkBorder/60 text-gray-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createQueueMutation.isPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/25 transition-colors"
              >
                {createQueueMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Queues;
