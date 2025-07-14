/* WorldColliders.tsx
   Drop this inside <Suspense> after the physics <RapierProvider>.
   All walls/floors are one fixed body; each entry is {pos, size} (in meters).
*/
import { memo, useMemo } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";

type Blocker = {
  pos: THREE.Vector3Tuple;
  size: THREE.Vector3Tuple;
  rot?: THREE.Vector3Tuple;
};

const BLOCKERS: Blocker[] = [
  // ground:
  { pos: [0, -0.9, 0], size: [70, 1, 70] },
  // walls:
  { pos: [0, 0.5, 70], size: [70, 1, 1] }, // front wall
  { pos: [0, 0.5, -63.7], size: [70, 1, 1] }, // back wall
  { pos: [67.6, 0.5, 0], size: [1, 1, 70] }, // right wall
  { pos: [-67.6, 0.5, 0], size: [1, 1, 70] }, // left  wall
  // buildings:
  { pos: [0.3, 0.5, -52], size: [9.0, 1, 3] }, //train
  { pos: [-32, 0.5, -20.5], size: [6.5, 1, 4.5] }, //theater
  { pos: [-33, 0.5, 32], size: [4.5, 1, 3.5] }, //post office
  { pos: [28, 0.5, 33], size: [5, 1, 3.5] }, //arcade
  { pos: [31.25, 0.5, 37], size: [1.25, 1, 1] }, //gameboy
  { pos: [-51.75, 0.5, 42], size: [1.25, 1, 1] }, //sword
  { pos: [0, 0, 6], size: [2.5, 1, 2.5] }, //shrub
  { pos: [33.5, -0.5, -22], size: [9.5, 1.65, 2] }, //museum main
  { pos: [33.6, -0.5, -18], size: [6.5, 1.45, 2] }, //museum front
  { pos: [33.6, -0.5, -15.6], size: [3.25, 1.25, 1] }, //museum big stair
  { pos: [33.6, -0.5, -14.6], size: [3.25, 1, 1] }, //museum small stair
  // benches:
  { pos: [9.75, 0, -3.5], size: [1.75, 1, 1], rot: [0, -10, 0] },
  { pos: [-9.5, 0, -4], size: [1.75, 1, 1], rot: [0, 10, 0] },
  { pos: [-12, 0, 15.5], size: [1.75, 1, 1], rot: [0, 40, 0] },
  { pos: [12, 0, 15.5], size: [1.75, 1, 1], rot: [0, -40, 0] },
  // trees:
  { pos: [-14.5, 0, -42], size: [1, 1, 1] },
  { pos: [14.2, 0, -42], size: [1, 1, 1] },
  { pos: [-14.5, 0, -17.5], size: [1, 1, 1] },
  { pos: [14.2, 0, -18], size: [1, 1, 1] },
  { pos: [-38.75, 0, -34.5], size: [1, 1, 1] },
  { pos: [-59.75, 0, -39], size: [1, 1, 1] },
  { pos: [-47.75, 0, -20], size: [1, 1, 1] },
  { pos: [-56.4, 0, 0], size: [1, 1, 1] },
  { pos: [-34.25, 0, 1], size: [1, 1, 1] },
  { pos: [-46.3, 0, 15], size: [1, 1, 1] },
  { pos: [-23.7, 0, 22.7], size: [1, 1, 1] },
  { pos: [-41.4, 0, 40], size: [1, 1, 1] },
  { pos: [-58.3, 0, 30], size: [1, 1, 1] },
  { pos: [-54.5, 0, 59], size: [1, 1, 1] },
  { pos: [-31.8, 0, 63], size: [1, 1, 1] },
  { pos: [-11.3, 0, 51], size: [1, 1, 1] },
  { pos: [-0.6, 0, 30.7], size: [1, 1, 1] },
  { pos: [5, 0, 61.2], size: [1, 1, 1] },
  { pos: [26.7, 0, 54.3], size: [1, 1, 1] },
  { pos: [53.6, 0, 63.3], size: [1, 1, 1] },
  { pos: [45.2, 0, 36.8], size: [1, 1, 1] },
  { pos: [21.2, 0, 22.6], size: [1, 1, 1] },
  { pos: [33.3, 0, 6], size: [1, 1, 1] },
  { pos: [54.3, 0, 18.2], size: [1, 1, 1] },
  { pos: [53.2, 0, -5.5], size: [1, 1, 1] },
  { pos: [47.3, 0, -25.4], size: [1, 1, 1] },
  { pos: [38.2, 0, -42], size: [1, 1, 1] },
  // lamps:
  { pos: [-4.4, 0, -34.8], size: [0.7, 1, 0.7] },
  { pos: [5, 0, -34.8], size: [0.7, 1, 0.7] },
  { pos: [-4.4, 0, -12], size: [0.7, 1, 0.7] },
  { pos: [5.3, 0, -12], size: [0.7, 1, 0.7] },
  { pos: [-26, 0, -13.8], size: [0.7, 1, 0.7] },
  { pos: [-18.4, 0, 6.8], size: [0.7, 1, 0.7] },
  { pos: [-11.3, 0, 22.8], size: [0.7, 1, 0.7] },
  { pos: [-24.7, 0, 38.1], size: [0.7, 1, 0.7] },
  { pos: [11.9, 0, 22.8], size: [0.7, 1, 0.7] },
  { pos: [20.5, 0, 38], size: [0.7, 1, 0.7] },
  { pos: [18.5, 0, 6.8], size: [0.7, 1, 0.7] },
  { pos: [27.6, 0, -13.4], size: [0.7, 1, 0.7] },
];

const WorldColliders = memo(function WorldColliders() {
  const colliders = useMemo(
    () =>
      BLOCKERS.map((b, i) => (
        <CuboidCollider
          key={i}
          args={b.size}
          position={b.pos}
          rotation={b.rot}
        />
      )),
    []
  );

  return (
    <RigidBody type="fixed" colliders={false}>
      {colliders}
    </RigidBody>
  );
});

export default WorldColliders;
