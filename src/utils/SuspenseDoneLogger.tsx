// SuspenseDoneLogger.tsx
import { useEffect } from "react";

export default function SuspenseDoneLogger({
  onDone = () => console.log("✅  Suspense resolved: all assets loaded"),
}) {
  // In React18 + StrictMode this will fire twice in dev.
  // Guard with a ref if you only want to run once.
  useEffect(() => onDone(), [onDone]);
  return null; // nothing visible
}
