import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useLogin } from '../hooks/useLogin';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useLogin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/conversations');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
        <input 
          type="email" 
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
          className={`w-full bg-slate-950/50 border ${error ? 'border-red-500/50' : 'border-slate-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all hover:bg-slate-800/50 focus:bg-slate-950/50`}
          placeholder="you@company.com"
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-slate-400">Password</label>
          <a href="#" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">Forgot Password?</a>
        </div>
        <input 
          type="password" 
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          className={`w-full bg-slate-950/50 border ${error ? 'border-red-500/50' : 'border-slate-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all hover:bg-slate-800/50 focus:bg-slate-950/50`}
          placeholder="••••••••"
        />
      </div>
      
      <motion.button 
        type="submit" 
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-medium py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin text-white" size={20} /> : 'Sign In'}
      </motion.button>
      
      <div className="text-center mt-6">
        <p className="text-sm text-slate-400">
          Don't have an account? <a href="#" className="text-orange-400 hover:text-orange-300">Create Account</a>
        </p>
      </div>
    </form>
  );
};
