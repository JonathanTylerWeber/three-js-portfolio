import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import World from "./components/outerWorld/World";
import Grass from "./components/outerWorld/Grass";
import Bugs from "./components/outerWorld/Bugs";
import { Physics } from "@react-three/rapier";
import WorldColliders from "./components/outerWorld/WorldColliders";
import Ball from "./components/outerWorld/Ball";
import { Perf } from "r3f-perf";
import { Leva } from "leva";
// import PhysicsDebugger from "./utils/PhysicsDebugger";
import Character from "./components/Character";
import PlayerController from "./components/PlayerController";
import LoadingScreen from "./components/LoadingScreen";
import { Html } from "@react-three/drei";
import SuspenseDoneLogger from "./utils/SuspenseDoneLogger";

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
        <Suspense
          fallback={
            <Html fullscreen position={[0, 0, 0]} className="top-0 left-0">
              <LoadingScreen />
            </Html>
          }
        >
          <SuspenseDoneLogger />
          <Physics timeStep="vary" maxCcdSubsteps={1}>
            {/* <PhysicsDebugger /> */}
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
