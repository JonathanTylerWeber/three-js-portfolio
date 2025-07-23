import { useEffect, useState } from "react";

export default function LoadingScreen({
  ready,
  onFinished = () => {},
  delayMs = 300, // wait after Suspense settles
  durMs = 3000, // you can tweak this freely now
}: {
  ready: boolean;
  onFinished?: () => void;
  delayMs?: number;
  durMs?: number;
}) {
  const [wipe, setWipe] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setWipe(true), delayMs);
    return () => clearTimeout(id);
  }, [ready, delayMs]);

  const base =
    "fixed inset-0 z-50 flex flex-col items-center justify-center " +
    "bg-black text-white pointer-events-none";

  const clip = wipe
    ? "circle(0% at 50% 50%)" // end: dot = invisible
    : "circle(150% at 50% 50%)"; // start: fully visible

  return (
    <div
      className={base}
      style={{
        clipPath: clip,
        WebkitClipPath: clip,
        transition: `clip-path ${durMs}ms cubic-bezier(.68,-0.3,.32,1.3)`,
      }}
      onTransitionEnd={() => {
        if (!wipe) return;
        // Wait two rAFs → first lets Three render, second lets browser paint.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => onFinished());
        });
      }}
    >
      <img className="h-64 w-64" src="/images/ACLoading.png" alt="" />
      <div className="flex justify-center gap-3">
        <p className="text-3xl md:text-5xl xl:text-7xl font-fink">Loading</p>
        <div className="mt-8 flex items-end space-x-2 -translate-y-1">
          <div className="size-2 md:size-3 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
          <div className="size-2 md:size-3 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
          <div className="size-2 md:size-3 animate-bounce rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}
