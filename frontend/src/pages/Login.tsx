import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { KeyRound, Mail, AlertTriangle, Cpu, Terminal } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid authorization credentials. Check local mock settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg bg-mesh flex items-center justify-center p-4 relative overflow-hidden select-none font-jakarta">
      {/* Sci-fi floating ambient light sources */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-purple-600/10 to-transparent blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-cyan-500/8 to-transparent blur-[160px] pointer-events-none"></div>
      
      {/* Decorative cyber grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="w-full max-w-lg glass p-10 rounded-[32px] z-10 shadow-2xl relative border-white/5 overflow-hidden">
        {/* Glow border ring */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-cyan-500 opacity-60"></div>
        
        <div className="text-center mb-8 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-neonPurple to-neonCyan flex items-center justify-center font-bold text-white shadow-xl shadow-purple-500/20 mx-auto mb-5 text-2xl relative border border-white/10">
            <Cpu size={24} className="text-white animate-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-tr from-neonPurple to-neonCyan rounded-2xl blur-md opacity-30 -z-10"></div>
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-100 tracking-tight font-display bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            Access Control Portal
          </h2>
          <p className="text-[10px] text-neonPurple font-bold tracking-widest uppercase mt-2.5 flex items-center justify-center gap-1.5 font-display">
            <Terminal size={10} /> Distributed Scheduler Engine
          </p>
        </div>

        {error && (
          <div className="mb-6 py-3.5 px-4 bg-red-950/20 border border-red-500/35 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-semibold animate-shake">
            <AlertTriangle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest font-display">Identity Email</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 group-focus-within:text-purple-400 transition-colors">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-darkCard border border-white/5 hover:border-white/10 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none text-white transition-all duration-300 placeholder:text-gray-600"
                placeholder="identity@scheduler.net"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest font-display">Security Key</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 group-focus-within:text-purple-400 transition-colors">
                <KeyRound size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-darkCard border border-white/5 hover:border-white/10 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/30 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none text-white transition-all duration-300 placeholder:text-gray-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:opacity-90 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/10 text-sm mt-8 transition-all duration-300 glow-btn"
          >
            {loading ? 'Decrypting Session...' : 'Authenticate Portal'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-500 font-semibold tracking-wide">
          Register new cluster operator?{' '}
          <Link to="/register" className="text-neonPurple hover:text-purple-400 hover:underline transition-all">
            Join Node
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
