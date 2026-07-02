import React from 'react';

export const AltzorLogo = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center font-bold tracking-tight ${className}`}>
    <span className="text-white">altz</span>
    <div className="relative inline-flex items-center justify-center w-5 h-6 mx-0.5 mt-1">
      {/* The 'o' letter */}
      <span className="text-white absolute">o</span>
      
      {/* The orange dots hovering above */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4">
        {/* SVG matching the second image: a constellation of orange dots */}
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_2px_rgba(255,102,0,0.8)]">
          <circle cx="12" cy="4" r="3" fill="#ff6600" />
          <circle cx="6" cy="14" r="2.5" fill="#ff6600" />
          <circle cx="18" cy="14" r="2.5" fill="#ff6600" />
          <circle cx="9" cy="20" r="2" fill="#ff6600" />
          <circle cx="15" cy="20" r="2" fill="#ff6600" />
          <path d="M11 6L7 12" stroke="#ff6600" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 6L17 12" stroke="#ff6600" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
    <span className="text-white">r</span>
  </div>
);
