// utils/useImageData.ts
import { useState, useEffect } from "react";

export function useImageData(url: string): ImageData | null {
  const [imageData, setImageData] = useState<ImageData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const img = new Image();
    img.crossOrigin = "anonymous"; // Required for CORS-safe pixel access
    img.src = url;

    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      setImageData(data);
    };

    return () => {
      cancelled = true;
    };
  }, [url]);

  return imageData;
}
