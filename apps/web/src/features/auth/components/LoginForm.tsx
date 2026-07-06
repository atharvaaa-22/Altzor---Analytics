import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../hooks/useLogin';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export const LoginForm = (): React.JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, loading, error } = useLogin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const success = await login(email, password);

    if (success) {
      void navigate('/dashboards', { replace: true });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-5"
    >
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <svg
            className="w-4 h-4 mt-0.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>

          {error}
        </div>
      )}

      <Input
        label="Email address"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        placeholder="you@company.com"
        autoComplete="email"
      />

      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <button
          type="button"
          onClick={() => {
            setShowPassword((current) => !current);
          }}
          className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        <div className="flex justify-end mt-1.5">
          <a
            href="#"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Forgot password?
          </a>
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
        Sign in to Altzor
      </Button>

      <div className="relative flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 shrink-0">Demo credentials</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <button
          type="button"
          onClick={() => {
            setEmail('admin@acme.com');
            setPassword('Admin@123456');
          }}
          className="px-3 py-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-slate-600 hover:text-indigo-700 transition-all text-left"
        >
          <div className="font-medium">Super Admin</div>
          <div className="text-slate-400 truncate">admin@acme.com</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setEmail('analyst@acme.com');
            setPassword('Analyst@123456');
          }}
          className="px-3 py-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-slate-600 hover:text-indigo-700 transition-all text-left"
        >
          <div className="font-medium">Analyst</div>
          <div className="text-slate-400 truncate">analyst@acme.com</div>
        </button>
      </div>
    </form>
  );
};
