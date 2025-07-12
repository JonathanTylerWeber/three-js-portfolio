import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import World from "./World";
import CharacterController from "./CharacterController";
import Grass from "./Grass";
import Bugs from "./Bugs";
import { Physics } from "@react-three/rapier";
import WorldColliders from "./WorldColliders";
import Ball from "./Ball";
import { Perf } from "r3f-perf";
// import PhysicsDebugger from "./PhysicsDebugger";

export default function App() {
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 200, position: [0, 2, 6] }}
      dpr={[1, 1.5]}
      gl={{ powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <Physics timeStep="vary" maxCcdSubsteps={1}>
          {/* <PhysicsDebugger /> */}

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
  );
}
