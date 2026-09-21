import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const LIME = "#c7ed48";
const PAPER = "#eeeee7";
const BLACK = "#1b1d1c";
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

function coverArtwork(ctx, edition, artwork) {
  const ai = edition === "ai";
  ctx.fillStyle = ai ? LIME : PAPER;
  ctx.fillRect(0, 0, 1024, 1024);
  if (artwork) {
    ctx.save();
    if (!ai) ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(artwork, 0, ai ? 330 : 350, 1024, 1024);
    ctx.restore();
    ctx.fillStyle = ai ? "rgba(199,237,72,.06)" : "rgba(238,238,231,.06)";
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
    ctx.fillStyle = "#181a19";
    ctx.fillRect(0, 0, 1024, 1024);
    const sheen = ctx.createConicGradient(0.3, 512, 512);
    sheen.addColorStop(0, "#171918");
    sheen.addColorStop(0.14, "#414440");
    sheen.addColorStop(0.29, "#181a19");
    sheen.addColorStop(0.5, "#101211");
    sheen.addColorStop(0.68, "#444743");
    sheen.addColorStop(0.79, "#202320");
    sheen.addColorStop(1, "#171918");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let radius = 183; radius < 500; radius += 2.7) {
      ctx.beginPath();
      ctx.arc(512, 512, radius, 0, Math.PI * 2);
      ctx.strokeStyle =
        Math.round(radius) % 4 ? "rgba(0,0,0,.42)" : "rgba(225,230,219,.12)";
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
    if (group.current && spinning && !paused && !reducedMotion)
      group.current.rotation.y -= Math.min(dt, 0.05) * 0.85;
  });
  return (
    <group ref={group} scale={radius}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 0.033, 96]} />
        <meshStandardMaterial
          color="#101311"
          metalness={0.35}
          roughness={0.27}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, 0]}
        receiveShadow
      >
        <ringGeometry args={[0.018, 0.994, 128]} />
        <meshStandardMaterial map={grooves} metalness={0.27} roughness={0.32} />
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
}) {
  const group = useRef();
  const record = useRef();
  const [hovered, setHovered] = useState(false);
  const cover = useCoverTexture(edition);
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
      position={position}
      rotation={rotation}
      scale={visible ? scale : 0.001}
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
        visible={showRecord}
        position={[0.43, 0, -0.065]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <Vinyl edition={edition} radius={1.2} />
      </group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.53, 2.53, 0.062]} />
        <meshStandardMaterial
          color={edition === "ai" ? "#a0bd3f" : "#d4d4cb"}
          roughness={0.88}
        />
      </mesh>
      <mesh position={[0, 0, 0.033]} castShadow receiveShadow>
        <planeGeometry args={[2.525, 2.525]} />
        <meshStandardMaterial map={cover} roughness={0.83} />
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
  color = "#a6a9a5",
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
          color="#363b36"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.1, 24]} />
        <meshStandardMaterial
          color="#a7ada7"
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
            color="#6c736b"
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
            color="#222820"
            roughness={0.42}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[-0.43, -0.07, 1.15]}>
          <boxGeometry args={[0.065, 0.07, 0.075]} />
          <meshStandardMaterial color="#c0dc5d" roughness={0.5} />
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
        ctx.fillStyle = "#363b35";
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
  progress,
  paused,
  reducedMotion,
  flight,
}) {
  const base = useRef();
  const disc = useRef();
  const elapsed = useRef(0);
  const [landed, setLanded] = useState(false);
  const wasPlaying = useRef(false);
  const spindleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c8cec6",
        metalness: 0.9,
        roughness: 0.24,
      }),
    [],
  );
  useEffect(() => () => spindleMaterial.dispose(), [spindleMaterial]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    base.current.position.lerp(new THREE.Vector3(...position), speed);
    base.current.scale.setScalar(lerp(base.current.scale.x, scale, speed));
    if (playing !== wasPlaying.current) {
      elapsed.current = 0;
      wasPlaying.current = playing;
      setLanded(false);
    }
    if (!playing) return;
    elapsed.current += dt;
    const time = reducedMotion ? 1 : clamp(elapsed.current / 2, 0, 1);
    const extraction = clamp(time / 0.34, 0, 1);
    const travel = clamp((time - 0.34) / 0.66, 0, 1);
    const eased = travel * travel * (3 - 2 * travel);
    const start = flight || [-0.75, 0.95, -1.46];
    const extractedX =
      start[0] + 1.5 * (extraction * extraction * (3 - 2 * extraction));
    disc.current.position.set(
      lerp(extractedX, -0.35, eased),
      lerp(start[1], 0.59, eased) + Math.sin(eased * Math.PI) * 0.48,
      lerp(start[2], 0.05, eased),
    );
    disc.current.rotation.x = lerp(Math.PI / 2, 0, eased);
    disc.current.rotation.z = lerp(-0.12, 0, eased);
    disc.current.scale.setScalar(lerp(0.8, 0.98, eased));
    if (time === 1 && !landed) setLanded(true);
  });
  const strobe = useMemo(
    () => Array.from({ length: 68 }, (_, index) => (index * Math.PI * 2) / 68),
    [],
  );
  return (
    <group ref={base} position={position} scale={scale}>
      {[-1.2, 1.2].map((x) =>
        [-0.89, 0.89].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.015, z]} castShadow>
            <cylinderGeometry args={[0.16, 0.145, 0.12, 24]} />
            <meshStandardMaterial
              color="#22251f"
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
          color="#333832"
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
        <meshStandardMaterial
          color="#b9c0b4"
          roughness={0.37}
          metalness={0.62}
        />
      </RoundedBox>
      <mesh position={[-0.35, 0.464, 0.05]} castShadow receiveShadow>
        <cylinderGeometry args={[1.075, 1.075, 0.07, 96]} />
        <meshStandardMaterial
          color="#252b25"
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[-0.35, 0.506, 0.05]} castShadow receiveShadow>
        <cylinderGeometry args={[1.066, 1.066, 0.045, 96]} />
        <meshStandardMaterial
          color="#b8c0b5"
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
          <meshStandardMaterial color="#313830" roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[-0.35, 0.542, 0.05]} receiveShadow>
        <cylinderGeometry args={[1.015, 1.015, 0.035, 96]} />
        <meshStandardMaterial
          color="#252a24"
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
          <meshStandardMaterial color="#464c42" roughness={0.8} />
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
          color="#d7ddd3"
          metalness={0.8}
          roughness={0.27}
        />
      </mesh>
      <mesh position={[-1.32, 0.505, 0.94]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.045, 0.055, 28]} />
        <meshStandardMaterial color="#464b43" />
      </mesh>
      <mesh position={[-1.1, 0.439, 0.94]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.027, 20]} />
        <meshBasicMaterial color={playing ? "#baf04c" : "#b1543c"} />
      </mesh>
      <mesh position={[1.19, 0.439, 0.53]}>
        <boxGeometry args={[0.024, 0.009, 0.75]} />
        <meshStandardMaterial color="#656f60" roughness={0.5} />
      </mesh>
      <mesh position={[1.19, 0.467, 0.51]} castShadow>
        <boxGeometry args={[0.14, 0.05, 0.08]} />
        <meshStandardMaterial color="#d0d6c9" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 1.48, 0.432, -1.08]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.024, 16]} />
          <meshStandardMaterial
            color="#515a4c"
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      ))}
      <DeckText />
    </group>
  );
}

function Stage({ mode, edition, onSelect, progress, paused, reducedMotion }) {
  const { camera, size } = useThree();
  const isEdition = mode === "edition";
  const compact = size.width / size.height < 1.3;
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
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
      <ambientLight intensity={1.25} />
      <hemisphereLight args={["#ffffff", "#858c73", 1.5]} />
      <Environment resolution={128} frames={1}>
        <Lightformer
          color="#ffffff"
          intensity={2.5}
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
          color="#eff5dc"
          intensity={1.3}
          position={[4, 1, 4]}
          rotation={[0, -Math.PI * 0.75, 0]}
          scale={[3, 3, 1]}
        />
      </Environment>
      <directionalLight
        position={[-4, 8, 5]}
        intensity={3.2}
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
      <directionalLight position={[5, 4, -3]} intensity={2.1} color="#ffffff" />
      <pointLight
        position={[-2, 3, 5]}
        intensity={5}
        color="#f7ffe5"
        decay={2}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.06, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <shadowMaterial color="#48513e" transparent opacity={0.2} />
      </mesh>
      <Sleeve
        edition="intro"
        position={introPosition}
        rotation={[-0.08, 0.1, -0.1]}
        scale={isEdition ? 0.72 : compact ? 0.77 : 1}
        visible={!isEdition || edition === "intro"}
        interactive={!isEdition}
        showRecord={!isEdition}
        onSelect={onSelect}
        reducedMotion={reducedMotion}
      />
      <Sleeve
        edition="ai"
        position={aiPosition}
        rotation={isEdition ? [-0.08, 0.1, -0.1] : [-0.09, -0.12, 0.08]}
        scale={isEdition ? 0.72 : compact ? 0.77 : 1}
        visible={!isEdition || edition === "ai"}
        interactive={!isEdition}
        showRecord={!isEdition}
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
        edition={edition}
        playing={isEdition}
        progress={progress}
        paused={paused}
        reducedMotion={reducedMotion}
        flight={[-0.74, 0.94, -1.47]}
      />
    </>
  );
}

export default function RecordScene({
  mode = "collection",
  edition = "intro",
  onSelect,
  progress = 0,
  paused = false,
  reducedMotion = false,
}) {
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
        />
      </Suspense>
    </Canvas>
  );
}
