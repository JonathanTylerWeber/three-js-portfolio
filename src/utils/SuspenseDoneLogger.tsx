import { useEffect } from "react";

export default function SuspenseDoneLogger({
  onDone = () => console.log("✅  Suspense resolved: all assets loaded"),
}: {
  onDone?: () => void;
}) {
  // React18 Strict‑mode runs effects twice in dev
  useEffect(() => onDone(), [onDone]);
  return null;
}
