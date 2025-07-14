import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import World from "./components/outerWorld/World";
import CharacterController from "./components/CharacterController";
import Grass from "./components/outerWorld/Grass";
import Bugs from "./components/outerWorld/Bugs";
import { Physics } from "@react-three/rapier";
import WorldColliders from "./components/outerWorld/WorldColliders";
import Ball from "./components/outerWorld/Ball";
import { Perf } from "r3f-perf";
import { Leva } from "leva";
import PhysicsDebugger from "./utils/PhysicsDebugger";

export default function App() {
  return (
    <>
      <Leva collapsed />
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 200, position: [0, 2, 6] }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance" }}
        className="touch-none"
      >
        <Suspense fallback={null}>
          <Physics timeStep="vary" maxCcdSubsteps={1} debug>
            <PhysicsDebugger />
            <Perf position="top-left" minimal={false} deepAnalyze={false} />

            <World />
            <WorldColliders />
            <Grass fieldSize={132.88} maskSize={150} bladeCount={120_000} />
            <Bugs />
            <CharacterController />
            <Ball url="/models/ball.glb" radius={1} spawn={[-10, 1, -30]} />
          </Physics>
        </Suspense>
      </Canvas>
    </>
  );
}
