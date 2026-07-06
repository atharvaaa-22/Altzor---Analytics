import type React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className }: SpinnerProps): React.JSX.Element {
  return <Loader2 size={size} className={clsx('animate-spin text-indigo-600', className)} />;
}

export function PageSpinner(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-full w-full py-24">
      <Spinner size={28} />
    </div>
  );
}
