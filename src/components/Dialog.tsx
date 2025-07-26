import { useState } from "react";

interface DialogProps {
  characterName: string;
  dialogue: string[];
  onClose?: () => void;
}

export default function Dialog({
  characterName,
  dialogue,
  onClose,
}: DialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < dialogue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 mb-20 pointer-events-none">
      <div className="relative max-w-2xl w-full pointer-events-auto">
        {/* Name tag */}
        <div className="flex justify-start mb-2">
          <div className="bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium">
            {characterName}
          </div>
        </div>

        {/* Main dialogue box */}
        <div
          className="relative bg-amber-50 border-4 border-amber-100 rounded-3xl p-6 shadow-lg cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={handleNext}
        >
          {/* Dialogue text */}
          <div className="text-amber-900 text-lg leading-relaxed font-medium">
            {dialogue[currentIndex]}
          </div>

          {/* Continue indicator */}
          <div className="absolute bottom-3 right-4 text-amber-700 text-sm animate-pulse">
            click ▼
          </div>
        </div>
      </div>
    </div>
  );
}
