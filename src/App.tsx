// src/App.tsx
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
  { text: "Hi I'm Jonathan, welcome to my portfolio!", clip: "wave" },
  { text: "I'm a Software Engineer and Creative Developer", clip: "talking1" },
  { text: "You can hold down to move around.", clip: "talking2" },
  {
    text: "Each building will tell you a bit more about me and my work. Explore around a bit, I hope you enjoy!",
    clip: "clap",
  },
];

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [dialogIndex, setDialogIndex] = useState(0);

  const handleSuspenseDone = useCallback(() => {
    setAssetsLoaded(true);

    // unlock & play sounds once buffers are ready
    unlockAudioContext();
    audioReady.then(() => {
      trainHorn.play(); // one-shot on suspense finish
      mainTheme.play(); // loop main theme
    });
  }, []);

  return (
    <>
      <Leva collapsed />

      {phase === "loading" && (
        <LoadingScreen
          ready={assetsLoaded}
          onFinished={() => setPhase("introMove")}
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
