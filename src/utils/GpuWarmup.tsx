// utils/GpuWarmup.tsx ---------------------------------------------------
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export default function GpuWarmup({ onDone }: { onDone: () => void }) {
  const { gl, size, scene, camera } = useThree();
  const frames = useRef(0);

  useFrame(() => {
    // tiny 1×1 render – uploads textures, buffers, UBOs
    gl.setScissorTest(true);
    gl.setScissor(0, 0, 1, 1);
    gl.setViewport(0, 0, 1, 1);
    gl.render(scene, camera);

    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);

    if (++frames.current >= 2) onDone(); // done after 2 frames
  }, 1); // run on the very first rAF
  return null;
}
