import React from 'react';
import { motion } from 'framer-motion';
import { AltzorLogo } from '../../../components/shared/AltzorLogo';

export const AuthLayout = ({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}): React.JSX.Element => {
  return (
    <div className="min-h-screen bg-white flex overflow-hidden font-sans">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-slate-50 border-r border-slate-100 flex-col justify-between p-12 relative overflow-hidden">
        {/* Soft gradient mesh background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(99,102,241,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(79,70,229,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Decorative grid lines */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative">
          <AltzorLogo className="text-2xl mb-12" />
          <h1 className="text-3xl font-bold text-slate-900 mb-4 leading-snug">
            AI-powered analytics,
            <br />
            built for enterprise.
          </h1>
          <p className="text-slate-500 text-base leading-relaxed max-w-sm">
            Ask questions in plain English. Get SQL, charts, and insights in seconds — all connected
            to your real data.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative space-y-4">
          {[
            'Natural language to SQL, powered by Gemini',
            'Multi-source connections — Postgres, Snowflake, BigQuery',
            'Embeddable dashboards with full white-labeling',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5l2 2 4-4"
                    stroke="#4F46E5"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-sm text-slate-600">{feature}</span>
            </div>
          ))}
        </div>

        {/* Bottom footnote */}
        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} Altzor Analytics. Trusted by data teams worldwide.
        </p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <AltzorLogo className="text-2xl" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
};
