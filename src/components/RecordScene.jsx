import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";

const LIME = "#c7ed48";
const PAPER = "#efefeb";
const BLACK = "#1b1c1d";
const ORANGE = "#ff7022";
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

function canvasTexture(draw) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  draw(canvas.getContext("2d"), canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeSurfaceGrain(brushed = false) {
  const texture = canvasTexture((ctx) => {
    ctx.fillStyle = brushed ? "#cccccc" : "#dddddd";
    ctx.fillRect(0, 0, 1024, 1024);
    let seed = 47;
    for (let index = 0; index < (brushed ? 6000 : 26000); index += 1) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % 1024;
      seed = (seed * 16807) % 2147483647;
      const y = seed % 1024;
      ctx.fillStyle = index % 2 ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.07)";
      ctx.fillRect(
        x,
        y,
        brushed ? 24 + (seed % 160) : 1.4,
        brushed ? 0.6 : 1.4,
      );
    }
  });
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function coverArtwork(ctx, edition, artwork) {
  const ai = edition === "ai";
  ctx.fillStyle = ai ? LIME : PAPER;
  ctx.fillRect(0, 0, 1024, 1024);
  if (artwork) {
    ctx.save();
    if (!ai) ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(artwork, 0, ai ? 330 : 350, 1024, 1024);
    ctx.restore();
    ctx.fillStyle = ai ? "rgba(199,237,72,.06)" : "rgba(239,239,235,.06)";
    ctx.fillRect(0, 0, 1024, 1024);
  } else {
    ctx.save();
    ctx.translate(720, 730);
    ctx.rotate(-0.4);
    for (let index = 0; index < 28; index += 1) {
      ctx.strokeStyle = ai ? "rgba(27,29,28,.42)" : "rgba(27,29,28,.18)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 150 + index * 9, 270 + index * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = BLACK;
  ctx.textBaseline = "top";
  ctx.font = "600 23px Arial, sans-serif";
  ctx.fillText("FOR THE GREATER GOOD", 53, 49);
  ctx.textAlign = "right";
  ctx.fillText(ai ? "NEXT CONVERSATION" : "001 / SYNAPZE", 971, 49);
  ctx.textAlign = "left";
  ctx.fillRect(53, 93, 918, 2);

  if (ai) {
    ctx.font = '400 158px Anton, Impact, "Arial Narrow", sans-serif';
    ctx.fillText("THE WORK", 45, 126, 930);
    ctx.fillText("AFTER AI", 45, 281, 910);
    ctx.fillStyle = BLACK;
    ctx.fillRect(53, 540, 202, 49);
    ctx.fillStyle = LIME;
    ctx.font = "600 24px Arial, sans-serif";
    ctx.fillText("UPCOMING", 71, 552);
  } else {
    ctx.font = '400 98px Anton, Impact, "Arial Narrow", sans-serif';
    ctx.fillText("CONVERSATIONS", 47, 128, 930);
    ctx.font = '400 155px Anton, Impact, "Arial Narrow", sans-serif';
    ctx.fillText("FOR THE", 44, 229, 895);
    ctx.fillText("GREATER", 44, 379, 930);
    ctx.fillText("GOOD", 44, 529, 830);
  }

  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 924, 1024, 100);
  ctx.fillStyle = ai ? LIME : PAPER;
  ctx.font = "500 23px Arial, sans-serif";
  ctx.fillText(
    ai ? "WHAT COMES AFTER THE WAY WE WORK?" : "THE FIRST CONVERSATION",
    53,
    962,
  );
  ctx.textAlign = "right";
  ctx.fillText(ai ? "FTGG / NEXT" : "SYNAPZE / 2026", 971, 962);
  ctx.textAlign = "left";

  // A restrained paper grain keeps the printed surfaces from looking backlit.
  let seed = 31;
  for (let index = 0; index < 9500; index += 1) {
    seed = (seed * 16807) % 2147483647;
    const x = seed % 1024;
    seed = (seed * 16807) % 2147483647;
    const y = seed % 1024;
    ctx.fillStyle = index % 2 ? "rgba(255,255,255,.075)" : "rgba(0,0,0,.045)";
    ctx.fillRect(x, y, 1.5, 1.5);
  }
}

function useCoverTexture(edition) {
  const texture = useMemo(
    () => canvasTexture((ctx) => coverArtwork(ctx, edition)),
    [edition],
  );
  useEffect(() => {
    let active = true;
    const artwork = new Image();
    const redraw = () => {
      if (!active) return;
      coverArtwork(
        texture.image.getContext("2d"),
        edition,
        artwork.complete && artwork.naturalWidth ? artwork : null,
      );
      texture.needsUpdate = true;
    };
    artwork.onload = redraw;
    artwork.src = `/assets/art-${edition}.png`;
    document.fonts?.ready.then(redraw);
    return () => {
      active = false;
      texture.dispose();
    };
  }, [edition, texture]);
  return texture;
}

function makeLabel(edition) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = edition === "ai" ? LIME : PAPER;
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = BLACK;
    ctx.textAlign = "center";
    ctx.font = "700 38px Arial, sans-serif";
    ctx.fillText("FOR THE GREATER GOOD", 512, 250);
    ctx.font = '900 116px Impact, "Arial Narrow", sans-serif';
    ctx.fillText(edition === "ai" ? "THE WORK" : "THE FIRST", 512, 370);
    ctx.fillText(edition === "ai" ? "AFTER AI" : "CONVERSATION", 512, 476, 790);
    ctx.font = "500 30px Arial, sans-serif";
    ctx.fillText("PEOPLE. PERSPECTIVES. POSSIBILITY.", 512, 720);
    ctx.font = "500 28px Arial, sans-serif";
    ctx.fillText(
      edition === "ai"
        ? "FTGG NEXT      SIDE A       33 RPM"
        : "FTGG 001       SIDE A       33 RPM",
      512,
      785,
    );
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(512, 512, 450, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function makeGrooves() {
  return canvasTexture((ctx) => {
    ctx.fillStyle = "#18191b";
    ctx.fillRect(0, 0, 1024, 1024);
    const sheen = ctx.createConicGradient(0.3, 512, 512);
    sheen.addColorStop(0, "#17181a");
    sheen.addColorStop(0.14, "#383a3d");
    sheen.addColorStop(0.29, "#18191b");
    sheen.addColorStop(0.5, "#101113");
    sheen.addColorStop(0.68, "#3d3f42");
    sheen.addColorStop(0.79, "#202225");
    sheen.addColorStop(1, "#17181a");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let radius = 183; radius < 500; radius += 2.7) {
      ctx.beginPath();
      ctx.arc(512, 512, radius, 0, Math.PI * 2);
      ctx.strokeStyle =
        Math.round(radius) % 4 ? "rgba(0,0,0,.42)" : "rgba(228,230,234,.12)";
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    [218, 303, 391, 459].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(512, 512, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,.55)";
      ctx.lineWidth = 4;
      ctx.stroke();
    });
  });
}

function Vinyl({
  edition = "intro",
  radius = 1,
  spinning = false,
  paused = false,
  reducedMotion = false,
}) {
  const group = useRef();
  const grooves = useMemo(makeGrooves, []);
  const label = useMemo(() => makeLabel(edition), [edition]);
  useEffect(() => () => grooves.dispose(), [grooves]);
  useEffect(() => () => label.dispose(), [label]);
  useFrame((_, dt) => {
    if (!group.current) return;
    if (spinning && !paused && !reducedMotion)
      group.current.rotation.y -= Math.min(dt, 0.05) * 0.85;
    else if (!spinning) {
      const angle = Math.atan2(
        Math.sin(group.current.rotation.y),
        Math.cos(group.current.rotation.y),
      );
      group.current.rotation.y -=
        angle * (reducedMotion ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 12));
    }
  });
  return (
    <group ref={group} scale={radius}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 0.033, 96]} />
        <meshStandardMaterial
          color="#101113"
          metalness={0.16}
          roughness={0.3}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, 0]}
        receiveShadow
      >
        <ringGeometry args={[0.018, 0.994, 128]} />
        <meshPhysicalMaterial
          map={grooves}
          metalness={0.12}
          roughness={0.34}
          clearcoat={0.85}
          clearcoatRoughness={0.23}
          envMapIntensity={0.7}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.025, 0.345, 80]} />
        <meshStandardMaterial map={label} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Sleeve({
  edition,
  position,
  rotation,
  scale = 1,
  visible = true,
  interactive = true,
  showRecord = true,
  onSelect,
  reducedMotion,
  objectRef,
}) {
  const localGroup = useRef();
  const group = objectRef || localGroup;
  const record = useRef();
  const initialTransform = useRef({
    position: [...position],
    rotation: [...rotation],
    scale: visible ? scale : 0.001,
  });
  const [hovered, setHovered] = useState(false);
  const cover = useCoverTexture(edition);
  const paperGrain = useMemo(() => makeSurfaceGrain(), []);
  useEffect(() => () => paperGrain.dispose(), [paperGrain]);
  useEffect(() => {
    if (hovered) document.body.style.cursor = "pointer";
    return () => {
      if (hovered) document.body.style.cursor = "";
    };
  }, [hovered]);
  useEffect(() => {
    if (!visible || !interactive) setHovered(false);
  }, [visible, interactive]);
  useFrame((_, dt) => {
    if (!group.current) return;
    const speed = reducedMotion ? 1 : 1 - Math.exp(-dt * 8);
    group.current.position.x = lerp(
      group.current.position.x,
      position[0],
      speed,
    );
    group.current.position.y = lerp(
      group.current.position.y,
      position[1] + (hovered ? 0.085 : 0),
      speed,
    );
    group.current.position.z = lerp(
      group.current.position.z,
      position[2] + (hovered ? 0.13 : 0),
      speed,
    );
    group.current.rotation.x = lerp(
      group.current.rotation.x,
      rotation[0],
      speed,
    );
    group.current.rotation.y = lerp(
      group.current.rotation.y,
      rotation[1] + (hovered ? -0.035 : 0),
      speed,
    );
    group.current.rotation.z = lerp(
      group.current.rotation.z,
      rotation[2],
      speed,
    );
    group.current.scale.setScalar(
      lerp(group.current.scale.x, visible ? scale : 0.001, speed),
    );
    if (record.current)
      record.current.position.x = lerp(
        record.current.position.x,
        hovered ? 0.67 : 0.43,
        speed,
      );
  });
  return (
    <group
      ref={group}
      position={initialTransform.current.position}
      rotation={initialTransform.current.rotation}
      scale={initialTransform.current.scale}
      onClick={(event) => {
        if (!visible || !interactive) return;
        event.stopPropagation();
        onSelect?.(edition);
      }}
      onPointerOver={(event) => {
        if (!visible || !interactive) return;
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group
        ref={record}
        name="sleeve-record"
        visible={showRecord}
        position={[0.43, 0, -0.065]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <Vinyl edition={edition} radius={1.2} />
      </group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.53, 2.53, 0.062]} />
        <meshStandardMaterial
          color={edition === "ai" ? "#a0bd3f" : "#d6d6d2"}
          roughness={0.88}
        />
      </mesh>
      <mesh position={[0, 0, 0.033]} castShadow receiveShadow>
        <planeGeometry args={[2.525, 2.525]} />
        <meshStandardMaterial
          map={cover}
          roughness={0.96}
          roughnessMap={paperGrain}
          bumpMap={paperGrain}
          bumpScale={0.003}
          envMapIntensity={0.45}
        />
      </mesh>
      <mesh position={[-1.254, 0, 0.037]}>
        <planeGeometry args={[0.008, 2.52]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function MetalRod({
  from,
  to,
  radius = 0.028,
  color = "#b1b5b9",
  roughness = 0.3,
}) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    return {
      midpoint: start.clone().add(end).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
      length: direction.length(),
    };
  }, [from.join(","), to.join(",")]);
  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={roughness}
      />
    </mesh>
  );
}

function Tonearm({ playing, progress, paused, reducedMotion }) {
  const arm = useRef();
  useFrame((_, dt) => {
    if (!arm.current) return;
    const target = playing ? -0.09 - clamp(progress, 0, 1) * 0.44 : 0.03;
    arm.current.rotation.y = lerp(
      arm.current.rotation.y,
      target,
      reducedMotion ? 1 : 1 - Math.exp(-dt * 3),
    );
    arm.current.rotation.x = lerp(
      arm.current.rotation.x,
      playing && !paused ? 0 : -0.038,
      reducedMotion ? 1 : 1 - Math.exp(-dt * 4),
    );
  });
  return (
    <group position={[1.07, 0.55, -0.84]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.12, 32]} />
        <meshStandardMaterial
          color="#37393c"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.1, 24]} />
        <meshStandardMaterial
          color="#b4b8bd"
          metalness={0.9}
          roughness={0.24}
        />
      </mesh>
      <group ref={arm} position={[0, 0.11, 0]}>
        <MetalRod from={[0, 0, -0.23]} to={[0, 0, 0.84]} />
        <MetalRod from={[0, 0, 0.84]} to={[-0.18, -0.015, 1.1]} />
        <MetalRod from={[-0.18, -0.015, 1.1]} to={[-0.34, -0.015, 1.15]} />
        <mesh
          position={[0, 0, -0.23]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.095, 0.095, 0.2, 32]} />
          <meshStandardMaterial
            color="#8b8f94"
            metalness={0.78}
            roughness={0.29}
          />
        </mesh>
        <mesh
          position={[-0.36, -0.018, 1.15]}
          rotation={[0, -Math.PI / 2, 0]}
          castShadow
        >
          <boxGeometry args={[0.12, 0.05, 0.23]} />
          <meshStandardMaterial
            color="#242629"
            roughness={0.42}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[-0.43, -0.07, 1.15]}>
          <boxGeometry args={[0.065, 0.07, 0.075]} />
          <meshStandardMaterial color={ORANGE} roughness={0.5} />
        </mesh>
        <MetalRod
          from={[-0.33, 0.02, 1.14]}
          to={[-0.32, 0.09, 1.29]}
          radius={0.012}
        />
      </group>
    </group>
  );
}

function DeckText() {
  const texture = useMemo(
    () =>
      canvasTexture((ctx) => {
        ctx.clearRect(0, 0, 1024, 1024);
        ctx.fillStyle = "#36383b";
        ctx.font = "700 70px Arial, sans-serif";
        ctx.fillText("FTGG", 20, 130);
        ctx.font = "400 24px Arial, sans-serif";
        ctx.fillText("CONVERSATIONS THAT MOVE US.", 23, 184);
      }),
    [],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0.87, 0.427, 0.49]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function Turntable({
  position,
  scale,
  edition,
  playing,
  landed,
  motion,
  progress,
  paused,
  reducedMotion,
  sourceSleeve,
  onIntroTargetReady,
}) {
  const { camera, gl } = useThree();
  const base = useRef();
  const disc = useRef();
  const initialTransform = useRef({ position: [...position], scale });
  const brushedMetal = useMemo(() => makeSurfaceGrain(true), []);
  useEffect(() => () => brushedMetal.dispose(), [brushedMetal]);
  const getIntroTarget = useMemo(() => {
    const point = new THREE.Vector3();
    return () => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!base.current || !rect.width || !rect.height) return null;
      base.current.updateWorldMatrix(true, false);
      camera.updateMatrixWorld();
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      // Project the rubber platter rim so the loader can land on the real deck.
      for (let index = 0; index < 64; index += 1) {
        const angle = (index / 64) * Math.PI * 2;
        point.set(
          -0.35 + Math.cos(angle) * 1.015,
          0.565,
          0.05 + Math.sin(angle) * 1.015,
        );
        base.current.localToWorld(point).project(camera);
        const x = rect.left + ((point.x + 1) / 2) * rect.width;
        const y = rect.top + ((1 - point.y) / 2) * rect.height;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      return { x: left, y: top, width: right - left, height: bottom - top };
    };
  }, [camera, gl]);
  useEffect(() => {
    onIntroTargetReady?.(getIntroTarget);
    return () => onIntroTargetReady?.(null);
  }, [getIntroTarget, onIntroTargetReady]);
  const flight = useMemo(
    () => ({
      point: new THREE.Vector3(),
      target: new THREE.Vector3(),
      scale: new THREE.Vector3(),
      baseScale: new THREE.Vector3(),
      rotation: new THREE.Quaternion(),
      baseRotation: new THREE.Quaternion(),
      upright: new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2,
      ),
      flat: new THREE.Quaternion(),
      landing: new THREE.Vector3(-0.35, 0.59, 0.05),
    }),
    [],
  );
  const spindleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d0d3d7",
        metalness: 0.9,
        roughness: 0.24,
      }),
    [],
  );
  useEffect(() => () => spindleMaterial.dispose(), [spindleMaterial]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    base.current.position.lerp(flight.target.set(...position), speed);
    base.current.scale.setScalar(lerp(base.current.scale.x, scale, speed));
    const time =
      motion.current.edition === edition ? motion.current.progress : 0;
    const extraction = clamp(time / 0.34, 0, 1);
    const travel = clamp((time - 0.34) / 0.66, 0, 1);
    const eased = THREE.MathUtils.smootherstep(travel, 0, 1);
    const sleeve = sourceSleeve.current;
    if (!sleeve) return;
    const sleeveRecord = sleeve.getObjectByName("sleeve-record");
    const movingRecordVisible = time > 0;
    disc.current.visible = movingRecordVisible;
    if (sleeveRecord) sleeveRecord.visible = !movingRecordVisible;
    if (!movingRecordVisible) return;

    // Follow the sleeve while both it and the deck move into the reading view.
    sleeve.updateWorldMatrix(true, false);
    base.current.updateWorldMatrix(true, false);
    const extractionEase = THREE.MathUtils.smootherstep(extraction, 0, 1);
    flight.point.set(
      (sleeveRecord?.position.x ?? 0.43) + 1.65 * extractionEase,
      0,
      -0.065,
    );
    sleeve.localToWorld(flight.point);
    base.current.worldToLocal(flight.point);
    disc.current.position.copy(flight.point).lerp(flight.landing, eased);
    disc.current.position.y += Math.sin(eased * Math.PI) * 0.48;

    sleeve.getWorldQuaternion(flight.rotation);
    base.current.getWorldQuaternion(flight.baseRotation).invert();
    flight.rotation.premultiply(flight.baseRotation).multiply(flight.upright);
    disc.current.quaternion.copy(flight.rotation).slerp(flight.flat, eased);
    sleeve.getWorldScale(flight.scale);
    base.current.getWorldScale(flight.baseScale);
    disc.current.scale.setScalar(
      lerp((flight.scale.x * 1.2) / flight.baseScale.x, 0.98, eased),
    );
  });
  const strobe = useMemo(
    () => Array.from({ length: 68 }, (_, index) => (index * Math.PI * 2) / 68),
    [],
  );
  return (
    <group
      ref={base}
      position={initialTransform.current.position}
      scale={initialTransform.current.scale}
    >
      {[-1.2, 1.2].map((x) =>
        [-0.89, 0.89].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.015, z]} castShadow>
            <cylinderGeometry args={[0.16, 0.145, 0.12, 24]} />
            <meshStandardMaterial
              color="#232427"
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>
        )),
      )}
      <RoundedBox
        args={[3.22, 0.21, 2.47]}
        radius={0.075}
        smoothness={4}
        position={[0, 0.17, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#303236"
          roughness={0.53}
          metalness={0.34}
        />
      </RoundedBox>
      <RoundedBox
        args={[3.26, 0.22, 2.51]}
        radius={0.06}
        smoothness={4}
        position={[0, 0.32, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#bfc2c6"
          roughness={0.48}
          roughnessMap={brushedMetal}
          bumpMap={brushedMetal}
          bumpScale={0.0012}
          metalness={0.8}
          clearcoat={0.12}
          clearcoatRoughness={0.42}
        />
      </RoundedBox>
      <mesh position={[-0.35, 0.464, 0.05]} castShadow receiveShadow>
        <cylinderGeometry args={[1.075, 1.075, 0.07, 96]} />
        <meshStandardMaterial
          color="#27292c"
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[-0.35, 0.506, 0.05]} castShadow receiveShadow>
        <cylinderGeometry args={[1.066, 1.066, 0.045, 96]} />
        <meshStandardMaterial
          color="#c1c5ca"
          metalness={0.85}
          roughness={0.24}
        />
      </mesh>
      {strobe.map((angle) => (
        <mesh
          key={angle}
          position={[
            -0.35 + Math.cos(angle) * 1.062,
            0.507,
            0.05 + Math.sin(angle) * 1.062,
          ]}
          rotation={[0, -angle, 0]}
        >
          <boxGeometry args={[0.016, 0.022, 0.028]} />
          <meshStandardMaterial color="#34363a" roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[-0.35, 0.542, 0.05]} receiveShadow>
        <cylinderGeometry args={[1.015, 1.015, 0.035, 96]} />
        <meshStandardMaterial
          color="#25272a"
          metalness={0.04}
          roughness={0.95}
        />
      </mesh>
      {[0.4, 0.58, 0.75, 0.9].map((radius) => (
        <mesh
          key={radius}
          position={[-0.35, 0.563, 0.05]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[radius, 0.006, 5, 80]} />
          <meshStandardMaterial color="#484b50" roughness={0.8} />
        </mesh>
      ))}
      <mesh
        position={[-0.35, 0.611, 0.05]}
        material={spindleMaterial}
        castShadow
      >
        <cylinderGeometry args={[0.032, 0.035, 0.14, 24]} />
      </mesh>
      <group ref={disc} visible={playing} position={[-0.35, 0.59, 0.05]}>
        <Vinyl
          edition={edition}
          spinning={landed}
          paused={paused}
          reducedMotion={reducedMotion}
        />
      </group>
      <Tonearm
        playing={landed && playing}
        progress={progress}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <mesh position={[-1.32, 0.46, 0.94]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 32]} />
        <meshStandardMaterial
          color="#d8dce1"
          metalness={0.8}
          roughness={0.27}
        />
      </mesh>
      <mesh position={[-1.32, 0.505, 0.94]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.045, 0.055, 28]} />
        <meshStandardMaterial color="#484b50" />
      </mesh>
      <mesh position={[-1.1, 0.439, 0.94]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.027, 20]} />
        <meshBasicMaterial
          color={playing ? ORANGE : "#925439"}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[1.19, 0.439, 0.53]}>
        <boxGeometry args={[0.024, 0.009, 0.75]} />
        <meshStandardMaterial color="#686d74" roughness={0.5} />
      </mesh>
      <mesh position={[1.19, 0.467, 0.51]} castShadow>
        <boxGeometry args={[0.14, 0.05, 0.08]} />
        <meshStandardMaterial color="#d2d6dc" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 1.48, 0.432, -1.08]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.024, 16]} />
          <meshStandardMaterial
            color="#555b63"
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      ))}
      <DeckText />
    </group>
  );
}

function useRecordPresentation({
  mode,
  edition,
  reducedMotion,
  onPresentedEdition,
  onRecordReturned,
}) {
  const requested = mode === "edition" ? edition : null;
  const motion = useRef({
    edition,
    active: false,
    landed: false,
    progress: 0,
    direction: 1,
    hold: 0,
    presentedSequence: 0,
    returnedSequence: 0,
  });
  const [presented, setPresented] = useState(() => ({ ...motion.current }));
  const callbacks = useRef({ onPresentedEdition, onRecordReturned });
  callbacks.current = { onPresentedEdition, onRecordReturned };
  const notified = useRef({ presented: 0, returned: 0 });
  const advance = useRef();
  advance.current = (delta) => {
    const current = motion.current;
    let changed = false;
    let dt = Math.min(delta, 0.05);
    const activate = (id) => {
      current.edition = id;
      current.active = true;
      current.landed = reducedMotion;
      current.progress = reducedMotion ? 1 : 0;
      current.direction = 1;
      current.hold = reducedMotion ? 0 : 0.12;
      current.presentedSequence += 1;
      changed = true;
    };
    const consumeHold = () => {
      const held = Math.min(dt, current.hold);
      current.hold -= held;
      dt -= held;
    };

    if (!current.active) {
      if (requested) activate(requested);
    } else if (requested !== current.edition) {
      if (current.direction !== -1) {
        current.direction = -1;
        current.hold = current.landed && !reducedMotion ? 0.09 : 0;
        current.landed = false;
        changed = true;
      }
      consumeHold();
      current.progress = reducedMotion
        ? 0
        : Math.max(0, current.progress - dt / 0.56);
      if (current.progress === 0) {
        // Only a fully sleeved record can change identity or release the room.
        if (requested) activate(requested);
        else {
          current.active = false;
          current.landed = false;
          current.hold = 0;
          current.returnedSequence += 1;
          changed = true;
        }
      }
    } else {
      if (current.direction !== 1) {
        current.direction = 1;
        current.hold = 0;
      }
      consumeHold();
      current.progress = reducedMotion
        ? 1
        : Math.min(1, current.progress + dt / 1.18);
      if (current.progress === 1 && !current.landed) {
        current.landed = true;
        changed = true;
      }
    }
    if (changed) setPresented({ ...current });
  };

  useLayoutEffect(() => {
    advance.current(0);
  }, [requested, reducedMotion]);
  useFrame((_, dt) => advance.current(dt));
  useLayoutEffect(() => {
    if (presented.presentedSequence !== notified.current.presented) {
      notified.current.presented = presented.presentedSequence;
      callbacks.current.onPresentedEdition?.(presented.edition);
    }
    if (presented.returnedSequence !== notified.current.returned) {
      notified.current.returned = presented.returnedSequence;
      callbacks.current.onRecordReturned?.();
    }
  }, [presented]);

  return { ...presented, motion };
}

function Stage({
  mode,
  edition,
  onSelect,
  progress,
  paused,
  reducedMotion,
  presentation,
  onIntroTargetReady,
  onPresentedEdition,
  onRecordReturned,
}) {
  const { camera, size } = useThree();
  const physical = useRecordPresentation({
    mode,
    edition,
    reducedMotion,
    onPresentedEdition,
    onRecordReturned,
  });
  const isEdition = physical.active;
  const [smallViewport, setSmallViewport] = useState(
    () => window.innerWidth <= 760,
  );
  const introSleeve = useRef();
  const aiSleeve = useRef();
  const compact =
    presentation === "immersive"
      ? smallViewport
      : size.width / size.height < 1.3;
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setSmallViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useFrame((_, dt) => {
    const speed = reducedMotion ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 5);
    const worldWidth = isEdition ? 4.6 : compact ? 5.65 : 10.7;
    const worldHeight = isEdition ? 4.2 : compact ? 5.0 : 4.35;
    const zoom = Math.min(size.width / worldWidth, size.height / worldHeight);
    camera.zoom = lerp(camera.zoom, zoom, speed);
    camera.position.lerp(
      new THREE.Vector3(isEdition ? 0.6 : 0, isEdition ? 6.9 : 5.4, 10),
      speed,
    );
    cameraTarget.lerp(
      new THREE.Vector3(
        0,
        isEdition ? 0.66 : compact ? 0.9 : 0.94,
        isEdition ? 0.1 : 0,
      ),
      speed,
    );
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix();
  });

  const introPosition = isEdition
    ? [-0.8, 1.02, -1.5]
    : compact
      ? [-1.17, 1.56, -0.92]
      : [-3.42, 1.29, -0.13];
  const aiPosition = isEdition
    ? [-0.8, 1.02, -1.5]
    : compact
      ? [0.76, 1.62, -1.15]
      : [-0.81, 1.49, -0.56];
  return (
    <>
      <ambientLight intensity={1} />
      <hemisphereLight args={["#ffffff", "#939397", 1.2]} />
      <Environment resolution={128} frames={1}>
        <Lightformer
          color="#ffffff"
          intensity={2.3}
          position={[0, 5, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 8, 1]}
        />
        <Lightformer
          color="#ffffff"
          intensity={2}
          position={[-5, 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[3, 6, 1]}
        />
        <Lightformer
          color="#f3f5f8"
          intensity={1.3}
          position={[4, 1, 4]}
          rotation={[0, -Math.PI * 0.75, 0]}
          scale={[3, 3, 1]}
        />
      </Environment>
      <directionalLight
        position={[-3, 10, 4]}
        intensity={2.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-camera-bottom={-5}
        shadow-normalBias={0.02}
        shadow-bias={-0.0001}
        shadow-radius={4}
      />
      <directionalLight position={[5, 4, -3]} intensity={1.7} color="#ffffff" />
      <pointLight
        position={[-2, 3, 5]}
        intensity={3}
        color="#ffffff"
        decay={2}
      />
      <ContactShadows
        position={[0, -0.06, 0]}
        scale={14}
        opacity={0.32}
        blur={2.5}
        far={3.7}
        resolution={512}
        color="#252529"
      />
      <Sleeve
        edition="intro"
        objectRef={introSleeve}
        position={introPosition}
        rotation={[-0.08, 0.1, -0.1]}
        scale={isEdition ? 0.72 : compact ? 0.77 : 1}
        visible={!isEdition || physical.edition === "intro"}
        interactive={!isEdition}
        onSelect={onSelect}
        reducedMotion={reducedMotion}
      />
      <Sleeve
        edition="ai"
        objectRef={aiSleeve}
        position={aiPosition}
        rotation={isEdition ? [-0.08, 0.1, -0.1] : [-0.09, -0.12, 0.08]}
        scale={isEdition ? 0.72 : compact ? 0.77 : 1}
        visible={!isEdition || physical.edition === "ai"}
        interactive={!isEdition}
        onSelect={onSelect}
        reducedMotion={reducedMotion}
      />
      <Turntable
        position={
          isEdition
            ? [0, 0, 0]
            : compact
              ? [0.16, -0.015, 1.49]
              : [2.72, 0.04, 0.43]
        }
        scale={isEdition ? 1.08 : compact ? 0.9 : 1.04}
        edition={physical.edition}
        playing={isEdition}
        landed={physical.landed}
        motion={physical.motion}
        progress={progress}
        paused={paused}
        reducedMotion={reducedMotion}
        sourceSleeve={physical.edition === "ai" ? aiSleeve : introSleeve}
        onIntroTargetReady={onIntroTargetReady}
      />
    </>
  );
}

function SceneReadiness({ readiness, callback }) {
  useFrame(() => {
    if (readiness.current.notified) return;
    // The second pre-render callback follows one completed scene render.
    readiness.current.frames = Math.min(2, readiness.current.frames + 1);
    if (readiness.current.frames < 2 || typeof callback.current !== "function")
      return;
    readiness.current.notified = true;
    callback.current();
  });
  return null;
}

export default function RecordScene({
  mode = "collection",
  edition = "intro",
  onSelect,
  progress = 0,
  paused = false,
  reducedMotion = false,
  presentation = "stage",
  onReady,
  onIntroTargetReady,
  onPresentedEdition,
  onRecordReturned,
}) {
  const readiness = useRef({ frames: 0, notified: false });
  const readyCallback = useRef(onReady);
  readyCallback.current = onReady;
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 5.4, 10], zoom: 85, near: 0.1, far: 150 }}
      shadows
      dpr={[1, 1.8]}
      gl={{
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      }}
      style={{ width: "100%", height: "100%", touchAction: "pan-y" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#f0f1e9", 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1;
      }}
    >
      <Suspense fallback={null}>
        <Stage
          mode={mode}
          edition={edition}
          onSelect={onSelect}
          progress={progress}
          paused={paused}
          reducedMotion={reducedMotion}
          presentation={presentation}
          onIntroTargetReady={onIntroTargetReady}
          onPresentedEdition={onPresentedEdition}
          onRecordReturned={onRecordReturned}
        />
        <SceneReadiness readiness={readiness} callback={readyCallback} />
      </Suspense>
    </Canvas>
  );
}
