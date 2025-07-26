import { useEffect, useRef, useState } from "react";

interface Props {
  ready: boolean;
  durMs?: number; // wipe duration
  onStart?: () => void; // fires on click
  onFinished?: () => void; // fires after wipe ends
}

export default function LoadingScreen({
  ready,
  durMs = 3000,
  onStart,
  onFinished = () => {},
}: Props) {
  const [showStart, setShowStart] = useState(false);
  const [wipe, setWipe] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /*  Show the Start button once Suspense resolves  */
  useEffect(() => {
    if (ready) setShowStart(true);
  }, [ready]);

  /*  Trigger audio, then the wipe‑out  */
  const handleStartClick = () => {
    onStart?.();

    /* 2‑step RAF + forced reflow → guarantees a paint
       in the “big circle” state before we shrink it.  */
    requestAnimationFrame(() => {
      // force-layout -> cancels any coalesced style updates
      void wrapperRef.current?.offsetWidth;

      requestAnimationFrame(() => setWipe(true));
    });
  };

  /* vmax keeps the opening circle larger than any screen */
  const clip = wipe ? "circle(0vmax at 50% 50%)" : "circle(120vmax at 50% 50%)";

  const base =
    "fixed inset-0 z-50 flex flex-col items-center justify-center " +
    "bg-black text-white pointer-events-none";

  return (
    <div
      ref={wrapperRef}
      className={base}
      style={{
        clipPath: clip,
        WebkitClipPath: clip,
        transition: `
          clip-path         ${durMs}ms cubic-bezier(.33,0,.12,1),
          -webkit-clip-path ${durMs}ms cubic-bezier(.33,0,.12,1)
        `,
        willChange: "clip-path",
      }}
      onTransitionEnd={() => wipe && onFinished()}
    >
      {/* Logo */}
      <img
        className="h-64 w-64 mb-8 pointer-events-none fixed"
        src="/images/ACLoading.png"
        alt="Loading"
      />

      {/* Spinner or Start button */}
      <div className="fixed mt-80">
        {!showStart ? (
          <div className="flex justify-center gap-3 pointer-events-none">
            <p className="text-3xl md:text-5xl xl:text-7xl font-fink">
              Loading
            </p>
            <div className="mt-8 flex items-end space-x-2 -translate-y-1">
              <div className="size-2 md:size-3 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
              <div className="size-2 md:size-3 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
              <div className="size-2 md:size-3 animate-bounce rounded-full bg-white" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center pointer-events-auto">
            <button
              onClick={handleStartClick}
              className="px-6 py-1 text-4xl font-fink bg-amber-50 border-4 border-amber-100 rounded-3xl p-6 shadow-lg cursor-pointer transition-transform hover:scale-[1.2] text-amber-900 leading-relaxed font-medium"
            >
              Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
