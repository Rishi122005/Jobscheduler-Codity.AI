import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Cpu, RefreshCw } from 'lucide-react';

export const Workers: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch Workers list
  const { data: workersRes, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: () => api.worker.list(),
  });

  const workers = workersRes?.data?.workers || [];

  return (
    <div className="space-y-6 animate-fade-in select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Worker Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Audit telemetry nodes, heartbeats, and cluster utilization.</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['workers'] })}
          className="p-2.5 bg-darkCard border border-darkBorder hover:bg-darkBorder/40 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-gray-500 font-semibold">Loading worker telemetry...</div>
      ) : workers.length === 0 ? (
        <div className="glass rounded-2xl border-darkBorder/60 p-12 text-center flex flex-col items-center">
          <Cpu size={40} className="text-gray-600 mb-3" />
          <h4 className="text-sm font-bold text-gray-300">No worker processes active</h4>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Start a worker process inside the `worker/` directory to claim pending queue jobs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workers.map((w: any) => (
            <div key={w.id} className="glass p-6 rounded-2xl border-darkBorder/60 flex flex-col justify-between relative overflow-hidden">
              {/* Top accent line based on worker status */}
              <div
                className={`absolute top-0 right-0 left-0 h-1 ${
                  w.status === 'BUSY'
                    ? 'bg-neonCyan animate-pulse'
                    : w.status === 'IDLE' || w.status === 'ONLINE'
                    ? 'bg-purple-500'
                    : 'bg-gray-600'
                }`}
              ></div>

              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">{w.name}</h3>
                    <p className="text-[10px] text-gray-500 font-semibold font-mono mt-0.5">{w.id.substring(0, 18)}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                      w.status === 'BUSY'
                        ? 'bg-cyan-950/20 text-neonCyan border-cyan-500/20'
                        : w.status === 'IDLE' || w.status === 'ONLINE'
                        ? 'bg-purple-950/20 text-neonPurple border-purple-500/20'
                        : 'bg-gray-950/20 text-gray-400 border-gray-600/20'
                    }`}
                  >
                    {w.status}
                  </span>
                </div>

                {/* CPU & Memory metrics load */}
                <div className="space-y-4 mt-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                      <span>CPU USAGE</span>
                      <span>{w.cpuUsage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-darkBg rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          w.status === 'OFFLINE'
                            ? 'bg-gray-600'
                            : w.cpuUsage > 80
                            ? 'bg-red-500'
                            : w.cpuUsage > 50
                            ? 'bg-yellow-500'
                            : 'bg-neonCyan'
                        }`}
                        style={{ width: `${w.cpuUsage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                      <span>MEMORY LOAD</span>
                      <span>{w.memoryUsage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-darkBg rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          w.status === 'OFFLINE'
                            ? 'bg-gray-600'
                            : w.memoryUsage > 85
                            ? 'bg-red-500'
                            : 'bg-neonCyan'
                        }`}
                        style={{ width: `${w.memoryUsage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status details footer */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-darkBorder/40">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Running Jobs</span>
                  <p className="text-xs font-bold text-gray-300 mt-0.5">{w.runningJobsCount} active</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Last Heartbeat</span>
                  <p className="text-xs font-semibold text-gray-400 mt-0.5">
                    {w.status === 'OFFLINE'
                      ? 'Offline'
                      : `${Math.max(0, Math.floor((Date.now() - new Date(w.lastSeen).getTime()) / 1000))}s ago`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Workers;
