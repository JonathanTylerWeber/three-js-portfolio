/* CharacterController.tsx
   ───────────────────────────────────────────────────────────────────────────
   • Cursor vector (screen-center → pointer):
       - length < radius → WALK|≥ radius → RUN
   • Bob is a **dynamic** Rapier RigidBody with a capsule collider:
       - We drive it by setting its *linear velocity* each frame
         (no teleporting ⇒ proper collision response).
       - Rotations are locked so the mesh stays upright.
       - A bit of linear damping makes him stop quickly when you release input.
   • Camera keeps the yaw/pitch from the first lookAt() and slides to
     Bob.position + (camX, camY, camZ) every frame.
   • Ready for future upgrade to Rapier’s CharacterController
     (see “Stair stepping” comment near the end).
*/

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import * as THREE from "three";
import {
  RigidBody,
  CapsuleCollider,
  type RapierRigidBody,
} from "@react-three/rapier";

import { PlayerHandle } from "./PlayerModel";
import {
  grassRun,
  grassWalk,
  stoneRun,
  stoneWalk,
} from "../utils/audioManager";
import PlayerModel from "./PlayerModel";
import { useImageData } from "../utils/useImageData";

export default function PlayerController() {
  // TODO: add spawn and size props for using in other canvases
  /* ─── Leva sliders ──────────────────────────────────────────────── */
  const { walkSpeed, runSpeed } = useControls("Movement", {
    walkSpeed: { value: 4, min: 0.2, max: 20, step: 0.1 },
    runSpeed: { value: 8, min: 0.5, max: 30, step: 0.1 },
  });

  const { radius } = useControls("HUD", {
    radius: { value: 180, min: 20, max: 500, step: 1 },
  });

  const { camX, camY, camZ } = useControls("Camera", {
    camX: { value: 0, min: -200, max: 200, step: 0.1 },
    camY: { value: 12, min: -200, max: 200, step: 0.1 },
    camZ: { value: 17, min: -200, max: 200, step: 0.1 },
  });

  /* ─── refs & state ──────────────────────────────────────────────── */
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const meshGroup = useRef<THREE.Group>(null!); // for rotation only
  const playerHandle = useRef<PlayerHandle>(null);

  const isDown = useRef(false);
  const screenVec = useRef(new THREE.Vector2());

  type MoveState = "Idle" | "Walk" | "Run";
  const state = useRef<MoveState>("Idle");

  const { camera, size, gl } = useThree();
  const frozenQuat = useRef(new THREE.Quaternion());

  /* ─── stone-mask loading ────────────────────────────────────────── */
  const stoneMask = useImageData("/masks/stone-mask2.jpg");

  /* ─── mask sampling helper ──────────────────────────────────────── */
  const MASK_SIZE = 150;
  const OFFSET_X = 0.6;
  const OFFSET_Z = 4.2;
  function sampleStone(x: number, z: number) {
    if (!stoneMask) return 0;
    const { width, height, data } = stoneMask;
    const u = (x - OFFSET_X) / MASK_SIZE + 0.5;
    const v = (z - OFFSET_Z) / MASK_SIZE + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const ix = Math.floor(u * (width - 1));
    const iz = Math.floor(v * (height - 1));
    return data[(iz * width + ix) * 4] / 255;
  }

  /* ─── spawn & camera freeze ─────────────────────────────────────── */
  useEffect(() => {
    const spawn = { x: 0, y: 0, z: -47 };
    bodyRef.current?.setTranslation(spawn, true);

    camera.position.set(spawn.x, spawn.y + 3, spawn.z + 6);
    camera.lookAt(spawn.x, spawn.y, spawn.z);
    frozenQuat.current.copy(camera.quaternion);
  }, [camera]);

  /* ─── pointer listeners (canvas only) ───────────────────────────── */
  useEffect(() => {
    const canvas = gl.domElement;

    const down = (e: PointerEvent) => {
      isDown.current = true;
      move(e);
    };
    const up = () => {
      isDown.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!isDown.current) return;
      screenVec.current.set(
        e.clientX - size.width * 0.5,
        e.clientY - size.height * 0.5
      );
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl, size]);

  /* ─── main loop ─────────────────────────────────────────────────── */
  useFrame(() => {
    if (!bodyRef.current) return;

    /* current world position */
    const pos = bodyRef.current.translation();

    /* 1 — decide walk/run & movement vector ------------------------- */
    let desired: typeof state.current = "Idle";
    let speed = 0;
    const dir = new THREE.Vector3();

    if (isDown.current) {
      const v = screenVec.current;
      const len = v.length();
      if (len > 2) {
        desired = len >= radius ? "Run" : "Walk";
        speed = desired === "Run" ? runSpeed : walkSpeed;

        const right = new THREE.Vector3(1, 0, 0)
          .applyQuaternion(camera.quaternion)
          .setY(0)
          .normalize();
        const forward = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .setY(0)
          .normalize();
        dir
          .copy(right.multiplyScalar(v.x).add(forward.multiplyScalar(-v.y)))
          .normalize();
      }
    }

    /* 2 — animation swap if needed ---------------------------------- */
    if (desired !== state.current) {
      state.current = desired;
      playerHandle.current?.setAnimation(desired);
    }

    // audio
    const onStone = sampleStone(pos.x, pos.z) < 0.5;

    if (grassWalk && grassRun && stoneWalk && stoneRun) {
      if (desired === "Run") {
        if (onStone) {
          stoneWalk.pause();
          stoneRun.play();
          grassWalk.pause();
          grassRun.pause();
        } else {
          stoneWalk.pause();
          stoneRun.pause();
          grassWalk.pause();
          grassRun.play();
        }
      } else if (desired === "Walk") {
        if (onStone) {
          stoneWalk.play();
          stoneRun.pause();
          grassWalk.pause();
          grassRun.pause();
        } else {
          stoneWalk.pause();
          stoneRun.pause();
          grassWalk.play();
          grassRun.pause();
        }
      } else {
        stoneWalk.pause();
        stoneRun.pause();
        grassWalk.pause();
        grassRun.pause();
      }
    }

    /* 3 — set linear velocity & rotate mesh ------------------------- */
    const currentVel = bodyRef.current.linvel(); //preserve y velocity to fall
    if (speed > 0) {
      bodyRef.current.setLinvel(
        { x: dir.x * speed, y: currentVel.y, z: dir.z * speed },
        true
      );
      const targetQ = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dir
      );
      meshGroup.current.quaternion.slerp(targetQ, 0.25);
    } else {
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    /* 4 — sync meshGroup position (RB origin is [0,0,0] inside body) */
    meshGroup.current.position.set(0, 0, 0);

    /* 5 — camera follow -------------------------------------------- */
    camera.position.set(pos.x + camX, pos.y + camY, pos.z + camZ);
    camera.lookAt(pos.x, pos.y, pos.z);
  });

  /* ─── render: dynamic body + capsule collider + visual model ───── */
  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      lockRotations
      enabledRotations={[false, false, false]}
      linearDamping={8} /* quick deceleration */
    >
      {/* Simple capsule approximating Bob’s volume */}
      <CapsuleCollider args={[1.0, 0.75]} position={[0, 0, 0]} />

      <group ref={meshGroup}>
        <PlayerModel ref={playerHandle} scale={0.21} />
      </group>
    </RigidBody>
  );
}
