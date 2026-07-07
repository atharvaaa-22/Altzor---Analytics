import type React from 'react';

interface AltzorLogoProps {
  className?: string;
  collapsed?: boolean;
}

export const AltzorLogo = ({
  className = '',
  collapsed = false,
}: AltzorLogoProps): React.JSX.Element => (
  <div className={`flex items-center font-bold tracking-tight ${className}`}>
    {!collapsed ? (
      <>
        <span className="text-slate-900">altz</span>
        <div className="relative inline-flex items-center justify-center w-5 h-6 mx-0.5 mt-1">
          <span className="text-slate-900 absolute">o</span>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <circle cx="12" cy="4" r="3" fill="#4F46E5" />
              <circle cx="6" cy="14" r="2.5" fill="#4F46E5" />
              <circle cx="18" cy="14" r="2.5" fill="#4F46E5" />
              <circle cx="9" cy="20" r="2" fill="#6366F1" />
              <circle cx="15" cy="20" r="2" fill="#6366F1" />
              <path d="M11 6L7 12" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
              <path d="M13 6L17 12" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <span className="text-slate-900">r</span>
      </>
    ) : (
      /* Collapsed: show just the dot constellation as icon */
      <div className="w-8 h-8 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
          <circle cx="12" cy="4" r="3" fill="#4F46E5" />
          <circle cx="6" cy="14" r="2.5" fill="#4F46E5" />
          <circle cx="18" cy="14" r="2.5" fill="#4F46E5" />
          <circle cx="9" cy="20" r="2" fill="#6366F1" />
          <circle cx="15" cy="20" r="2" fill="#6366F1" />
          <path d="M11 6L7 12" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 6L17 12" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    )}
  </div>
);
