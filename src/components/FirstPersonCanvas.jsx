import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  AtmosphericSkyAndWind,
  DeepBlueTiledRoof,
  EngineerAndArtistStudioShowcase,
  ExteriorYardFenceAndGrass,
  FrontWallWithWindows,
  getHousePBRTextures,
  GoldenWindowSunbeams,
  KitchenSkillsShowcase,
  LivingRoomSkillsShowcase,
  useWelcomeSignTexture,
} from './HouseEnhancements.jsx'

const MODEL_PATH = '/models/interior.glb'

/**
 * Metadata for the single top-left corner box at each stage of the tour.
 */
const TOUR_CHAPTERS = [
  {
    room: 'Outside the House',
    title: 'Akanksha Ray — 3D Portfolio House',
    subtitle: 'B.Tech in Electronics & VLSI @ IIIT-Delhi • Scroll down slowly to enter',
  },
  {
    room: 'Front Entrance & Porch',
    title: 'Welcome Inside',
    subtitle: 'Aligned limestone walkway, golden sunlight & warm gallery lights',
  },
  {
    room: 'Kitchen — Fridge Magnets (AI Skills)',
    title: 'Prompt Engineering & Multilingual NLP',
    subtitle: 'LLM Agents & RAG Workflows • Sarkari Sahayak Hindi & Dialect AI',
  },
  {
    room: 'Kitchen — The Oven',
    title: 'React, Three.js & Full-Stack Web',
    subtitle: 'Interactive 3D & Responsive Web Apps • 60% Faster Load Optimization',
  },
  {
    room: 'Dining Nook & Living Room Lounge',
    title: 'Dining Table, Plush Bouclé Sofa & 4K TV',
    subtitle: 'Floor plan layout • Plush blue 3-seater couch & accent armchairs',
  },
  {
    room: 'Living Room — Newspaper Front Page',
    title: 'VLSI & Analog CMOS IC Design',
    subtitle: '2-Stage CMOS Op-Amp (59.9 dB Gain, 76.7° PM) & 21.3 µm² 4-Bit CMOS Latch',
  },
  {
    room: 'Living Room — Newspaper Page Flip',
    title: 'Embedded C/C++ & RISC-V Architecture',
    subtitle: '5-Stage Pipelined RISC-V Simulator • Biometric Scanner (100+ IDs) • Audio Equalizer',
  },
  {
    room: 'North Hallway — Bathroom & Locked Bedroom Door',
    title: 'Floor Plan Suite & Private Bedroom',
    subtitle: 'Vanity, soaking tub, toilet & elegant locked primary suite door',
  },
  {
    room: 'Central Oak Staircase — Ascending to the Attic',
    title: 'Up the Oak Stairs into the Attic Loft',
    subtitle: 'Climbing the sunlit central staircase northward to the upstairs studio loft',
  },
  {
    room: 'Upstairs Attic — Study & Meraki Art Studio',
    title: 'The Attic Study, Desk & Gallery',
    subtitle: 'Study desk with computer, woven round rug, easel & Machaan stagecraft',
  },
  {
    room: 'Upstairs Attic — Interactive Artist Sketchbooks',
    title: 'Inside Akanksha’s Sketchbooks',
    subtitle: 'Charcoal Architectural Studies, Machaan Stage Blocking & 3D UI/UX Wireframe Sketches',
  },
]

const SPLINE_KEYFRAMES = [
  // 0. Exterior Overview — Curved round earth horizon, fence, dog companion & straight driveway
  { cam: [-0.53, 3.8, 14.8], look: [-0.53, 1.4, 3.5], chapter: 0 },
  { cam: [-0.53, 2.5, 10.8], look: [-0.53, 1.38, 4.2], chapter: 0 },

  // 1. Approaching Aligned Porch Steps & Front Door
  { cam: [-0.53, 1.62, 7.2], look: [-0.53, 1.36, 4.8], chapter: 1 },
  { cam: [-0.53, 1.54, 4.65], look: [-0.75, 1.36, 2.95], chapter: 1 },

  // 2. Kitchen Fridge Magnets (Kept untouched)
  { cam: [-1.12, 1.46, 2.72], look: [-1.72, 1.38, 3.95], chapter: 2 },
  { cam: [-1.74, 1.43, 3.12], look: [-1.74, 1.43, 4.27], chapter: 2 },
  { cam: [-1.74, 1.43, 3.18], look: [-1.74, 1.43, 4.27], chapter: 2 },

  // 3. Smooth Pan Across Kitchen Sink to Oven
  { cam: [-1.72, 1.32, 2.82], look: [-3.18, 1.04, 2.52], chapter: 3 },
  { cam: [-1.815, 1.14, 2.46], look: [-1.815, 0.98, 1.61], chapter: 3 },
  { cam: [-1.815, 1.10, 2.38], look: [-1.815, 0.96, 1.61], chapter: 3 },

  // 4. Gliding East into the Living Room (Floor Plan: North Sofa, Coffee Table, Armchairs, TV)
  { cam: [0.65, 1.32, 2.65], look: [2.15, 0.95, 2.85], chapter: 4 },
  { cam: [1.35, 1.25, 2.85], look: [2.15, 0.85, 2.85], chapter: 4 },

  // 5. Living Room — Focused View on Coffee Table Broadsheet & Steaming Coffee
  { cam: [2.15, 1.12, 3.48], look: [2.15, 0.52, 2.85], chapter: 5 },

  // 6. Newspaper Page Flips Open to Reveal Skill 2 — Page 2
  { cam: [2.15, 1.10, 3.46], look: [2.15, 0.52, 2.85], chapter: 6 },
  { cam: [2.15, 1.08, 3.45], look: [2.15, 0.52, 2.85], chapter: 6 },

  // 7. Hallway Suite — Viewing the Bathroom (Vanity, Toilet, Tub) & Locked Bedroom Door
  { cam: [0.55, 1.35, 1.80], look: [2.15, 1.05, 0.85], chapter: 7 },
  { cam: [0.55, 1.35, 0.40], look: [1.10, 1.32, -0.35], chapter: 7 },

  // 8. Approaching & Ascending the Central Oak Staircase Northward into the Attic
  { cam: [0.55, 1.15, 2.15], look: [0.55, 1.65, 0.60], chapter: 8 },
  { cam: [0.55, 1.95, 0.95], look: [0.55, 2.45, -0.20], chapter: 8 },
  { cam: [0.55, 2.95, -0.15], look: [0.10, 3.20, 1.50], chapter: 8 },

  // 9. Entering the Attic Study / Studio (Desk on West, Round Rug in Center, Rafters)
  { cam: [0.10, 3.45, 0.65], look: [-0.65, 3.18, 1.65], chapter: 9 },
  { cam: [0.25, 3.38, 1.85], look: [0.35, 3.10, 3.05], chapter: 9 },

  // 10. Zooming Into the Open Sketchbooks on the South Drafting Table
  { cam: [0.35, 3.32, 2.65], look: [0.35, 3.04, 3.08], chapter: 10 },
  { cam: [0.35, 3.30, 2.68], look: [0.35, 3.04, 3.08], chapter: 10 },
  { cam: [0.35, 3.29, 2.69], look: [0.35, 3.04, 3.08], chapter: 10 },
]

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

/**
 * Removes the solid front wall triangles (z > 4.88, y > 0.05) from the base GLB
 * for see-through front windows, and opens the low half-wall partition between
 * the Entry Hall and the Living Room into a clean floor-to-ceiling archway.
 */
function cutFrontWallForWindows(root) {
  root.updateMatrixWorld(true)
  const vA = new THREE.Vector3()
  const vB = new THREE.Vector3()
  const vC = new THREE.Vector3()

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry || child.userData.frontWallCut) return
    const geom = child.geometry.clone()
    const posAttr = geom.attributes.position
    const idxAttr = geom.index
    if (!posAttr || !idxAttr) return

    const matrix = child.matrixWorld
    const newIndices = []
    const count = idxAttr.count

    for (let i = 0; i < count; i += 3) {
      const i0 = idxAttr.getX(i)
      const i1 = idxAttr.getX(i + 1)
      const i2 = idxAttr.getX(i + 2)

      vA.fromBufferAttribute(posAttr, i0).applyMatrix4(matrix)
      vB.fromBufferAttribute(posAttr, i1).applyMatrix4(matrix)
      vC.fromBufferAttribute(posAttr, i2).applyMatrix4(matrix)

      const minX = Math.min(vA.x, vB.x, vC.x)
      const maxX = Math.max(vA.x, vB.x, vC.x)
      const minZ = Math.min(vA.z, vB.z, vC.z)
      const maxZ = Math.max(vA.z, vB.z, vC.z)
      const maxY = Math.max(vA.y, vB.y, vC.y)

      // 1. Cut front wall for windows
      if (minZ > 4.88 && maxY > 0.05) {
        continue
      }

      // 2. Open entry hall half-wall partition
      if (
        minX >= -0.08 &&
        maxX <= 0.14 &&
        minZ >= 1.86 &&
        maxZ <= 3.68 &&
        maxY > 0.02 &&
        maxY <= 0.86
      ) {
        continue
      }

      // 3. Remove original south-facing stairs in front of window (x in [0.05, 3.10], z in [3.85, 5.08], y > 0.05)
      // Moving staircase away from window over to the North dividing wall
      if (
        minX >= 0.05 &&
        maxX <= 3.15 &&
        minZ >= 3.82 &&
        maxZ <= 5.12 &&
        maxY > 0.04
      ) {
        continue
      }

      newIndices.push(i0, i1, i2)
    }

    geom.setIndex(newIndices)
    geom.computeVertexNormals()

    // Generate world-space triplanar UV coordinates so PBR wood, clapboard siding,
    // Venetian plaster, and Carrara marble textures map seamlessly onto interior.glb
    const normAttr = geom.attributes.normal
    const vCount = posAttr.count
    const uvs = new Float32Array(vCount * 2)
    const vPos = new THREE.Vector3()
    const vNorm = new THREE.Vector3()
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix)

    for (let vi = 0; vi < vCount; vi++) {
      vPos.fromBufferAttribute(posAttr, vi).applyMatrix4(matrix)
      if (normAttr) {
        vNorm.fromBufferAttribute(normAttr, vi).applyMatrix3(normalMatrix).normalize()
      } else {
        vNorm.set(0, 1, 0)
      }

      const ax = Math.abs(vNorm.x)
      const ay = Math.abs(vNorm.y)
      const az = Math.abs(vNorm.z)

      if (ay > ax && ay > az) {
        // Horizontal surface (hardwood floors, stairs, countertops, ceilings)
        uvs[vi * 2] = vPos.x * 0.45
        uvs[vi * 2 + 1] = vPos.z * 0.45
      } else if (ax > az) {
        // East/West wall or cabinet side
        uvs[vi * 2] = vPos.z * 0.48
        uvs[vi * 2 + 1] = vPos.y * 0.48
      } else {
        // North/South wall or cabinet face
        uvs[vi * 2] = vPos.x * 0.48
        uvs[vi * 2 + 1] = vPos.y * 0.48
      }
    }
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

    child.geometry = geom
    child.userData.frontWallCut = true
  })
}

/**
 * Loads the house interior GLB model, opens the front facade for windows,
 * generates triplanar UVs, and applies real tactile PBR textures (clapboard siding,
 * quarter-sawn oak hardwood planks, Venetian limewash plaster, Carrara marble, and brushed steel).
 */
function InteriorModel() {
  const { scene } = useGLTF(MODEL_PATH)

  useEffect(() => {
    cutFrontWallForWindows(scene)
    const {
      sidingMap,
      sidingBump,
      oakMap,
      oakBump,
      plasterBump,
      marbleMap,
    } = getHousePBRTextures()

    scene.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true

      const mat = child.material
      if (mat && mat.color) {
        if (mat.name === 'mat18') {
          // Exterior & primary structural walls: Powder-blue clapboard siding + grain bump
          mat.color.set('#ffffff')
          mat.map = sidingMap
          mat.bumpMap = sidingBump
          mat.bumpScale = 0.022
          mat.roughness = 0.58
        } else if (mat.name === 'mat21') {
          // Interior plaster walls, ceilings & window trim: Soft Venetian limewash plaster
          mat.color.set('#e8f4fe')
          mat.bumpMap = plasterBump
          mat.bumpScale = 0.012
          mat.roughness = 0.68
        } else if (mat.name === 'mat19') {
          // Hardwood floors, stairs, kitchen cabinetry & wood furniture: Quarter-sawn oak planks
          mat.color.set('#f8fafc')
          mat.map = oakMap
          mat.bumpMap = oakBump
          mat.bumpScale = 0.018
          mat.roughness = 0.44
        } else if (mat.name === 'mat20') {
          // Darker walnut trim, shelves & counter accents: Rich walnut grain
          mat.color.set('#b45309')
          mat.map = oakMap
          mat.bumpMap = oakBump
          mat.bumpScale = 0.016
          mat.roughness = 0.48
        } else if (mat.name === 'mat15') {
          // Kitchen countertops & fridge body: Veined Carrara marble surface
          mat.color.set('#f8fafc')
          mat.map = marbleMap
          mat.roughness = 0.24
          mat.metalness = 0.06
        } else if (mat.name === 'mat22') {
          // Sink basin, stove & metallic appliances: Brushed stainless steel
          mat.color.set('#cbd5e1')
          mat.metalness = 0.78
          mat.roughness = 0.24
        } else if (mat.name === 'mat17') {
          // Dark slate frames & hardware: Anodized architectural slate
          mat.color.set('#1e293b')
          mat.metalness = 0.52
          mat.roughness = 0.34
        } else if (mat.name === 'mat16') {
          mat.color.set('#64a8e8')
          mat.bumpMap = plasterBump
          mat.bumpScale = 0.01
        }
        mat.needsUpdate = true
      }
    })
  }, [scene])

  return <primitive object={scene} />
}

/**
 * Animated 3D Front Door with a hanging wooden "WELCOME" Sign mounted on the front face.
 */
function AnimatedFrontDoor({ scrollRef }) {
  const hingeRef = useRef(null)
  const signRef = useRef(null)
  const welcomeTex = useWelcomeSignTexture()

  useFrame(({ clock }, delta) => {
    if (!hingeRef.current) return
    const s = scrollRef.current
    const openProgress = smoothstep(0.06, 0.18, s)
    const targetAngle = openProgress * (Math.PI * 0.58)
    hingeRef.current.rotation.y = THREE.MathUtils.damp(
      hingeRef.current.rotation.y,
      targetAngle,
      2.6,
      delta
    )

    if (signRef.current) {
      signRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 2.6) * 0.045
    }
  })

  return (
    <group position={[-0.98, 0, 5.10]} ref={hingeRef}>
      <mesh position={[0.44, 1.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.88, 2.04, 0.06]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.45} />
      </mesh>
      <mesh position={[0.44, 1.48, 0]}>
        <boxGeometry args={[0.58, 0.62, 0.068]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.72} roughness={0.15} />
      </mesh>
      <mesh position={[0.44, 0.56, 0]}>
        <boxGeometry args={[0.6, 0.64, 0.068]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.5} />
      </mesh>
      <mesh position={[0.76, 1.0, 0.055]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.76, 1.0, -0.055]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>

      <group position={[0.44, 1.46, 0.045]} ref={signRef}>
        <mesh position={[0, 0.19, 0]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[-0.09, 0.13, 0]} rotation={[0, 0, -0.58]}>
          <cylinderGeometry args={[0.005, 0.005, 0.19, 6]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        <mesh position={[0.09, 0.13, 0]} rotation={[0, 0, 0.58]}>
          <cylinderGeometry args={[0.005, 0.005, 0.19, 6]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.46, 0.22, 0.018]} />
          <meshStandardMaterial color="#92400e" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[0.44, 0.20]} />
          <meshStandardMaterial map={welcomeTex} roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

function ExteriorGround() {
  const { lawnMap, stoneMap, plasterBump } = useMemo(() => getHousePBRTextures(), [])

  // Curved spherical earth dome geometry where the world curves down over the horizon
  const curvedEarthGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(160, 160, 80, 80)
    geom.rotateX(-Math.PI / 2)
    const pos = geom.attributes.position
    const count = pos.count
    const v = new THREE.Vector3()

    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i)
      const r = Math.hypot(v.x, v.z)
      // Inside radius 10.5m: flat at y = -0.04 so house, yard, fence, and dog sit grounded
      if (r <= 10.5) {
        v.y = -0.04
      } else {
        // Quadratic spherical curvature dropping smoothly down over the horizon
        const dist = r - 10.5
        v.y = -0.04 - Math.pow(dist / 14.0, 2.05) * 4.6
      }
      pos.setXYZ(i, v.x, v.y, v.z)
    }

    geom.computeVertexNormals()

    // Seamlessly map the PBR grass texture across the curved earth
    const uvs = geom.attributes.uv
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i)
      uvs.setXY(i, v.x * 0.16, v.z * 0.16)
    }

    return geom
  }, [])

  return (
    <group>
      {/* 1. Curved Round Earth Horizon Greenery */}
      <mesh geometry={curvedEarthGeom} receiveShadow>
        <meshStandardMaterial
          map={lawnMap}
          bumpMap={plasterBump}
          bumpScale={0.032}
          roughness={0.88}
        />
      </mesh>

      {/* 2. Straight, Perfectly Aligned Limestone Driveway & Walkway (x = -0.53) */}
      <group position={[-0.53, 0, 0]}>
        {/* Main Limestone Paved Walkway (from porch z = 5.48 all the way out past the fence gate z = 8.2 to z = 18.0) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 11.74]} receiveShadow>
          <planeGeometry args={[1.72, 12.52]} />
          <meshStandardMaterial
            map={stoneMap}
            bumpMap={plasterBump}
            bumpScale={0.024}
            roughness={0.70}
          />
        </mesh>

        {/* Crisp Architectural Stone Curb Pavers flanking the Walkway */}
        <mesh position={[-0.88, -0.008, 11.74]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.035, 12.52]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.65} />
        </mesh>
        <mesh position={[0.88, -0.008, 11.74]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.035, 12.52]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.65} />
        </mesh>

        {/* 3. Tiered Front Porch Steps Aligned Directly with the Front Door */}
        {/* Tier 1 Landing Platform (Top step flush with door threshold) */}
        <mesh position={[0, 0.012, 5.22]} receiveShadow castShadow>
          <boxGeometry args={[1.72, 0.045, 0.44]} />
          <meshStandardMaterial color="#e2e8f0" map={stoneMap} roughness={0.6} />
        </mesh>
        {/* Tier 2 Lower Step */}
        <mesh position={[0, -0.01, 5.46]} receiveShadow castShadow>
          <boxGeometry args={[1.72, 0.035, 0.28]} />
          <meshStandardMaterial color="#cbd5e1" map={stoneMap} roughness={0.65} />
        </mesh>

        {/* Modern Ceramic Planters flanking the front porch */}
        <group position={[-0.96, 0.14, 5.22]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.12, 0.28, 16]} />
            <meshStandardMaterial color="#475569" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.20, 0]} castShadow>
            <sphereGeometry args={[0.16, 12, 12]} scale={[1, 1.25, 1]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
        </group>
        <group position={[0.96, 0.14, 5.22]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.12, 0.28, 16]} />
            <meshStandardMaterial color="#475569" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.20, 0]} castShadow>
            <sphereGeometry args={[0.16, 12, 12]} scale={[1, 1.25, 1]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function ScrollTourCamera({ scrollRef, onActiveChapterChange }) {
  const { camera } = useThree()
  const smoothedScroll = useRef(0)
  const currentLook = useMemo(() => new THREE.Vector3(...SPLINE_KEYFRAMES[0].look), [])
  const lastChapter = useRef(0)

  const { camCurve, lookCurve } = useMemo(() => {
    const camPts = SPLINE_KEYFRAMES.map((k) => new THREE.Vector3(...k.cam))
    const lookPts = SPLINE_KEYFRAMES.map((k) => new THREE.Vector3(...k.look))
    return {
      camCurve: new THREE.CatmullRomCurve3(camPts, false, 'centripetal', 0.35),
      lookCurve: new THREE.CatmullRomCurve3(lookPts, false, 'centripetal', 0.35),
    }
  }, [])

  useEffect(() => {
    camera.position.set(...SPLINE_KEYFRAMES[0].cam)
    camera.lookAt(...SPLINE_KEYFRAMES[0].look)
  }, [camera])

  useFrame((_, delta) => {
    smoothedScroll.current = THREE.MathUtils.damp(
      smoothedScroll.current,
      scrollRef.current,
      2.6,
      delta
    )

    const u = Math.max(0, Math.min(1, smoothedScroll.current))
    const targetCam = camCurve.getPoint(u)
    const targetLook = lookCurve.getPoint(u)

    camera.position.lerp(targetCam, Math.min(1, delta * 5.2))
    currentLook.lerp(targetLook, Math.min(1, delta * 5.2))
    camera.lookAt(currentLook)

    const kfIdx = Math.min(
      SPLINE_KEYFRAMES.length - 1,
      Math.round(u * (SPLINE_KEYFRAMES.length - 1))
    )
    const chapterIdx = SPLINE_KEYFRAMES[kfIdx].chapter
    if (chapterIdx !== lastChapter.current) {
      lastChapter.current = chapterIdx
      onActiveChapterChange(chapterIdx)
    }
  })

  return null
}

export default function FirstPersonCanvas() {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const scrollRef = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll))
      scrollRef.current = progress
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  return (
    <div className="scroll-page">
      {/* Fixed Fullscreen 3D Canvas */}
      <div className="canvas-fixed">
        <Canvas
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.06,
          }}
          camera={{ fov: 56, near: 0.08, far: 220, position: [-0.45, 3.8, 14.5] }}
        >
          <color attach="background" args={['#bae6fd']} />

          {/* Cozy Cinematic Lighting: Lower flat ambient light + warm golden sunlight + focused gallery pools */}
          <ambientLight intensity={0.44} color="#ffedd5" />
          <hemisphereLight args={['#e0f2fe', '#78350f', 0.36]} />
          <directionalLight
            position={[9, 14, 12]}
            intensity={1.58}
            color="#fef08a"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={45}
            shadow-camera-left={-12}
            shadow-camera-right={12}
            shadow-camera-top={12}
            shadow-camera-bottom={-12}
            shadow-bias={-0.0005}
          />

          <ExteriorGround />

          {/* Physical Ambient-Occlusion Contact Shadows so furniture & walls sit grounded */}
          <ContactShadows
            position={[1.0, 0.006, 1.2]}
            opacity={0.42}
            scale={20}
            blur={1.85}
            far={4.0}
            resolution={512}
            color="#0f172a"
          />

          <Suspense fallback={null}>
            <AtmosphericSkyAndWind />
            <InteriorModel />
            <FrontWallWithWindows />
            <DeepBlueTiledRoof />
            <ExteriorYardFenceAndGrass />
            <GoldenWindowSunbeams />
            <AnimatedFrontDoor scrollRef={scrollRef} />
            <KitchenSkillsShowcase />
            <LivingRoomSkillsShowcase scrollRef={scrollRef} />
            <EngineerAndArtistStudioShowcase scrollRef={scrollRef} />
          </Suspense>

          <ScrollTourCamera
            scrollRef={scrollRef}
            onActiveChapterChange={setActiveChapterIndex}
          />
        </Canvas>
      </div>
    </div>
  )
}

useGLTF.preload(MODEL_PATH)
