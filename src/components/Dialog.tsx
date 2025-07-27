import { useEffect, useRef, useState } from "react";
import { ClipName } from "./Character";
import {
  audioReady,
  worldDialog1,
  worldDialog2,
  worldDialog3,
  worldDialog4,
} from "../utils/audioManager";

interface Entry {
  text: string;
  clip: ClipName;
}
interface DialogProps {
  entries: Entry[];
  currentIndex: number;
  onNext: () => void;
}

const TYPE_SPEED = 30; // ms per character

export default function Dialog({ entries, currentIndex, onNext }: DialogProps) {
  const entry = entries[currentIndex];
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  /* play voice + start typewriter whenever entry changes */
  useEffect(() => {
    audioReady.then(() => {
      const voiceLines = [
        worldDialog1,
        worldDialog2,
        worldDialog3,
        worldDialog4,
      ];
      voiceLines[currentIndex]?.play();
    });

    setShown("");
    setDone(false);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }

    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setShown(entry.text.slice(0, i));
      if (i >= entry.text.length) {
        clearInterval(timer.current!);
        timer.current = null;
        setDone(true);
      }
    }, TYPE_SPEED);

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [entry, currentIndex]);

  const handleClick = () => {
    if (!done) {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      setShown(entry.text);
      setDone(true);
    } else {
      onNext();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 mb-20 pointer-events-none">
      <div className="relative max-w-2xl w-full pointer-events-auto">
        <div className="flex justify-start mb-2">
          <div className="bg-slate-700 text-white px-4 py-2 rounded-full text-sm xl:text-xl font-medium">
            Jonathan
          </div>
        </div>
        <div
          className="relative bg-amber-50 border-4 border-amber-100 rounded-3xl p-6 shadow-lg cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={handleClick}
        >
          <div className="text-amber-900 text-lg xl:text-3xl leading-relaxed font-medium whitespace-pre-wrap">
            {shown}
          </div>

          {done && (
            <div className="absolute bottom-3 right-4 text-amber-700 text-sm animate-pulse">
              click ▼
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
