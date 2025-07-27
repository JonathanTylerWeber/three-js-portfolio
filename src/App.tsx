import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useCallback } from "react";
import World from "./components/outerWorld/World";
import Grass from "./components/outerWorld/Grass";
import Bugs from "./components/outerWorld/Bugs";
import { Physics } from "@react-three/rapier";
import WorldColliders from "./components/outerWorld/WorldColliders";
import Ball from "./components/outerWorld/Ball";
import { Perf } from "r3f-perf";
import { Leva } from "leva";
import Character, { ClipName } from "./components/Character";
import PlayerController from "./components/PlayerController";
import LoadingScreen from "./components/LoadingScreen";
import SuspenseDoneLogger from "./utils/SuspenseDoneLogger";
import { Preload } from "@react-three/drei";
import Dialog from "./components/Dialog";
import {
  unlockAudioContext,
  audioReady,
  trainHorn,
  mainTheme,
} from "./utils/audioManager";

type Phase = "loading" | "introMove" | "dialog" | "play";

const dialogueEntries: { text: string; clip: ClipName }[] = [
  {
    text: "You must be new here, I'm Jonathan. Welcome to my portfolio!",
    clip: "wave",
  },
  { text: "I'm a Software Engineer and Creative Developer.", clip: "talking1" },
  {
    text: "Each building will tell you a bit more about me and my work.",
    clip: "talking2",
  },
  {
    text: "You can click and drag to move around. Explore a bit, I hope you enjoy!",
    clip: "clap",
  },
];

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [dialogIndex, setDialogIndex] = useState(0);

  /** Suspense finished streaming →assets loaded */
  const handleSuspenseDone = useCallback(() => {
    setAssetsLoaded(true);
  }, []);

  /** Start‑button click →play horn immediately */
  const handleStart = useCallback(() => {
    unlockAudioContext();

    audioReady.then(() => {
      trainHorn.play();
      setTimeout(() => {
        mainTheme.play();
      }, 2000);
    });
  }, []);

  /** Wipe animation done →enter intro‑walk phase */
  const handleWipeFinished = useCallback(() => {
    setPhase("introMove");
  }, []);

  return (
    <>
      <Leva collapsed />

      {phase === "loading" && (
        <LoadingScreen
          ready={assetsLoaded}
          onStart={handleStart} // click‑time callback
          onFinished={handleWipeFinished}
        />
      )}

      {phase === "dialog" && (
        <Dialog
          entries={dialogueEntries}
          currentIndex={dialogIndex}
          onNext={() => {
            if (dialogIndex < dialogueEntries.length - 1) {
              setDialogIndex((i) => i + 1);
            } else {
              setPhase("play");
              setDialogIndex(0);
            }
          }}
        />
      )}

      <Canvas
        frameloop="demand"
        camera={{ fov: 45, near: 0.1, far: 200, position: [0, 2, 6] }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance" }}
        className="touch-none"
      >
        <Suspense fallback={null}>
          <SuspenseDoneLogger onDone={handleSuspenseDone} />
          <Preload all />

          <Physics timeStep="vary" maxCcdSubsteps={1}>
            <Perf position="top-left" minimal={false} deepAnalyze={false} />

            <World />
            <WorldColliders />

            <Character
              dialogClip={
                phase === "dialog"
                  ? dialogueEntries[dialogIndex].clip
                  : undefined
              }
            />

            <PlayerController
              intro={phase === "introMove"}
              disableInput={phase !== "play"}
              onIntroComplete={() => setPhase("dialog")}
            />

            <Grass fieldSize={132.88} maskSize={150} bladeCount={120_000} />
            <Bugs />
            <Ball url="/models/ball.glb" radius={1} spawn={[-10, 1, -30]} />
          </Physics>
        </Suspense>
      </Canvas>
    </>
  );
}
