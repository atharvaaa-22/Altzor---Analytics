import React from 'react';
import { motion } from 'framer-motion';

export const AuthLayout = ({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Orbs */}
      <div className="absolute w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[120px] top-1/4 left-1/4 animate-pulse"></div>
      <div className="absolute w-[400px] h-[400px] bg-orange-600/20 rounded-full blur-[100px] bottom-1/4 right-1/4 animate-pulse delay-1000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10 sm:border-slate-800 sm:rounded-2xl max-sm:border-none max-sm:rounded-none max-sm:h-screen max-sm:w-screen max-sm:flex max-sm:flex-col max-sm:justify-center"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-slate-50 tracking-tight mb-2">{title}</h2>
          <p className="text-slate-400 text-sm">{subtitle}</p>
        </div>

        {children}

      </motion.div>
    </div>
  );
};
