import { useEffect, useState } from 'react';
import { Button } from './Button';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 10000,
}: UndoToastProps) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 100) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onDismiss, duration]);

  const progress = (remaining / duration) * 100;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-gray-900 text-white rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-4">
          <span className="text-sm font-medium">{message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            className="text-white hover:bg-white/20 shrink-0"
          >
            Undo
          </Button>
        </div>
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-green-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
