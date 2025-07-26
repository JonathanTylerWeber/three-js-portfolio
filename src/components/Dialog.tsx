// src/components/Dialog.tsx
import { ClipName } from "./Character";

interface Entry {
  text: string;
  clip: ClipName;
}
interface DialogProps {
  entries: Entry[];
  currentIndex: number;
  onNext: () => void;
}

export default function Dialog({ entries, currentIndex, onNext }: DialogProps) {
  const entry = entries[currentIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 mb-20 pointer-events-none">
      <div className="relative max-w-2xl w-full pointer-events-auto">
        <div className="flex justify-start mb-2">
          <div className="bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium">
            Jonathan
          </div>
        </div>
        <div
          className="relative bg-amber-50 border-4 border-amber-100 rounded-3xl p-6 shadow-lg cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={onNext}
        >
          <div className="text-amber-900 text-lg leading-relaxed font-medium">
            {entry.text}
          </div>
          <div className="absolute bottom-3 right-4 text-amber-700 text-sm animate-pulse">
            click ▼
          </div>
        </div>
      </div>
    </div>
  );
}
