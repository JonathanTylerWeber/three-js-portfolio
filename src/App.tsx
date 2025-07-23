import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import World from "./components/outerWorld/World";
import Grass from "./components/outerWorld/Grass";
import Bugs from "./components/outerWorld/Bugs";
import { Physics } from "@react-three/rapier";
import WorldColliders from "./components/outerWorld/WorldColliders";
import Ball from "./components/outerWorld/Ball";
import { Perf } from "r3f-perf";
import { Leva } from "leva";
import Character from "./components/Character";
import PlayerController from "./components/PlayerController";
import LoadingScreen from "./components/LoadingScreen";
import SuspenseDoneLogger from "./utils/SuspenseDoneLogger";
import { Preload } from "@react-three/drei";
import GpuWarmup from "./utils/GpuWarmup";

export default function App() {
  /** `assetsLoaded` flips to true the moment <Suspense> settles                */
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  /** We keep the overlay mounted until the reveal animation finishes           */
  const [showLoader, setShowLoader] = useState(true);

  const [gpuReady, setGpuReady] = useState(false);

  return (
    <>
      <Leva collapsed />
      /* show overlay until textures + fps smooth */
      {showLoader && (
        <LoadingScreen
          ready={assetsLoaded && gpuReady}
          onFinished={() => setShowLoader(false)}
        />
      )}
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 200, position: [0, 2, 6] }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance" }}
        className="touch-none"
      >
        <Suspense
          fallback={null /* no extra fallback here – overlay handles it */}
        >
          <SuspenseDoneLogger onDone={() => setAssetsLoaded(true)} />

          {assetsLoaded && !gpuReady && (
            <GpuWarmup onDone={() => setGpuReady(true)} />
          )}

          <Preload all />
          <Physics timeStep="vary" maxCcdSubsteps={1}>
            <Perf position="top-left" minimal={false} deepAnalyze={false} />

            <World />
            <WorldColliders />
            <Character />
            <PlayerController />
            <Grass fieldSize={132.88} maskSize={150} bladeCount={120_000} />
            <Bugs />
            <Ball url="/models/ball.glb" radius={1} spawn={[-10, 1, -30]} />
          </Physics>
        </Suspense>
      </Canvas>
    </>
  );
}
