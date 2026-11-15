import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

/**
 * Generates physical, tileable PBR surface textures (color + bump/roughness maps)
 * for wood planks, powder-blue clapboard siding, glazed ceramic roof tiles,
 * Venetian plaster walls, veined marble countertops, woven rugs, and bouclé fabric.
 */
let cachedPBRTextures = null
export function getHousePBRTextures() {
  if (cachedPBRTextures) return cachedPBRTextures

  const makeTileable = (canvas, repeatX = 1, repeatY = 1, isColor = true) => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeatX, repeatY)
    tex.anisotropy = 8
    if (isColor && THREE.SRGBColorSpace) {
      tex.colorSpace = THREE.SRGBColorSpace
    }
    tex.needsUpdate = true
    return tex
  }

  // 1. Powder-Blue Architectural Clapboard Siding (Color + Bump)
  const sidingColorCanvas = document.createElement('canvas')
  sidingColorCanvas.width = 512
  sidingColorCanvas.height = 512
  const sCtx = sidingColorCanvas.getContext('2d')

  const sidingBumpCanvas = document.createElement('canvas')
  sidingBumpCanvas.width = 512
  sidingBumpCanvas.height = 512
  const sbCtx = sidingBumpCanvas.getContext('2d')

  const numCourses = 8
  const courseH = 512 / numCourses
  for (let i = 0; i < numCourses; i++) {
    const y0 = i * courseH
    // Subtle board-to-board tonal variation
    const grad = sCtx.createLinearGradient(0, y0, 0, y0 + courseH)
    grad.addColorStop(0, '#93d5f6')
    grad.addColorStop(0.78, '#7ec4e8')
    grad.addColorStop(0.94, '#5fa8d3')
    grad.addColorStop(1, '#3b7ea6')
    sCtx.fillStyle = grad
    sCtx.fillRect(0, y0, 512, courseH)

    // Fine horizontal wood grain fibers under the paint
    for (let g = 0; g < 18; g++) {
      const gy = y0 + ((g * 13) % (courseH - 4))
      sCtx.fillStyle = g % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.045)'
      sCtx.fillRect(0, gy, 512, 1.5)
    }

    // Bump height gradient for lap shadow
    const bGrad = sbCtx.createLinearGradient(0, y0, 0, y0 + courseH)
    bGrad.addColorStop(0, '#e2e8f0')
    bGrad.addColorStop(0.88, '#94a3b8')
    bGrad.addColorStop(0.95, '#1e293b')
    bGrad.addColorStop(1, '#0f172a')
    sbCtx.fillStyle = bGrad
    sbCtx.fillRect(0, y0, 512, courseH)
  }

  // 2. Warm Quarter-Sawn Oak Hardwood Planks (Color + Bump)
  const oakColorCanvas = document.createElement('canvas')
  oakColorCanvas.width = 512
  oakColorCanvas.height = 512
  const oCtx = oakColorCanvas.getContext('2d')

  const oakBumpCanvas = document.createElement('canvas')
  oakBumpCanvas.width = 512
  oakBumpCanvas.height = 512
  const obCtx = oakBumpCanvas.getContext('2d')

  const plankCols = 4
  const plankW = 512 / plankCols
  const oakTones = ['#b87333', '#a86528', '#c27d3c', '#9c5a20']
  for (let col = 0; col < plankCols; col++) {
    const x0 = col * plankW
    oCtx.fillStyle = oakTones[col % oakTones.length]
    oCtx.fillRect(x0, 0, plankW, 512)

    obCtx.fillStyle = '#cbd5e1'
    obCtx.fillRect(x0, 0, plankW, 512)

    // Wood grain streaks along the plank
    for (let s = 0; s < 42; s++) {
      const sx = x0 + 4 + ((s * 17) % (plankW - 8))
      oCtx.strokeStyle = s % 3 === 0 ? 'rgba(69, 26, 3, 0.22)' : 'rgba(254, 243, 199, 0.10)'
      oCtx.lineWidth = 1.5
      oCtx.beginPath()
      oCtx.moveTo(sx, 0)
      oCtx.bezierCurveTo(
        sx + (s % 2 === 0 ? 4 : -4),
        170,
        sx + (s % 2 === 0 ? -4 : 4),
        340,
        sx,
        512
      )
      oCtx.stroke()

      obCtx.strokeStyle = s % 2 === 0 ? '#94a3b8' : '#e2e8f0'
      obCtx.lineWidth = 1.2
      obCtx.beginPath()
      obCtx.moveTo(sx, 0)
      obCtx.lineTo(sx, 512)
      obCtx.stroke()
    }

    // Plank bevel seam
    oCtx.fillStyle = '#451a03'
    oCtx.fillRect(x0, 0, 3, 512)
    obCtx.fillStyle = '#0f172a'
    obCtx.fillRect(x0, 0, 4, 512)

    // Horizontal butt-joint staggered per column
    const jointY = ((col * 173 + 90) % 440) + 36
    oCtx.fillRect(x0, jointY, plankW, 3)
    obCtx.fillRect(x0, jointY, plankW, 4)
  }

  // 3. Interior Venetian Plaster / Warm Limewash Bump & Albedo
  const plasterCanvas = document.createElement('canvas')
  plasterCanvas.width = 512
  plasterCanvas.height = 512
  const pCtx = plasterCanvas.getContext('2d')
  pCtx.fillStyle = '#94a3b8'
  pCtx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 380; i++) {
    const px = (i * 73) % 512
    const py = (i * 139) % 512
    const r = 18 + (i % 36)
    const g = pCtx.createRadialGradient(px, py, 2, px, py, r)
    g.addColorStop(0, i % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)')
    g.addColorStop(1, 'rgba(148,163,184,0)')
    pCtx.fillStyle = g
    pCtx.beginPath()
    pCtx.arc(px, py, r, 0, Math.PI * 2)
    pCtx.fill()
  }

  // 4. Glazed Deep-Cobalt Ceramic Roof Tile Texture (Color + Bump)
  const roofCanvas = document.createElement('canvas')
  roofCanvas.width = 512
  roofCanvas.height = 512
  const rCtx = roofCanvas.getContext('2d')

  const roofBumpCanvas = document.createElement('canvas')
  roofBumpCanvas.width = 512
  roofBumpCanvas.height = 512
  const rbCtx = roofBumpCanvas.getContext('2d')

  const tileCols = 8
  const tileW = 512 / tileCols
  for (let c = 0; c < tileCols; c++) {
    const x0 = c * tileW
    const rGrad = rCtx.createLinearGradient(x0, 0, x0 + tileW, 0)
    rGrad.addColorStop(0, '#0f172a')
    rGrad.addColorStop(0.28, '#1e3a8a')
    rGrad.addColorStop(0.55, '#2563eb')
    rGrad.addColorStop(0.85, '#172554')
    rGrad.addColorStop(1, '#090d16')
    rCtx.fillStyle = rGrad
    rCtx.fillRect(x0, 0, tileW, 512)

    const bGrad = rbCtx.createLinearGradient(x0, 0, x0 + tileW, 0)
    bGrad.addColorStop(0, '#0f172a')
    bGrad.addColorStop(0.5, '#f8fafc')
    bGrad.addColorStop(1, '#0f172a')
    rbCtx.fillStyle = bGrad
    rbCtx.fillRect(x0, 0, tileW, 512)
  }
  for (let row = 0; row < 6; row++) {
    const ry = row * (512 / 6)
    rCtx.fillStyle = 'rgba(2, 6, 23, 0.55)'
    rCtx.fillRect(0, ry, 512, 5)
    rbCtx.fillStyle = '#020617'
    rbCtx.fillRect(0, ry, 512, 6)
  }

  // 5. Woven Bouclé Upholstery Fabric (for the Plush Blue Sofa & Throw Pillows)
  const boucleCanvas = document.createElement('canvas')
  boucleCanvas.width = 256
  boucleCanvas.height = 256
  const bCtx = boucleCanvas.getContext('2d')
  bCtx.fillStyle = '#808080'
  bCtx.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const bright = (x + y) % 8 === 0 ? '#cbd5e1' : '#475569'
      bCtx.fillStyle = bright
      bCtx.fillRect(x, y, 3, 2)
    }
  }

  // 6. Woven Moroccan Jute & Cream Area Rug Texture
  const rugCanvas = document.createElement('canvas')
  rugCanvas.width = 512
  rugCanvas.height = 512
  const rgCtx = rugCanvas.getContext('2d')
  rgCtx.fillStyle = '#f5ebd6'
  rgCtx.fillRect(0, 0, 512, 512)
  // Subtle woven warp/weft threads
  for (let y = 0; y < 512; y += 4) {
    rgCtx.fillStyle = y % 8 === 0 ? 'rgba(180, 83, 9, 0.08)' : 'rgba(255, 255, 255, 0.25)'
    rgCtx.fillRect(0, y, 512, 2)
  }
  // Double warm terracotta & espresso border frame
  rgCtx.strokeStyle = '#92400e'
  rgCtx.lineWidth = 14
  rgCtx.strokeRect(26, 26, 460, 460)
  rgCtx.strokeStyle = '#d97706'
  rgCtx.lineWidth = 4
  rgCtx.strokeRect(44, 44, 424, 424)
  // Subtle geometric diamond motif in center
  rgCtx.strokeStyle = 'rgba(146, 64, 14, 0.28)'
  rgCtx.lineWidth = 5
  rgCtx.beginPath()
  rgCtx.moveTo(256, 96)
  rgCtx.lineTo(416, 256)
  rgCtx.lineTo(256, 416)
  rgCtx.lineTo(96, 256)
  rgCtx.closePath()
  rgCtx.stroke()

  // 7. Veined Carrara Marble Texture (for Kitchen Countertops)
  const marbleCanvas = document.createElement('canvas')
  marbleCanvas.width = 512
  marbleCanvas.height = 512
  const mCtx = marbleCanvas.getContext('2d')
  mCtx.fillStyle = '#f1f5f9'
  mCtx.fillRect(0, 0, 512, 512)
  for (let v = 0; v < 14; v++) {
    mCtx.strokeStyle = v % 2 === 0 ? 'rgba(100, 116, 139, 0.22)' : 'rgba(148, 163, 184, 0.16)'
    mCtx.lineWidth = v % 3 === 0 ? 3.5 : 1.8
    mCtx.beginPath()
    let vx = (v * 67) % 512
    let vy = 0
    mCtx.moveTo(vx, vy)
    while (vy < 512) {
      vy += 64
      vx += Math.sin(vy * 0.03 + v) * 28
      mCtx.lineTo(vx, vy)
    }
    mCtx.stroke()
  }

  // 8. lush Sunlit Meadow Grass & Soil Texture (for Exterior Yard Ground)
  const lawnCanvas = document.createElement('canvas')
  lawnCanvas.width = 512
  lawnCanvas.height = 512
  const lCtx = lawnCanvas.getContext('2d')
  lCtx.fillStyle = '#38a169'
  lCtx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 900; i++) {
    const gx = (i * 97) % 512
    const gy = (i * 151) % 512
    lCtx.fillStyle = i % 3 === 0 ? '#2f855a' : i % 3 === 1 ? '#48bb78' : '#276749'
    lCtx.fillRect(gx, gy, 4, 9)
  }

  // 9. Natural Limestone Paver Walkway Texture
  const stoneCanvas = document.createElement('canvas')
  stoneCanvas.width = 512
  stoneCanvas.height = 512
  const stCtx = stoneCanvas.getContext('2d')
  stCtx.fillStyle = '#e2e8f0'
  stCtx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 240; i++) {
    const sx = (i * 53) % 512
    const sy = (i * 89) % 512
    stCtx.fillStyle = i % 2 === 0 ? 'rgba(203, 213, 225, 0.5)' : 'rgba(248, 250, 252, 0.6)'
    stCtx.fillRect(sx, sy, 18, 14)
  }
  stCtx.strokeStyle = '#94a3b8'
  stCtx.lineWidth = 4
  for (let y = 0; y < 512; y += 128) {
    stCtx.beginPath()
    stCtx.moveTo(0, y)
    stCtx.lineTo(512, y)
    stCtx.stroke()
  }

  cachedPBRTextures = {
    sidingMap: makeTileable(sidingColorCanvas, 3, 2, true),
    sidingBump: makeTileable(sidingBumpCanvas, 3, 2, false),
    oakMap: makeTileable(oakColorCanvas, 2, 2, true),
    oakBump: makeTileable(oakBumpCanvas, 2, 2, false),
    plasterBump: makeTileable(plasterCanvas, 2, 2, false),
    roofMap: makeTileable(roofCanvas, 4, 2, true),
    roofBump: makeTileable(roofBumpCanvas, 4, 2, false),
    boucleBump: makeTileable(boucleCanvas, 6, 6, false),
    rugMap: makeTileable(rugCanvas, 1, 1, true),
    marbleMap: makeTileable(marbleCanvas, 2, 2, true),
    lawnMap: makeTileable(lawnCanvas, 18, 18, true),
    stoneMap: makeTileable(stoneCanvas, 1, 6, true),
  }

  return cachedPBRTextures
}

/**
 * Generates clean, borderless diegetic 3D editorial/stencil typography (NO neon pill boxes!).
 * Uses rich multi-layer drop shadows and warm subtle glow so it sits naturally in the 3D scene.
 */
function useFloatingTextTexture(lines, options = {}) {
  const {
    color = '#ffffff',
    subColor = '#fde68a',
    stroke = 'rgba(15, 23, 42, 0.95)',
    align = 'center',
    fontSize = 82,
    subFontSize = 44,
    width = 1024,
    height = 380,
  } = options

  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    const xPos = align === 'center' ? width / 2 : align === 'right' ? width - 48 : 48

    let yCursor = lines.length > 1 ? height * 0.38 : height * 0.5
    lines.forEach((lineObj) => {
      const text = typeof lineObj === 'string' ? lineObj : lineObj.text
      const isSub = typeof lineObj === 'object' && lineObj.sub
      const size = isSub ? subFontSize : fontSize

      ctx.font = isSub
        ? `700 ${size}px "Plus Jakarta Sans", "Segoe UI", sans-serif`
        : `italic 400 ${Math.round(size * 1.14)}px "Instrument Serif", Georgia, "Times New Roman", serif`

      // Deep soft ambient occlusion shadow behind letters
      ctx.shadowColor = 'rgba(2, 6, 23, 0.88)'
      ctx.shadowBlur = isSub ? 14 : 22
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 6

      ctx.lineWidth = isSub ? 7 : 12
      ctx.lineJoin = 'round'
      ctx.strokeStyle = stroke
      ctx.strokeText(text, xPos, yCursor)

      ctx.shadowBlur = 4
      ctx.fillStyle = isSub ? subColor : color
      ctx.fillText(text, xPos, yCursor)

      yCursor += size * 1.28
    })

    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [lines, color, subColor, stroke, align, fontSize, subFontSize, width, height])
}

/**
 * Hanging wooden "WELCOME" sign on the front door.
 */
export function useWelcomeSignTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(0, 0, 512, 256)

    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = 14
    ctx.strokeRect(14, 14, 484, 228)

    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 4
    ctx.strokeRect(28, 28, 456, 200)

    ctx.fillStyle = '#78350f'
    ctx.font = '900 68px Georgia, "Times New Roman", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('WELCOME', 256, 108)

    ctx.fillStyle = '#b45309'
    ctx.font = 'italic 700 26px "Inter", sans-serif'
    ctx.fillText('ARCHITECTURAL RESIDENCE', 256, 168)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

/**
 * Generates decorative souvenir & botanical magnet textures for the refrigerator door.
 */
function useMagnetFaceTexture(variant) {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 512, 512)

    if (variant === 'prompt-ai') {
      // Decorative Ceramic Coastal Sun Magnet
      const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 240)
      grad.addColorStop(0, '#fdba74')
      grad.addColorStop(0.7, '#ea580c')
      grad.addColorStop(1, '#9a3412')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(256, 256, 240, 0, Math.PI * 2)
      ctx.fill()

      // Stylized Golden Sun
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(256, 190, 75, 0, Math.PI * 2)
      ctx.fill()

      // Ocean Waves
      ctx.fillStyle = '#0284c7'
      ctx.beginPath()
      ctx.arc(256, 330, 150, Math.PI, 0, false)
      ctx.fill()
    } else if (variant === 'nlp-ai') {
      // Decorative Botanical Fern Magnet
      ctx.fillStyle = '#064e3b'
      ctx.beginPath()
      ctx.arc(256, 256, 240, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#6ee7b7'
      ctx.lineWidth = 14
      ctx.beginPath()
      ctx.arc(256, 256, 215, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#34d399'
      ctx.beginPath()
      ctx.ellipse(256, 256, 65, 140, Math.PI / 6, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.arc(256, 256, 240, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 14
      ctx.beginPath()
      ctx.arc(256, 256, 215, 0, Math.PI * 2)
      ctx.stroke()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [variant])
}

/**
 * Generates an authentic architectural newspaper broadsheet texture for the Living Room coffee table.
 */
function useNewspaperPageTexture(pageType) {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#faf6ee'
    ctx.fillRect(0, 0, 1024, 1024)

    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 8
    ctx.strokeRect(24, 24, 976, 976)
    ctx.lineWidth = 2
    ctx.strokeRect(36, 36, 952, 952)

    if (pageType === 'page1-front') {
      // Masthead
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 48px Georgia, "Times New Roman", serif'
      ctx.textAlign = 'center'
      ctx.fillText('✦ THE DAILY ARCHITECTURAL GAZETTE ✦', 512, 92)

      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(52, 116)
      ctx.lineTo(972, 116)
      ctx.moveTo(52, 148)
      ctx.lineTo(972, 148)
      ctx.stroke()

      ctx.fillStyle = '#475569'
      ctx.font = '600 20px "Inter", sans-serif'
      ctx.fillText('RESIDENTIAL EDITION  •  CONTEMPORARY INTERIORS & FORMS  •  ISSUE NO. 142', 512, 136)

      // Main Story Headline
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 42px Georgia, serif'
      ctx.fillText('Contemporary Timber & Siding Residence Completed', 512, 204)

      ctx.fillStyle = '#64748b'
      ctx.font = 'italic 20px Georgia, serif'
      ctx.fillText('A study in balanced proportions, natural daylight, and crafted materials', 512, 238)

      // Architectural Illustration Frame
      ctx.fillStyle = '#f1f5f9'
      ctx.fillRect(56, 260, 440, 310)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 3
      ctx.strokeRect(56, 260, 440, 310)

      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(76, 540)
      ctx.lineTo(476, 540)
      ctx.strokeRect(110, 360, 300, 180)
      ctx.moveTo(90, 360)
      ctx.lineTo(260, 280)
      ctx.lineTo(430, 360)
      ctx.closePath()
      ctx.stroke()
      ctx.strokeRect(140, 390, 70, 70)
      ctx.strokeRect(310, 390, 70, 70)
      ctx.strokeRect(235, 430, 50, 110)
      ctx.stroke()

      ctx.fillStyle = '#64748b'
      ctx.font = 'italic 16px Georgia, serif'
      ctx.textAlign = 'left'
      ctx.fillText('Fig 1. Front elevation & pitched roof profile.', 64, 595)

      // Column Text
      const colText = [
        'The newly constructed residence combines classical craft with modern clarity. Approaching along the centered limestone pathway, the house presents a harmonious rhythm of materials: powder-blue clapboard siding, quarter-sawn oak flooring, and deep navy glazed roof tiles.',
        'Natural light streams through expansive front picture windows, bathing the plush bouclé living room in warm morning sun. An open architectural flow seamlessly connects the kitchen island, dining nook, and tranquil garden exterior.',
        'Ascending the central oak staircase reveals a private loft with exposed timber A-frame rafters, providing a dedicated sanctuary for architectural study, hand sketching, and creative craft.',
      ]
      colText.forEach((p, idx) => {
        const py = 275 + idx * 115
        ctx.fillStyle = '#334155'
        ctx.font = '15px/22px Georgia, serif'
        ctx.fillText(p.slice(0, 68), 520, py)
        ctx.fillText(p.slice(68, 138), 520, py + 24)
        ctx.fillText(p.slice(138, 208), 520, py + 48)
        ctx.fillText(p.slice(208), 520, py + 72)
      })

      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(56, 620)
      ctx.lineTo(968, 620)
      ctx.stroke()

      const bottomCols = [
        { h: 'MATERIAL INTEGRITY', b: 'Real timber, honest joinery, and durable stone create a home that patinas gracefully over decades.' },
        { h: 'DAYLIGHT & VENTILATION', b: 'Expansive windows and high vaulted ceilings ensure ample cross-ventilation and golden morning rays.' },
        { h: 'CRAFT & DETAIL', b: 'Every transition strip, balustrade spindle, and door casing reflects intentional architectural care.' },
      ]
      bottomCols.forEach((bc, bIdx) => {
        const bx = 56 + bIdx * 310
        ctx.fillStyle = '#0f172a'
        ctx.font = '700 18px "Inter", sans-serif'
        ctx.fillText(bc.h, bx, 660)
        ctx.fillStyle = '#475569'
        ctx.font = '15px/22px Georgia, serif'
        ctx.fillText(bc.b.slice(0, 42), bx, 692)
        ctx.fillText(bc.b.slice(42, 85), bx, 716)
        ctx.fillText(bc.b.slice(85), bx, 740)
      })
    } else {
      // Inside Page 2
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 38px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('✦ ARCHITECTURAL PLANS & INTERIOR DETAILS ✦', 512, 86)

      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(52, 110)
      ctx.lineTo(972, 110)
      ctx.stroke()

      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(56, 140, 912, 420)
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 3
      ctx.strokeRect(56, 140, 912, 420)

      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 4
      ctx.strokeRect(100, 180, 240, 320)
      ctx.strokeRect(340, 280, 360, 220)
      ctx.strokeRect(340, 180, 180, 100)
      ctx.strokeRect(520, 180, 180, 100)

      ctx.fillStyle = '#0f172a'
      ctx.font = '700 20px "Inter", sans-serif'
      ctx.fillText('KITCHEN & DINING', 220, 340)
      ctx.fillText('LIVING ROOM', 520, 390)
      ctx.fillText('BATH', 430, 235)
      ctx.fillText('BEDROOM', 610, 235)

      ctx.fillStyle = '#334155'
      ctx.font = '16px/26px Georgia, serif'
      ctx.textAlign = 'left'
      ctx.fillText('The plan emphasizes generous living proportions and dedicated functional zones.', 60, 600)
      ctx.fillText('A continuous spatial flow guides movement effortlessly from the front entrance through to the private loft.', 60, 630)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [pageType])
}

/**
 * Generates high-DPI illustrated sketchbook page textures for the Attic Art Studio:
 *  - 'sketch-page1-front': Meraki Fine Art Society & Architectural Charcoal/Graphite Studies
 *  - 'sketch-page1-back': Graphite cross-hatching & perspective grid notes
 *  - 'sketch-page2-inside': Machaan Theatre Stage Design & UI/UX Wireframe Storyboards
 */
function useSketchbookPageTexture(pageType) {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    // Warm cream heavy-tooth cartridge sketchbook paper
    ctx.fillStyle = '#faf5e8'
    ctx.fillRect(0, 0, 1024, 1024)

    // Subtle paper grain & deckle edge shading
    for (let i = 0; i < 420; i++) {
      const gx = (i * 173) % 1024
      const gy = (i * 251) % 1024
      ctx.fillStyle = i % 2 === 0 ? 'rgba(180, 165, 140, 0.14)' : 'rgba(255, 255, 255, 0.25)'
      ctx.fillRect(gx, gy, 8, 3)
    }

    // Spiral binding rings along the left spine
    for (let y = 72; y <= 952; y += 64) {
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.arc(36, y, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(8, y - 4)
      ctx.lineTo(42, y - 4)
      ctx.stroke()
    }

    // Hand-drawn graphite border frame
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)'
    ctx.lineWidth = 3
    ctx.strokeRect(68, 44, 912, 936)

    if (pageType === 'sketch-page1-front') {
      // Header in classical architectural serif
      ctx.fillStyle = '#1e293b'
      ctx.font = 'italic 700 38px "Instrument Serif", Georgia, serif'
      ctx.textAlign = 'left'
      ctx.fillText('STUDIO SKETCHBOOK VOL. I — PERSPECTIVE & BOTANICAL STUDIES', 96, 104)

      ctx.fillStyle = '#64748b'
      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif'
      ctx.fillText('CHARCOAL, GRAPHITE 4B & RAW UMBER WATERCOLOR WASH ON ROUGH COTTON', 96, 140)

      // Divider line
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(96, 160)
      ctx.lineTo(948, 160)
      ctx.stroke()

      // Left Box: Architectural Perspective Sketch of the 3D House & Portico
      ctx.fillStyle = '#f8f4eb'
      ctx.fillRect(96, 185, 412, 420)
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2.5
      ctx.strokeRect(96, 185, 412, 420)

      // Perspective vanishing lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'
      ctx.lineWidth = 1.2
      for (let i = 0; i < 7; i++) {
        ctx.beginPath()
        ctx.moveTo(302, 260)
        ctx.lineTo(106 + i * 65, 590)
        ctx.stroke()
      }

      // Charcoal sketch of pitched roof pavilion & columns
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(145, 360)
      ctx.lineTo(302, 240)
      ctx.lineTo(458, 360)
      ctx.closePath()
      ctx.stroke()
      ctx.strokeRect(175, 360, 254, 185)
      ctx.strokeRect(266, 425, 72, 120)

      // Graphite cross-hatching shading on sketch
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)'
      ctx.lineWidth = 1.8
      for (let h = 0; h < 14; h++) {
        ctx.beginPath()
        ctx.moveTo(182 + h * 8, 368)
        ctx.lineTo(175, 375 + h * 8)
        ctx.stroke()
      }

      ctx.fillStyle = '#334155'
      ctx.font = 'italic 600 22px Georgia, serif'
      ctx.fillText('Plate 1. Two-Point Horizon & Roof Geometry', 120, 582)

      // Right Box: Botanical Ink Wash Sketch
      ctx.fillStyle = '#f8f4eb'
      ctx.fillRect(536, 185, 412, 420)
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2.5
      ctx.strokeRect(536, 185, 412, 420)

      // Watercolor wash splashes (warm ochre, cobalt blue, terracotta)
      ctx.fillStyle = 'rgba(2, 132, 199, 0.18)'
      ctx.beginPath()
      ctx.arc(710, 345, 92, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(234, 88, 12, 0.18)'
      ctx.beginPath()
      ctx.arc(775, 395, 78, 0, Math.PI * 2)
      ctx.fill()

      // Fine ink botanical contour lines
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 3.2
      ctx.beginPath()
      ctx.arc(740, 355, 68, 0.2, Math.PI * 1.65)
      ctx.stroke()
      for (let leaf = 0; leaf < 6; leaf++) {
        ctx.beginPath()
        ctx.ellipse(688 + leaf * 26, 392 - leaf * 20, 34, 14, -0.5 + leaf * 0.2, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = '#334155'
      ctx.font = 'italic 600 22px Georgia, serif'
      ctx.fillText('Plate 2. Fern Silhouette & Mineral Pigment Wash', 562, 582)

      // Bottom Feature Banner: Classical Figure Study & Light Plane Geometry
      ctx.fillStyle = '#f1ece1'
      ctx.fillRect(96, 635, 852, 305)
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2.5
      ctx.strokeRect(96, 635, 852, 305)

      // Three shaded figure gesture studies
      const gestureX = [240, 522, 800]
      gestureX.forEach((gx, idx) => {
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 2.5
        // Head oval
        ctx.beginPath()
        ctx.ellipse(gx, 695, 20, 26, idx === 0 ? -0.15 : idx === 1 ? 0 : 0.2, 0, Math.PI * 2)
        ctx.stroke()
        // Torso / spine curve
        ctx.beginPath()
        ctx.moveTo(gx, 722)
        ctx.quadraticCurveTo(gx + (idx - 1) * 22, 790, gx + (idx === 1 ? 0 : 18), 855)
        ctx.stroke()
        // Arms / balance lines
        ctx.beginPath()
        ctx.moveTo(gx - 36, 755)
        ctx.lineTo(gx + 36, 745)
        ctx.stroke()
        // Shading hatch lines
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)'
        ctx.lineWidth = 1.5
        for (let s = 0; s < 6; s++) {
          ctx.beginPath()
          ctx.moveTo(gx - 18 + s * 7, 765)
          ctx.lineTo(gx - 8 + s * 7, 815)
          ctx.stroke()
        }
      })

      ctx.fillStyle = '#1e293b'
      ctx.font = 'italic 600 24px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('Plate 3. Dynamic Human Figure Gestures & Foreshortening Studies (Charcoal 2B)', 522, 905)
    } else if (pageType === 'sketch-page2-inside') {
      // Page 2 after Flip: Alpine Landscape & Architectural Elevations
      ctx.fillStyle = '#0f172a'
      ctx.font = 'italic 700 38px "Instrument Serif", Georgia, serif'
      ctx.textAlign = 'left'
      ctx.fillText('STUDIO SKETCHBOOK VOL. II — LANDSCAPE & ATMOSPHERIC LIGHT', 96, 104)

      ctx.fillStyle = '#64748b'
      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif'
      ctx.fillText('FIELD DRAWINGS • PENCIL HATCHING • VALUATION & TONAL CONTRASTS', 96, 140)

      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(96, 160)
      ctx.lineTo(948, 160)
      ctx.stroke()

      // Top Sketch: Mountain Valley Panorama
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(96, 185, 852, 345)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2
      ctx.strokeRect(96, 185, 852, 345)

      // Mountain Ridges with hatching
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(96, 420)
      ctx.lineTo(260, 270)
      ctx.lineTo(440, 360)
      ctx.lineTo(620, 240)
      ctx.lineTo(790, 340)
      ctx.lineTo(948, 280)
      ctx.stroke()

      // Atmospheric ridge shading
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)'
      ctx.beginPath()
      ctx.moveTo(96, 530)
      ctx.lineTo(96, 420)
      ctx.lineTo(260, 270)
      ctx.lineTo(440, 360)
      ctx.lineTo(620, 240)
      ctx.lineTo(790, 340)
      ctx.lineTo(948, 280)
      ctx.lineTo(948, 530)
      ctx.closePath()
      ctx.fill()

      // Pine tree silhouettes
      for (let tx = 135; tx < 920; tx += 48) {
        ctx.fillStyle = '#022c22'
        ctx.beginPath()
        ctx.moveTo(tx, 450)
        ctx.lineTo(tx + 12, 515)
        ctx.lineTo(tx - 12, 515)
        ctx.closePath()
        ctx.fill()
      }

      ctx.fillStyle = '#fef08a'
      ctx.font = 'italic 600 24px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('Study I. High Altitude Ridge & Timberline Silhouette', 522, 235)

      // Bottom Two Sketch Boxes: Architectural Cross-Section + Tonal Still Life
      ctx.textAlign = 'left'
      ctx.fillStyle = '#f8f4eb'
      ctx.fillRect(96, 560, 412, 380)
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2.5
      ctx.strokeRect(96, 560, 412, 380)

      ctx.fillStyle = '#0f172a'
      ctx.font = 'italic 700 24px Georgia, serif'
      ctx.fillText('Study II. Architectural Section', 124, 604)

      // Section drawing
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2.5
      ctx.strokeRect(132, 632, 340, 240)
      ctx.strokeRect(175, 715, 120, 157)
      ctx.strokeRect(335, 665, 110, 80)
      ctx.beginPath()
      ctx.moveTo(115, 632)
      ctx.lineTo(302, 595)
      ctx.lineTo(488, 632)
      ctx.stroke()

      ctx.fillStyle = '#64748b'
      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif'
      ctx.fillText('• 1:50 Timber Truss Rafter Detail', 124, 905)

      ctx.fillStyle = '#f8f4eb'
      ctx.fillRect(536, 560, 412, 380)
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2.5
      ctx.strokeRect(536, 560, 412, 380)

      ctx.fillStyle = '#0f172a'
      ctx.font = 'italic 700 24px Georgia, serif'
      ctx.fillText('Study III. Shaded Spheres & Drapery', 564, 604)

      // Spheres with core shadow & reflected light
      const sphereGrad = ctx.createRadialGradient(710, 715, 15, 742, 750, 70)
      sphereGrad.addColorStop(0, '#ffffff')
      sphereGrad.addColorStop(0.5, '#94a3b8')
      sphereGrad.addColorStop(1, '#0f172a')
      ctx.fillStyle = sphereGrad
      ctx.beginPath()
      ctx.arc(742, 750, 68, 0, Math.PI * 2)
      ctx.fill()

      // Cast shadow under sphere
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'
      ctx.beginPath()
      ctx.ellipse(755, 832, 78, 18, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#64748b'
      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif'
      ctx.fillText('• Cast Shadow & Ambient Occlusion Study', 564, 905)
    } else {
      // Back of flipping sketchbook sheet: Graphite anatomy & geometric studies
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 3
      ctx.strokeRect(110, 110, 804, 804)
      for (let r = 80; r <= 320; r += 60) {
        ctx.beginPath()
        ctx.arc(512, 512, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = '#334155'
      ctx.font = 'italic 700 36px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('VITRUVIAN PROPORTION & PERSPECTIVE GRID', 512, 180)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [pageType])
}

/**
 * Generates original artwork textures for Akanksha's Meraki Art & Machaan Theatre Studio.
 */
function useStudioArtworkTexture(variant) {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    if (variant === 'easel-masterpiece') {
      // Rich midnight cobalt & golden-hour impasto landscape with swirling stars
      const grad = ctx.createLinearGradient(0, 0, 0, 512)
      grad.addColorStop(0, '#090d16')
      grad.addColorStop(0.45, '#1e3a8a')
      grad.addColorStop(0.78, '#c2410c')
      grad.addColorStop(1, '#fde047')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 512, 512)

      // Glowing crescent moon & swirling brushstrokes
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(370, 118, 52, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)'
      ctx.lineWidth = 10
      ctx.lineCap = 'round'
      for (let i = 0; i < 7; i++) {
        ctx.beginPath()
        ctx.arc(170 + i * 32, 165 + (i % 2) * 28, 38 + i * 7, 0.2, Math.PI * 1.35)
        ctx.stroke()
      }

      // Mountain silhouettes
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.moveTo(0, 410)
      ctx.lineTo(145, 285)
      ctx.lineTo(275, 375)
      ctx.lineTo(410, 255)
      ctx.lineTo(512, 355)
      ctx.lineTo(512, 512)
      ctx.lineTo(0, 512)
      ctx.closePath()
      ctx.fill()
    } else if (variant === 'machaan-theatre') {
      // Crimson & gold theatrical spotlight stage artwork
      const grad = ctx.createRadialGradient(256, 120, 20, 256, 280, 380)
      grad.addColorStop(0, '#fde047')
      grad.addColorStop(0.4, '#be123c')
      grad.addColorStop(1, '#1e1b4b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 512, 512)

      // Golden stage beam cone
      ctx.fillStyle = 'rgba(254, 240, 138, 0.32)'
      ctx.beginPath()
      ctx.moveTo(256, 24)
      ctx.lineTo(75, 490)
      ctx.lineTo(437, 490)
      ctx.closePath()
      ctx.fill()

      // Stylized theatre masks / dramatic silhouette
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(210, 290, 52, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(305, 310, 52, 0, Math.PI * 2)
      ctx.stroke()

      // Proscenium drapery folds
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(120, 140, 0, 320)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(512, 0)
      ctx.quadraticCurveTo(392, 140, 512, 320)
      ctx.closePath()
      ctx.fill()
    } else {
      // Meraki botanical & geometric study
      ctx.fillStyle = '#fefce8'
      ctx.fillRect(0, 0, 512, 512)

      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(175, 190, 95, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#0284c7'
      ctx.beginPath()
      ctx.arc(335, 325, 105, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 9
      ctx.beginPath()
      ctx.moveTo(120, 445)
      ctx.quadraticCurveTo(256, 240, 390, 85)
      ctx.stroke()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [variant])
}

/**
 * Generates an animated-style Oscilloscope CRT screen texture for the Silicon Lab Bench.
 */
function useOscilloscopeScreenTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 340
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#022c22'
    ctx.fillRect(0, 0, 512, 340)

    // Graticule grid
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.22)'
    ctx.lineWidth = 2
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 340)
      ctx.stroke()
    }
    for (let y = 0; y <= 340; y += 56) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    // Channel 1: High-Gain Op-Amp Sine Wave (Cyan/Green)
    ctx.strokeStyle = '#34d399'
    ctx.lineWidth = 6
    ctx.beginPath()
    for (let x = 16; x < 496; x += 4) {
      const y = 140 + Math.sin((x / 480) * Math.PI * 4) * 72
      if (x === 16) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Channel 2: 4-Bit CMOS Latch Clock Pulse (Yellow)
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 4
    ctx.beginPath()
    for (let x = 16; x < 496; x += 60) {
      ctx.lineTo(x, 285)
      ctx.lineTo(x, 240)
      ctx.lineTo(x + 30, 240)
      ctx.lineTo(x + 30, 285)
    }
    ctx.stroke()

    ctx.fillStyle = '#6ee7b7'
    ctx.font = '800 22px monospace'
    ctx.fillText('CH1: 1.20 Vpp  |  FREQ: 10.00 kHz  |  TIME: 50.0 µs/div', 22, 34)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

/**
 * Generates an ambient 4K scenic wallpaper screen for the Living Room TV console.
 */
function useLivingRoomTVScreenTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const ctx = canvas.getContext('2d')

    // Ambient Golden Sunset Gradient (The Frame style)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 240)
    skyGrad.addColorStop(0, '#0f172a')
    skyGrad.addColorStop(0.35, '#1e293b')
    skyGrad.addColorStop(0.7, '#ea580c')
    skyGrad.addColorStop(1, '#fde047')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, 640, 240)

    // Glowing Golden Sun
    ctx.fillStyle = 'rgba(254, 240, 138, 0.95)'
    ctx.beginPath()
    ctx.arc(380, 150, 42, 0, Math.PI * 2)
    ctx.fill()

    // Distant Mountain Silhouettes
    ctx.fillStyle = '#431407'
    ctx.beginPath()
    ctx.moveTo(0, 210)
    ctx.lineTo(120, 140)
    ctx.lineTo(240, 190)
    ctx.lineTo(360, 120)
    ctx.lineTo(480, 175)
    ctx.lineTo(640, 130)
    ctx.lineTo(640, 240)
    ctx.lineTo(0, 240)
    ctx.fill()

    // Near Ridge Silhouette
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.moveTo(0, 230)
    ctx.lineTo(160, 180)
    ctx.lineTo(320, 220)
    ctx.lineTo(520, 170)
    ctx.lineTo(640, 210)
    ctx.lineTo(640, 240)
    ctx.lineTo(0, 240)
    ctx.fill()

    // Lake Reflection
    const waterGrad = ctx.createLinearGradient(0, 240, 0, 360)
    waterGrad.addColorStop(0, '#78350f')
    waterGrad.addColorStop(0.3, '#1c1917')
    waterGrad.addColorStop(1, '#0c0a09')
    ctx.fillStyle = waterGrad
    ctx.fillRect(0, 240, 640, 120)

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.35)'
    ctx.lineWidth = 1.5
    for (let r = 0; r < 8; r++) {
      ctx.beginPath()
      ctx.moveTo(340 - r * 18, 245 + r * 14)
      ctx.lineTo(420 + r * 18, 245 + r * 14)
      ctx.stroke()
    }

    // Minimalist Clock & Weather in Top-Left Corner
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 28px "Inter", sans-serif'
    ctx.fillText('10:24 AM', 32, 48)

    ctx.fillStyle = '#fde047'
    ctx.font = '500 16px "Inter", sans-serif'
    ctx.fillText('72° F  •  Sunny  •  Ambient Display', 32, 74)

    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [])
}

/**
 * Clean, borderless 3D floating typography plane (disabled to keep 3D asset pure).
 */
function FloatingLabel3D() {
  return null
}

/**
 * Warm Volumetric Golden Sunbeams slanting through the house windows + drifting golden dust motes.
 * Gives the interior a cozy, sunlit miniature-diorama atmosphere!
 */
export function GoldenWindowSunbeams() {
  const beamTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const grad = ctx.createLinearGradient(0, 0, 0, 512)
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.22)')
    grad.addColorStop(0.5, 'rgba(253, 224, 71, 0.10)')
    grad.addColorStop(1, 'rgba(253, 224, 71, 0.0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 512)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  const motesRef = useRef(null)
  const motes = useMemo(() => {
    const arr = []
    for (let i = 0; i < 36; i++) {
      arr.push({
        id: i,
        x: -2.8 + ((i * 7) % 10) * 0.82,
        y: 0.45 + ((i * 3) % 7) * 0.24,
        z: -1.2 + ((i * 5) % 9) * 0.65,
        phase: i * 0.9,
      })
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (!motesRef.current) return
    const t = clock.getElapsedTime()
    motesRef.current.children.forEach((child, idx) => {
      const m = motes[idx]
      if (!m) return
      child.position.y = m.y + Math.sin(t * 1.2 + m.phase) * 0.08
      child.position.x = m.x + Math.cos(t * 0.8 + m.phase) * 0.05
    })
  })

  return (
    <group>
      {/* Sunbeam streaming through the Left Kitchen Window */}
      <mesh
        position={[-2.65, 1.15, 3.85]}
        rotation={[0.48, -0.18, -0.12]}
      >
        <coneGeometry args={[0.95, 2.8, 16, 1, true]} />
        <meshBasicMaterial
          map={beamTex}
          transparent
          opacity={0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Sunbeams streaming through the Right Living Room Panoramic Window */}
      {[1.85, 3.25].map((bx, i) => (
        <mesh
          key={`lbeam-${i}`}
          position={[bx, 1.12, 3.65]}
          rotation={[0.52, -0.22, -0.1]}
        >
          <coneGeometry args={[1.15, 3.1, 16, 1, true]} />
          <meshBasicMaterial
            map={beamTex}
            transparent
            opacity={0.5}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Sunbeam streaming into the Living Room Side Table from the East Window */}
      <mesh
        position={[4.85, 1.18, 2.35]}
        rotation={[0.15, 0, 0.52]}
      >
        <coneGeometry args={[0.9, 2.6, 16, 1, true]} />
        <meshBasicMaterial
          map={beamTex}
          transparent
          opacity={0.48}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Floating Golden Dust Motes in the Sunlit Interior */}
      <group ref={motesRef}>
        {motes.map((m) => (
          <mesh key={`mote-${m.id}`} position={[m.x, m.y, m.z]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/**
 * Custom Baby-Blue Front Wall (at z = 5.10) with two SEE-THROUGH windows.
 */
export function FrontWallWithWindows() {
  const { sidingMap, sidingBump, oakMap, oakBump } = useMemo(() => getHousePBRTextures(), [])
  return (
    <group position={[0, 0, 5.10]}>
      <mesh position={[-3.41, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.26, 2.5, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>

      <mesh position={[-2.74, 0.51, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.08, 1.02, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>
      <mesh position={[-2.74, 2.26, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.08, 0.48, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>
      <group position={[-2.74, 1.52, 0]}>
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[1.12, 0.055, 0.24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.49, 0.03]} castShadow>
          <boxGeometry args={[1.16, 0.065, 0.28]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[-0.52, 0, 0]} castShadow>
          <boxGeometry args={[0.055, 1.0, 0.23]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.045, 1.0, 0.22]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0.52, 0, 0]} castShadow>
          <boxGeometry args={[0.055, 1.0, 0.23]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.02, 0]} castShadow>
          <boxGeometry args={[1.06, 0.04, 0.22]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.04, 0.94]} />
          <meshStandardMaterial
            color="#e0f2fe"
            transparent
            opacity={0.14}
            roughness={0.1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.60, 0.18]} castShadow receiveShadow>
          <boxGeometry args={[1.04, 0.15, 0.2]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.015} color="#b45309" roughness={0.55} />
        </mesh>
        {[-0.36, -0.12, 0.12, 0.36].map((fx, idx) => (
          <group key={`lfl-${idx}`} position={[fx, -0.49, 0.18]}>
            <mesh castShadow>
              <sphereGeometry args={[0.085, 10, 10]} />
              <meshStandardMaterial color="#22c55e" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.065, 0.02]}>
              <sphereGeometry args={[0.042, 8, 8]} />
              <meshStandardMaterial
                color={idx % 2 === 0 ? '#f472b6' : '#facc15'}
                roughness={0.4}
              />
            </mesh>
          </group>
        ))}
      </group>

      <mesh position={[-1.59, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.22, 2.5, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>

      <mesh position={[-0.53, 2.27, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.46, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>
      <mesh position={[-0.99, 1.02, 0]} castShadow>
        <boxGeometry args={[0.06, 2.08, 0.24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[-0.07, 1.02, 0]} castShadow>
        <boxGeometry args={[0.06, 2.08, 0.24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[-0.53, 2.05, 0]} castShadow>
        <boxGeometry args={[0.98, 0.06, 0.24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      <mesh position={[0.39, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.94, 2.5, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>

      <mesh position={[2.56, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.68, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>
      <mesh position={[2.56, 2.27, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.46, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>
      <group position={[2.56, 1.36, 0]}>
        <mesh position={[0, 0.66, 0]} castShadow>
          <boxGeometry args={[3.44, 0.06, 0.24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.67, 0.03]} castShadow>
          <boxGeometry args={[3.48, 0.07, 0.28]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {[-1.68, -0.56, 0.56, 1.68].map((mx, idx) => (
          <mesh key={`rmul-${idx}`} position={[mx, 0, 0]} castShadow>
            <boxGeometry args={[0.055, 1.36, 0.23]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[3.36, 0.045, 0.22]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[3.34, 1.3]} />
          <meshStandardMaterial
            color="#e0f2fe"
            transparent
            opacity={0.14}
            roughness={0.1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.79, 0.18]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.16, 0.2]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.015} color="#b45309" roughness={0.55} />
        </mesh>
        {[-1.3, -0.9, -0.5, -0.1, 0.3, 0.7, 1.1, 1.4].map((fx, idx) => (
          <group key={`rfl-${idx}`} position={[fx, -0.67, 0.18]}>
            <mesh castShadow>
              <sphereGeometry args={[0.095, 10, 10]} />
              <meshStandardMaterial color="#16a34a" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.075, 0.02]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial
                color={idx % 3 === 0 ? '#38bdf8' : idx % 3 === 1 ? '#f472b6' : '#fde047'}
                roughness={0.4}
              />
            </mesh>
          </group>
        ))}
      </group>

      <mesh position={[5.06, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 2.5, 0.2]} />
        <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.025} roughness={0.58} />
      </mesh>
    </group>
  )
}

/**
 * Smooth Atmospheric Sky Dome Shader + Soft Volumetric Moving Clouds + Wind Streamlines.
 */
export function AtmosphericSkyAndWind() {
  const cloudPuffTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 256, 256)

    const puffs = [
      { x: 128, y: 132, r: 96, a: 0.55 },
      { x: 92, y: 138, r: 72, a: 0.45 },
      { x: 164, y: 136, r: 74, a: 0.45 },
      { x: 128, y: 102, r: 78, a: 0.5 },
    ]

    puffs.forEach((p) => {
      const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r)
      grad.addColorStop(0, `rgba(255, 255, 255, ${p.a})`)
      grad.addColorStop(0.45, `rgba(248, 250, 252, ${p.a * 0.72})`)
      grad.addColorStop(0.75, `rgba(224, 242, 254, ${p.a * 0.28})`)
      grad.addColorStop(1, 'rgba(224, 242, 254, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    })

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  const windStreakTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 512, 64)

    const grad = ctx.createLinearGradient(0, 32, 512, 32)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)')
    grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.32)')
    grad.addColorStop(0.5, 'rgba(224, 242, 254, 0.55)')
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.32)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.strokeStyle = grad
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(16, 36)
    ctx.bezierCurveTo(160, 12, 350, 52, 496, 26)
    ctx.stroke()

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  const skyShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.38, 0.34, -0.86).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform vec3 uSunDir;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);

          vec3 horizonCol = vec3(0.99, 0.92, 0.84);
          vec3 lowSkyCol  = vec3(0.68, 0.88, 0.99);
          vec3 midSkyCol  = vec3(0.28, 0.66, 0.96);
          vec3 zenithCol  = vec3(0.11, 0.34, 0.78);

          vec3 col = mix(horizonCol, lowSkyCol, smoothstep(0.0, 0.14, h));
          col = mix(col, midSkyCol, smoothstep(0.14, 0.45, h));
          col = mix(col, zenithCol, smoothstep(0.45, 0.95, h));

          float sunDot = max(dot(dir, uSunDir), 0.0);
          col += vec3(1.0, 0.92, 0.72) * pow(sunDot, 14.0) * 0.42;
          col += vec3(1.0, 0.98, 0.92) * smoothstep(0.996, 0.9992, sunDot) * 0.95;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  }, [])

  const clouds = useMemo(() => {
    const list = []
    let seed = 4242
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    for (let i = 0; i < 18; i++) {
      const x = -42 + (i / 18) * 84 + (rand() - 0.5) * 4
      const y = 7.2 + rand() * 8.5
      const z = -28 + rand() * 34
      const speed = 1.15 + rand() * 1.1
      const scale = 3.2 + rand() * 3.8

      const puffs = [
        { ox: 0, oy: 0, oz: 0, s: 1.0 },
        { ox: -0.55, oy: -0.08, oz: 0.08, s: 0.78 },
        { ox: 0.58, oy: -0.06, oz: -0.06, s: 0.82 },
        { ox: -0.24, oy: 0.22, oz: 0.12, s: 0.85 },
        { ox: 0.28, oy: 0.18, oz: -0.1, s: 0.76 },
      ]
      list.push({ id: i, x, y, z, speed, scale, puffs, phase: rand() * Math.PI * 2 })
    }
    return list
  }, [])

  const windStreaks = useMemo(() => {
    return [
      { id: 0, x: -6, y: 1.4, z: 9.2, speed: 4.2, scale: [3.2, 0.42] },
      { id: 1, x: 2, y: 2.3, z: 7.4, speed: 3.8, scale: [3.8, 0.48] },
      { id: 2, x: -3, y: 3.4, z: 6.1, speed: 4.6, scale: [4.2, 0.5] },
      { id: 3, x: 4, y: 1.1, z: 10.6, speed: 3.5, scale: [2.9, 0.38] },
      { id: 4, x: -1, y: 4.6, z: 3.5, speed: 4.8, scale: [4.5, 0.52] },
    ]
  }, [])

  const cloudGroupRefs = useRef([])
  const streakRefs = useRef([])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()

    cloudGroupRefs.current.forEach((grp, idx) => {
      if (!grp) return
      const c = clouds[idx]
      grp.position.x += c.speed * delta
      if (grp.position.x > 44) {
        grp.position.x = -44
      }
      grp.position.y = c.y + Math.sin(t * 0.7 + c.phase) * 0.18
    })

    streakRefs.current.forEach((mesh, idx) => {
      if (!mesh) return
      const st = windStreaks[idx]
      mesh.position.x += st.speed * delta
      if (mesh.position.x > 11) {
        mesh.position.x = -11
      }
      mesh.position.y = st.y + Math.sin(t * 2.2 + idx) * 0.14
    })
  })

  return (
    <group>
      <mesh material={skyShaderMat}>
        <sphereGeometry args={[95, 64, 64]} />
      </mesh>

      {clouds.map((c, idx) => (
        <group
          key={`cloud-${c.id}`}
          ref={(el) => {
            cloudGroupRefs.current[idx] = el
          }}
          position={[c.x, c.y, c.z]}
        >
          {c.puffs.map((p, pIdx) => (
            <sprite
              key={`puff-${pIdx}`}
              position={[p.ox * c.scale, p.oy * c.scale, p.oz * c.scale]}
              scale={[c.scale * p.s * 1.65, c.scale * p.s * 0.95, 1]}
            >
              <spriteMaterial
                map={cloudPuffTex}
                transparent
                opacity={0.88}
                depthWrite={false}
              />
            </sprite>
          ))}
        </group>
      ))}

      {windStreaks.map((st, idx) => (
        <mesh
          key={`streak-${st.id}`}
          ref={(el) => {
            streakRefs.current[idx] = el
          }}
          position={[st.x, st.y, st.z]}
        >
          <planeGeometry args={st.scale} />
          <meshBasicMaterial
            map={windStreakTex}
            transparent
            opacity={0.55}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * 3D Garden Companion Dog loaded from `/models/garden_dog.glb` (generated via Hunyuan3D-2
 * and normalized/optimized with Y_min=0, height=0.65m) with subtle idle breathing & sway.
 */
function GardenDogCompanion({ position = [1.15, 0.0, 6.55], rotation = [0, -0.35, 0] }) {
  const { scene } = useGLTF('/models/garden_dog.glb')
  const dogRef = useRef(null)

  const clonedDog = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material) {
          const mat = child.material.clone()
          mat.vertexColors = Boolean(child.geometry?.attributes?.color)
          mat.roughness = 0.62
          mat.metalness = 0.02
          mat.needsUpdate = true
          child.material = mat
        }
      }
    })
    return root
  }, [scene])

  const bowlGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.115, 0.0),
      new THREE.Vector2(0.132, 0.015),
      new THREE.Vector2(0.118, 0.072),
      new THREE.Vector2(0.104, 0.072),
      new THREE.Vector2(0.102, 0.022),
      new THREE.Vector2(0.0, 0.022),
    ]
    return new THREE.LatheGeometry(pts, 28)
  }, [])

  useFrame(({ clock }) => {
    if (!dogRef.current) return
    const t = clock.getElapsedTime()
    // Gentle cheerful breathing pulse and happy idle stance
    const breath = 1 + Math.sin(t * 2.8) * 0.015
    dogRef.current.scale.set(1, breath, 1)
    dogRef.current.position.y = Math.abs(Math.sin(t * 2.8)) * 0.008
    dogRef.current.rotation.y = Math.sin(t * 1.45) * 0.055
  })

  return (
    <group position={position} rotation={rotation}>
      <group ref={dogRef}>
        <primitive object={clonedDog} />
      </group>

      {/* Turned Glazed Ceramic Water Bowl on the Lawn beside the Dog */}
      <group position={[0.42, 0.0, 0.12]}>
        <mesh geometry={bowlGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#c2410c" roughness={0.28} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.056, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.102, 24]} />
          <meshStandardMaterial color="#7dd3fc" roughness={0.08} metalness={0.18} />
        </mesh>
      </group>
    </group>
  )
}

useGLTF.preload('/models/garden_dog.glb')

/**
 * 3D White Picket Fence surrounding the yard + Wind-Animated 3D Grass Blades & Wildflowers.
 */
export function ExteriorYardFenceAndGrass() {
  const { pickets, posts } = useMemo(() => {
    const minX = -5.6
    const maxX = 7.6
    const minZ = -7.2
    const maxZ = 8.2
    const step = 0.32
    const pList = []

    for (let x = minX; x <= maxX; x += step) {
      // Gate opening centered exactly on front door / walkway at x = -0.53
      if (x > -1.40 && x < 0.34) continue
      pList.push({ pos: [x, 0.42, maxZ], rot: 0 })
    }
    for (let x = minX; x <= maxX; x += step) {
      pList.push({ pos: [x, 0.42, minZ], rot: 0 })
    }
    for (let z = minZ; z <= maxZ; z += step) {
      pList.push({ pos: [minX, 0.42, z], rot: Math.PI / 2 })
    }
    for (let z = minZ; z <= maxZ; z += step) {
      pList.push({ pos: [maxX, 0.42, z], rot: Math.PI / 2 })
    }

    const postList = [
      [minX, 0.5, maxZ],
      [-1.40, 0.55, maxZ],
      [0.34, 0.55, maxZ],
      [maxX, 0.5, maxZ],
      [minX, 0.5, minZ],
      [maxX, 0.5, minZ],
      [minX, 0.5, 0.5],
      [maxX, 0.5, 0.5],
    ]

    return { pickets: pList, posts: postList }
  }, [])

  const grassTufts = useMemo(() => {
    const tufts = []
    let seed = 1337
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    for (let i = 0; i < 220; i++) {
      const x = -8.5 + rand() * 19.0
      const z = -8.0 + rand() * 19.5

      if (x > -3.75 && x < 6.05 && z > -5.85 && z < 5.35) continue
      if (x > -1.48 && x < 0.42 && z > 4.9) continue
      if (Math.hypot(x - 1.15, z - 6.55) < 0.72) continue

      const scale = 0.75 + rand() * 0.85
      const rotY = rand() * Math.PI * 2
      const shade = rand() > 0.5 ? '#22c55e' : '#16a34a'
      const hasFlower = rand() > 0.82
      const flowerColor = rand() > 0.5 ? '#fde047' : '#f472b6'
      tufts.push({ id: i, x, z, scale, rotY, shade, hasFlower, flowerColor })
    }
    return tufts
  }, [])

  const grassRefs = useRef([])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (let i = 0; i < grassRefs.current.length; i++) {
      const el = grassRefs.current[i]
      if (!el) continue
      const g = grassTufts[i]
      const windWave = Math.sin(t * 3.2 + g.x * 0.45 + g.z * 0.25) * 0.18 + 0.1
      el.rotation.z = -windWave
    }
  })

  return (
    <group>
      <group>
        {posts.map((p, idx) => (
          <group key={`fpost-${idx}`} position={[p[0], 0, p[2]]}>
            <mesh position={[0, p[1], 0]} castShadow receiveShadow>
              <boxGeometry args={[0.16, p[1] * 2, 0.16]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.45} />
            </mesh>
            <mesh position={[0, p[1] * 2 + 0.05, 0]} castShadow>
              <sphereGeometry args={[0.09, 10, 10]} />
              <meshStandardMaterial color="#e0f2fe" roughness={0.35} />
            </mesh>
          </group>
        ))}

        {/* Front horizontal rails cleanly meeting the gate posts at -1.40 and 0.34 */}
        <mesh position={[-3.50, 0.58, 8.2]} castShadow>
          <boxGeometry args={[4.20, 0.06, 0.05]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[-3.50, 0.24, 8.2]} castShadow>
          <boxGeometry args={[4.20, 0.06, 0.05]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[3.97, 0.58, 8.2]} castShadow>
          <boxGeometry args={[7.26, 0.06, 0.05]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[3.97, 0.24, 8.2]} castShadow>
          <boxGeometry args={[7.26, 0.06, 0.05]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[1.0, 0.58, -7.2]} castShadow>
          <boxGeometry args={[13.2, 0.06, 0.05]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[1.0, 0.24, -7.2]} castShadow>
          <boxGeometry args={[13.2, 0.06, 0.05]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[-5.6, 0.58, 0.5]} castShadow>
          <boxGeometry args={[0.05, 0.06, 15.4]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[-5.6, 0.24, 0.5]} castShadow>
          <boxGeometry args={[0.05, 0.06, 15.4]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[7.6, 0.58, 0.5]} castShadow>
          <boxGeometry args={[0.05, 0.06, 15.4]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>
        <mesh position={[7.6, 0.24, 0.5]} castShadow>
          <boxGeometry args={[0.05, 0.06, 15.4]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
        </mesh>

        {pickets.map((pk, idx) => (
          <mesh
            key={`picket-${idx}`}
            position={pk.pos}
            rotation={[0, pk.rot, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.1, 0.84, 0.03]} />
            <meshStandardMaterial color="#ffffff" roughness={0.45} />
          </mesh>
        ))}
      </group>

      <group>
        {grassTufts.map((g, idx) => (
          <group
            key={`grass-${g.id}`}
            ref={(el) => {
              grassRefs.current[idx] = el
            }}
            position={[g.x, 0, g.z]}
            rotation={[0, g.rotY, 0]}
            scale={[g.scale, g.scale, g.scale]}
          >
            <mesh position={[0, 0.14, 0]} castShadow>
              <coneGeometry args={[0.05, 0.28, 4]} />
              <meshStandardMaterial color={g.shade} roughness={0.75} />
            </mesh>
            <mesh position={[-0.05, 0.11, 0.02]} rotation={[0.1, 0, 0.32]} castShadow>
              <coneGeometry args={[0.045, 0.23, 4]} />
              <meshStandardMaterial color="#15803d" roughness={0.75} />
            </mesh>
            <mesh position={[0.05, 0.11, -0.02]} rotation={[-0.1, 0, -0.32]} castShadow>
              <coneGeometry args={[0.045, 0.23, 4]} />
              <meshStandardMaterial color="#4ade80" roughness={0.75} />
            </mesh>
            {g.hasFlower && (
              <mesh position={[0, 0.29, 0]}>
                <sphereGeometry args={[0.042, 8, 8]} />
                <meshStandardMaterial color={g.flowerColor} roughness={0.4} />
              </mesh>
            )}
          </group>
        ))}
      </group>

      {/* Stylized 3D Companion Dog in the Front Garden beside the Limestone Walkway */}
      <GardenDogCompanion position={[1.15, 0.0, 6.55]} rotation={[0, -0.35, 0]} />
    </group>
  )
}

/**
 * Deep Blue Tiled Pitched Roof crowning the entire Baby Blue house.
 */
export function DeepBlueTiledRoof() {
  const { sidingMap, sidingBump, roofMap, roofBump, plasterBump } = useMemo(
    () => getHousePBRTextures(),
    []
  )
  const mainTileCourses = useMemo(() => {
    const rows = []
    const numRows = 11
    for (let i = 0; i < numRows; i++) {
      const t = i / (numRows - 1)
      rows.push({
        id: i,
        offset: t,
        color: i % 2 === 0 ? '#1e3a8a' : '#172554',
      })
    }
    return rows
  }, [])

  const zRibs = useMemo(() => {
    const ribs = []
    for (let z = -5.2; z <= 5.2; z += 0.65) {
      ribs.push(z)
    }
    return ribs
  }, [])

  const gableGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-3.65, 0)
    shape.lineTo(3.65, 0)
    shape.lineTo(0, 1.38)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false })
  }, [])

  const slopeAngle = 0.36

  return (
    <group>
      {/* Ceiling with Stairwell Opening over North Staircase (x in [0.08, 1.25], z in [1.35, 3.85]) */}
      {/* South Ceiling Slab over Living Room & Front Entry (z: 1.35 to 5.15, x: -3.6 to +3.6, with stair opening cutout) */}
      <mesh position={[-1.725, 2.51, 4.50]} receiveShadow>
        <boxGeometry args={[3.75, 0.06, 1.30]} />
        <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.008} roughness={0.82} />
      </mesh>
      <mesh position={[1.80, 2.51, 4.50]} receiveShadow>
        <boxGeometry args={[3.60, 0.06, 1.30]} />
        <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.008} roughness={0.82} />
      </mesh>
      {/* Living Room main ceiling slab (East of stairwell: x: 1.25 to 3.60, z: 1.35 to 3.85) */}
      <mesh position={[2.425, 2.51, 2.60]} receiveShadow>
        <boxGeometry args={[2.35, 0.06, 2.50]} />
        <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.008} roughness={0.82} />
      </mesh>
      {/* West of stairwell ceiling (Kitchen / Hallway: x: -3.6 to 0.08, z: 1.35 to 3.85) */}
      <mesh position={[-1.76, 2.51, 2.60]} receiveShadow>
        <boxGeometry args={[3.68, 0.06, 2.50]} />
        <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.008} roughness={0.82} />
      </mesh>
      {/* North Room ceiling slab (z: -5.65 to 1.35, full width x: -3.6 to +3.6) */}
      <mesh position={[0.0, 2.51, -2.15]} receiveShadow>
        <boxGeometry args={[7.2, 0.06, 7.0]} />
        <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.008} roughness={0.82} />
      </mesh>
      <mesh position={[4.6, 2.51, 1.62]} receiveShadow>
        <boxGeometry args={[2.55, 0.06, 7.0]} />
        <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.008} roughness={0.82} />
      </mesh>

      <group position={[0.0, 2.54, -0.25]}>
        {/* Attic Floor / Roof Trim Perimeter */}
        <mesh position={[0, 0.04, -0.75]} castShadow receiveShadow>
          <boxGeometry args={[7.65, 0.10, 9.75]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.04, 4.75]} castShadow receiveShadow>
          <boxGeometry args={[7.65, 0.10, 1.25]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.45} />
        </mesh>

        <mesh geometry={gableGeometry} position={[0, 0.06, 5.38]} castShadow receiveShadow>
          <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.02} roughness={0.58} />
        </mesh>
        <mesh geometry={gableGeometry} position={[0, 0.06, -5.52]} castShadow receiveShadow>
          <meshStandardMaterial map={sidingMap} bumpMap={sidingBump} bumpScale={0.02} roughness={0.58} />
        </mesh>

        <group position={[-1.92, 0.72, 0]} rotation={[0, 0, slopeAngle]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.15, 0.1, 11.35]} />
            <meshStandardMaterial map={roofMap} bumpMap={roofBump} bumpScale={0.03} roughness={0.35} metalness={0.18} />
          </mesh>
          {mainTileCourses.map((r) => (
            <mesh
              key={`west-tile-${r.id}`}
              position={[-1.85 + r.offset * 3.7, 0.07, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.31, 0.05, 11.42]} />
              <meshStandardMaterial map={roofMap} bumpMap={roofBump} bumpScale={0.028} color={r.color} roughness={0.32} metalness={0.22} />
            </mesh>
          ))}
          {zRibs.map((zPos, idx) => (
            <mesh key={`west-rib-${idx}`} position={[0, 0.08, zPos]} castShadow>
              <boxGeometry args={[4.05, 0.045, 0.07]} />
              <meshStandardMaterial color="#1e40af" roughness={0.35} metalness={0.22} />
            </mesh>
          ))}
        </group>

        <group position={[1.92, 0.72, 0]} rotation={[0, 0, -slopeAngle]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.15, 0.1, 11.35]} />
            <meshStandardMaterial map={roofMap} bumpMap={roofBump} bumpScale={0.03} roughness={0.35} metalness={0.18} />
          </mesh>
          {mainTileCourses.map((r) => (
            <mesh
              key={`east-tile-${r.id}`}
              position={[-1.85 + r.offset * 3.7, 0.07, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.31, 0.05, 11.42]} />
              <meshStandardMaterial map={roofMap} bumpMap={roofBump} bumpScale={0.028} color={r.color} roughness={0.32} metalness={0.22} />
            </mesh>
          ))}
          {zRibs.map((zPos, idx) => (
            <mesh key={`east-rib-${idx}`} position={[0, 0.08, zPos]} castShadow>
              <boxGeometry args={[4.05, 0.045, 0.07]} />
              <meshStandardMaterial color="#1e40af" roughness={0.35} metalness={0.22} />
            </mesh>
          ))}
        </group>

        <mesh position={[0, 1.44, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 11.45, 8]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.32} metalness={0.24} />
        </mesh>
        <mesh position={[0, 1.42, 0]} castShadow>
          <boxGeometry args={[0.38, 0.12, 11.48]} />
          <meshStandardMaterial color="#172554" roughness={0.38} />
        </mesh>
      </group>

      <group position={[4.55, 2.54, 1.62]}>
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.85, 0.14, 7.35]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.45} />
        </mesh>
        <group position={[0, 0.42, 0]} rotation={[0, 0, -0.26]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.95, 0.1, 7.4]} />
            <meshStandardMaterial map={roofMap} bumpMap={roofBump} bumpScale={0.03} roughness={0.35} metalness={0.18} />
          </mesh>
          {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
            <mesh
              key={`wing-tile-${idx}`}
              position={[-1.25 + idx * 0.42, 0.07, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.34, 0.05, 7.45]} />
              <meshStandardMaterial
                map={roofMap}
                bumpMap={roofBump}
                bumpScale={0.028}
                color={idx % 2 === 0 ? '#1e3a8a' : '#172554'}
                roughness={0.32}
                metalness={0.22}
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

/**
 * Room 1 — Kitchen Skills Showcase (Fridge Magnets + Oven Skill) with warm gallery spotlights
 * and clean, borderless diegetic 3D typography.
 */
export function KitchenSkillsShowcase() {
  const promptMagnetTex = useMagnetFaceTexture('prompt-ai')
  const nlpMagnetTex = useMagnetFaceTexture('nlp-ai')

  return (
    <group>
      {/* Warm Focused Gallery Lights over the Fridge and the Oven */}
      <pointLight position={[-1.74, 1.95, 3.45]} intensity={1.75} distance={3.8} decay={2} color="#fde68a" />
      <pointLight position={[-1.82, 1.72, 2.22]} intensity={1.75} distance={3.8} decay={2} color="#fef08a" />

      {/* --- POLISHED CHROME GOOSENECK TAP ON THE KITCHEN SINK --- */}
      <group position={[-3.27, 0.895, 2.51]}>
        {/* Chrome Deck Plate / Escutcheon */}
        <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.06, 0.02, 0.22]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.14} />
        </mesh>

        {/* Central Mixer Stem */}
        <mesh position={[0, 0.065, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.024, 0.11, 20]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.12} />
        </mesh>

        {/* High-Arc Gooseneck Spout curving East (+x) over the double-basin sink */}
        <mesh position={[0.095, 0.115, 0]} castShadow>
          <torusGeometry args={[0.095, 0.014, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.12} />
        </mesh>

        {/* Spout Tip & Aerator Nozzle pointing down into the basin */}
        <mesh position={[0.19, 0.095, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.017, 0.04, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Subtle Gentle Water Stream / Droplet Shimmer from the Tap */}
        <mesh position={[0.19, -0.02, 0]}>
          <cylinderGeometry args={[0.005, 0.008, 0.21, 12]} />
          <meshStandardMaterial
            color="#bae6fd"
            emissive="#38bdf8"
            emissiveIntensity={0.35}
            transparent
            opacity={0.48}
            roughness={0.05}
          />
        </mesh>

        {/* Hot Water Handle (Left / South) */}
        <group position={[0, 0.032, 0.075]}>
          <mesh position={[0, 0.018, 0]} castShadow>
            <cylinderGeometry args={[0.014, 0.016, 0.036, 16]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.92} roughness={0.15} />
          </mesh>
          <mesh position={[0.025, 0.032, 0.015]} rotation={[0, -0.4, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.006, 0.006, 0.065, 12]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[0, 0.037, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.003, 12]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} />
          </mesh>
        </group>

        {/* Cold Water Handle (Right / North) */}
        <group position={[0, 0.032, -0.075]}>
          <mesh position={[0, 0.018, 0]} castShadow>
            <cylinderGeometry args={[0.014, 0.016, 0.036, 16]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.92} roughness={0.15} />
          </mesh>
          <mesh position={[0.025, 0.032, -0.015]} rotation={[0, 0.4, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.006, 0.006, 0.065, 12]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[0, 0.037, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.003, 12]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* --- DECORATIVE FRIDGE MAGNET 1: Coastal Ceramic Sun Badge --- */}
      <group position={[-1.55, 1.36, 4.272]} rotation={[0, Math.PI, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.004]} castShadow>
          <cylinderGeometry args={[0.092, 0.096, 0.016, 32]} />
          <meshStandardMaterial color="#9a3412" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <circleGeometry args={[0.088, 32]} />
          <meshBasicMaterial map={promptMagnetTex} />
        </mesh>
      </group>

      {/* --- DECORATIVE FRIDGE MAGNET 2: Botanical Sage Fern Badge --- */}
      <group position={[-1.94, 1.36, 4.272]} rotation={[0, Math.PI, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.004]} castShadow>
          <cylinderGeometry args={[0.092, 0.096, 0.016, 32]} />
          <meshStandardMaterial color="#064e3b" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <circleGeometry args={[0.086, 32]} />
          <meshBasicMaterial map={nlpMagnetTex} />
        </mesh>
      </group>

      {/* --- KITCHEN RANGE & OVEN WITH COPPER TEA KETTLE --- */}
      <group position={[-1.815, 0, 1.608]} rotation={[0, 0, 0]}>
        {/* Cast Iron Cooktop Burner Grate */}
        <mesh position={[0, 0.915, -0.06]} castShadow receiveShadow>
          <boxGeometry args={[0.48, 0.018, 0.44]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.925, -0.06]}>
          <ringGeometry args={[0.07, 0.11, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.85} />
        </mesh>

        {/* Realistic Whistling Copper & Wood Tea Kettle on the Cooktop */}
        <group position={[0, 0.935, -0.06]}>
          {/* Kettle Body */}
          <mesh position={[0, 0.09, 0]} castShadow>
            <cylinderGeometry args={[0.095, 0.125, 0.16, 24]} />
            <meshStandardMaterial color="#ea580c" metalness={0.85} roughness={0.22} />
          </mesh>
          {/* Kettle Domed Lid */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <sphereGeometry args={[0.065, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ea580c" metalness={0.85} roughness={0.22} />
          </mesh>
          {/* Lid Knob (Walnut Wood) */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial color="#78350f" roughness={0.5} />
          </mesh>
          {/* Angled Kettle Spout with Whistle Cap */}
          <mesh position={[0.10, 0.11, 0]} rotation={[0, 0, -0.58]} castShadow>
            <cylinderGeometry args={[0.014, 0.022, 0.10, 12]} />
            <meshStandardMaterial color="#ea580c" metalness={0.85} roughness={0.22} />
          </mesh>
          <mesh position={[0.138, 0.155, 0]} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 0.025, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
          </mesh>
          {/* Ergonomic Arch Handle (Oak / Walnut) */}
          <mesh position={[0, 0.20, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.088, 0.012, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#78350f" roughness={0.45} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/**
 * Room 2 — Living Room Couch, Coffee Table, Armchairs, TV, Staircase, Bathroom & Locked Bedroom Door
 * Strictly according to the architectural Ground Floor Plan.
 */
export function LivingRoomSkillsShowcase({ scrollRef }) {
  const { rugMap, boucleBump, oakMap, oakBump, marbleMap, marbleBump, plasterBump } = useMemo(
    () => getHousePBRTextures(),
    []
  )
  const page1FrontTex = useNewspaperPageTexture('page1-front')
  const page1BackTex = useNewspaperPageTexture('page1-back')
  const page2InsideTex = useNewspaperPageTexture('page2-inside')
  const tvScreenTex = useLivingRoomTVScreenTexture()

  const lockedSignTex = useFloatingTextTexture(
    [
      'PRIMARY BEDROOM',
      { text: 'PRIVATE • LOCKED', sub: true },
    ],
    {
      color: '#fbbf24',
      subColor: '#e2e8f0',
      fontSize: 64,
      subFontSize: 38,
    }
  )

  const pageFlipHingeRef = useRef(null)
  const coffeeSteamRef = useRef(null)

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    const s = scrollRef ? scrollRef.current : 0

    // Newspaper page flip triggers smoothly when viewing the coffee table in Chapter 5 (scroll ~ 0.28 to 0.34)
    const flipProgress = smoothstep(0.28, 0.34, s)
    const targetAngle = flipProgress * (Math.PI * 0.96)

    if (pageFlipHingeRef.current) {
      pageFlipHingeRef.current.rotation.z = THREE.MathUtils.damp(
        pageFlipHingeRef.current.rotation.z,
        targetAngle,
        3.2,
        delta
      )
    }

    if (coffeeSteamRef.current) {
      coffeeSteamRef.current.position.y = 0.12 + Math.sin(t * 2.5) * 0.012
      coffeeSteamRef.current.rotation.y = t * 0.6
    }
  })

  return (
    <group>
      {/* =====================================================================
          1. LIVING ROOM LOUNGE (Floor Plan Layout)
          Sofa against North bathroom wall facing South (+z), Coffee Table in center,
          Two Accent Armchairs facing North + side table, TV on East wall, Floor Lamp in corner
         ===================================================================== */}

      {/* Warm Reading Lamp Light over the Coffee Table & Broadsheet */}
      <pointLight position={[2.15, 1.85, 2.75]} intensity={1.85} distance={4.5} decay={2} color="#fde68a" />

      {/* Tall Floor Lamp standing in the East corner to the right of the sofa */}
      <group position={[3.45, 0, 2.05]}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.19, 0.05, 16]} />
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 1.5, 12]} />
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.52, 0]}>
          <cylinderGeometry args={[0.15, 0.25, 0.3, 18]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#f59e0b"
            emissiveIntensity={0.85}
            roughness={0.35}
          />
        </mesh>
        <pointLight position={[0, 1.50, 0]} intensity={1.2} distance={3.0} decay={2} color="#fef08a" />
      </group>

      {/* Moroccan Woven Area Rug centered under Couch, Coffee Table & Armchairs */}
      <group position={[2.15, 0.012, 2.85]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.85, 2.25]} />
          <meshStandardMaterial map={rugMap} bumpMap={boucleBump} bumpScale={0.012} roughness={0.92} />
        </mesh>
      </group>

      {/* A. Soft, Plush Blue 3-Seater Couch (Back against North bathroom wall at z = 2.05, facing South +z) */}
      <group position={[2.15, 0, 2.05]}>
        {[
          [-0.72, 0.06, -0.28],
          [0.72, 0.06, -0.28],
          [-0.72, 0.06, 0.28],
          [0.72, 0.06, 0.28],
        ].map((leg, i) => (
          <mesh key={`cleg-${i}`} position={leg} castShadow>
            <cylinderGeometry args={[0.032, 0.022, 0.12, 12]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
          </mesh>
        ))}

        {/* Soft Rounded Blue Couch Base */}
        <RoundedBox
          args={[1.66, 0.22, 0.80]}
          radius={0.08}
          smoothness={5}
          position={[0, 0.22, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#1d4ed8" bumpMap={boucleBump} bumpScale={0.015} roughness={0.86} />
        </RoundedBox>

        {/* Three Plush Rounded Seat Cushions */}
        {[-0.50, 0, 0.50].map((cx, i) => (
          <RoundedBox
            key={`seat-${i}`}
            args={[0.49, 0.17, 0.68]}
            radius={0.075}
            smoothness={5}
            position={[cx, 0.38, 0.04]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#3b82f6" bumpMap={boucleBump} bumpScale={0.018} roughness={0.88} />
          </RoundedBox>
        ))}

        {/* Soft Rounded Couch Backrest Frame */}
        <RoundedBox
          args={[1.66, 0.56, 0.18]}
          radius={0.08}
          smoothness={5}
          position={[0, 0.60, -0.31]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#1e40af" bumpMap={boucleBump} bumpScale={0.015} roughness={0.86} />
        </RoundedBox>

        {/* Three Overstuffed Blue Backrest Cushions */}
        {[-0.50, 0, 0.50].map((cx, i) => (
          <RoundedBox
            key={`back-${i}`}
            args={[0.48, 0.44, 0.16]}
            radius={0.07}
            smoothness={5}
            position={[cx, 0.63, -0.18]}
            rotation={[0.14, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#60a5fa" bumpMap={boucleBump} bumpScale={0.018} roughness={0.88} />
          </RoundedBox>
        ))}

        {/* Puffy Rolled Blue Armrests */}
        <RoundedBox
          args={[0.18, 0.40, 0.82]}
          radius={0.085}
          smoothness={5}
          position={[-0.78, 0.46, 0.01]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#2563eb" bumpMap={boucleBump} bumpScale={0.016} roughness={0.86} />
        </RoundedBox>
        <RoundedBox
          args={[0.18, 0.40, 0.82]}
          radius={0.085}
          smoothness={5}
          position={[0.78, 0.46, 0.01]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#2563eb" bumpMap={boucleBump} bumpScale={0.016} roughness={0.86} />
        </RoundedBox>

        {/* Four Throw Cushions on the Blue Couch */}
        <RoundedBox
          args={[0.28, 0.28, 0.12]}
          radius={0.055}
          smoothness={5}
          position={[-0.56, 0.56, 0.04]}
          rotation={[0.18, 0.38, -0.20]}
          castShadow
        >
          <meshStandardMaterial color="#bae6fd" bumpMap={boucleBump} bumpScale={0.014} roughness={0.84} />
        </RoundedBox>
        <RoundedBox
          args={[0.25, 0.25, 0.11]}
          radius={0.05}
          smoothness={5}
          position={[-0.36, 0.53, 0.07]}
          rotation={[0.14, 0.22, -0.12]}
          castShadow
        >
          <meshStandardMaterial color="#fde047" bumpMap={boucleBump} bumpScale={0.014} roughness={0.84} />
        </RoundedBox>
        <RoundedBox
          args={[0.26, 0.24, 0.11]}
          radius={0.05}
          smoothness={5}
          position={[0.22, 0.53, 0.05]}
          rotation={[0.20, -0.15, 0.08]}
          castShadow
        >
          <meshStandardMaterial color="#fef3c7" bumpMap={boucleBump} bumpScale={0.014} roughness={0.85} />
        </RoundedBox>
        <RoundedBox
          args={[0.28, 0.28, 0.12]}
          radius={0.055}
          smoothness={5}
          position={[0.56, 0.56, 0.04]}
          rotation={[0.18, -0.38, 0.20]}
          castShadow
        >
          <meshStandardMaterial color="#93c5fd" bumpMap={boucleBump} bumpScale={0.014} roughness={0.84} />
        </RoundedBox>
      </group>

      {/* B. Rectangular Oak Coffee Table (Directly in front of sofa at z = 2.85) */}
      <group position={[2.15, 0, 2.85]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.12, 0.035, 0.68]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.015} color="#b45309" roughness={0.44} />
        </mesh>
        <mesh position={[0, 0.425, 0]} castShadow>
          <boxGeometry args={[1.06, 0.025, 0.62]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.012} color="#92400e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 0.022, 0.54]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.012} color="#92400e" roughness={0.55} />
        </mesh>
        {[
          [-0.48, 0.225, -0.26],
          [0.48, 0.225, -0.26],
          [-0.48, 0.225, 0.26],
          [0.48, 0.225, 0.26],
        ].map((legPos, idx) => (
          <mesh key={`tleg-${idx}`} position={legPos} castShadow>
            <cylinderGeometry args={[0.026, 0.018, 0.45, 12]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
          </mesh>
        ))}

        {/* Steaming Ceramic Espresso Cup */}
        <group position={[0.35, 0.468, -0.06]}>
          <mesh position={[0, 0.008, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.082, 0.062, 0.016, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.056, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.052, 0.042, 0.092, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.099, 0]}>
            <cylinderGeometry args={[0.048, 0.048, 0.004, 24]} />
            <meshStandardMaterial color="#451a03" roughness={0.35} />
          </mesh>
          <mesh position={[0.056, 0.056, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.024, 0.006, 10, 20, Math.PI]} />
            <meshStandardMaterial color="#ffffff" roughness={0.25} />
          </mesh>
          <group ref={coffeeSteamRef} position={[0, 0.12, 0]}>
            <mesh position={[-0.01, 0.02, 0]} rotation={[0, 0, 0.12]}>
              <planeGeometry args={[0.016, 0.075]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.38}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        </group>

        {/* Interactive 3D Page-Flipping Broadsheet Newspaper */}
        <group position={[-0.06, 0.475, 0.01]} rotation={[0.16, 0, 0]}>
          <mesh position={[0, 0.004, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.38, 0.008, 0.31]} />
            <meshStandardMaterial color="#e2dcd0" roughness={0.85} />
          </mesh>

          <mesh position={[0, 0.009, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[0.38, 0.31]} />
            <meshBasicMaterial map={page2InsideTex} />
          </mesh>

          <group ref={pageFlipHingeRef} position={[-0.19, 0.011, 0]}>
            <mesh position={[0.19, 0, 0]} castShadow>
              <boxGeometry args={[0.38, 0.002, 0.31]} />
              <meshStandardMaterial color="#faf6ee" roughness={0.8} />
            </mesh>
            <mesh position={[0.19, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.38, 0.31]} />
              <meshBasicMaterial map={page1FrontTex} />
            </mesh>
            <mesh position={[0.19, -0.0015, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
              <planeGeometry args={[0.38, 0.31]} />
              <meshBasicMaterial map={page1BackTex} />
            </mesh>
          </group>
        </group>
      </group>

      {/* C. Two Accent Armchairs Facing North toward Coffee Table & Sofa (Floor Plan) */}
      {/* Left Accent Armchair */}
      <group position={[1.42, 0, 3.55]} rotation={[0, -0.28, 0]}>
        {[
          [-0.26, 0.06, -0.22],
          [0.26, 0.06, -0.22],
          [-0.26, 0.06, 0.22],
          [0.26, 0.06, 0.22],
        ].map((lp, idx) => (
          <mesh key={`armleg1-${idx}`} position={lp} castShadow>
            <cylinderGeometry args={[0.022, 0.015, 0.12, 10]} />
            <meshStandardMaterial color="#78350f" roughness={0.5} />
          </mesh>
        ))}
        {/* Armchair Seat */}
        <RoundedBox args={[0.62, 0.16, 0.58]} radius={0.06} smoothness={4} position={[0, 0.20, 0]} castShadow>
          <meshStandardMaterial color="#f1f5f9" bumpMap={boucleBump} bumpScale={0.016} roughness={0.88} />
        </RoundedBox>
        {/* Armchair Backrest */}
        <RoundedBox args={[0.62, 0.44, 0.12]} radius={0.05} smoothness={4} position={[0, 0.46, 0.24]} rotation={[-0.12, 0, 0]} castShadow>
          <meshStandardMaterial color="#e2e8f0" bumpMap={boucleBump} bumpScale={0.016} roughness={0.88} />
        </RoundedBox>
        {/* Armchair Armrests */}
        <RoundedBox args={[0.10, 0.28, 0.54]} radius={0.04} smoothness={4} position={[-0.31, 0.35, 0]} castShadow>
          <meshStandardMaterial color="#e2e8f0" bumpMap={boucleBump} bumpScale={0.016} roughness={0.88} />
        </RoundedBox>
        <RoundedBox args={[0.10, 0.28, 0.54]} radius={0.04} smoothness={4} position={[0.31, 0.35, 0]} castShadow>
          <meshStandardMaterial color="#e2e8f0" bumpMap={boucleBump} bumpScale={0.016} roughness={0.88} />
        </RoundedBox>
      </group>

      {/* Right Accent Armchair */}
      <group position={[2.88, 0, 3.55]} rotation={[0, 0.28, 0]}>
        {[
          [-0.26, 0.06, -0.22],
          [0.26, 0.06, -0.22],
          [-0.26, 0.06, 0.22],
          [0.26, 0.06, 0.22],
        ].map((lp, idx) => (
          <mesh key={`armleg2-${idx}`} position={lp} castShadow>
            <cylinderGeometry args={[0.022, 0.015, 0.12, 10]} />
            <meshStandardMaterial color="#78350f" roughness={0.5} />
          </mesh>
        ))}
        <RoundedBox args={[0.62, 0.16, 0.58]} radius={0.06} smoothness={4} position={[0, 0.20, 0]} castShadow>
          <meshStandardMaterial color="#f1f5f9" bumpMap={boucleBump} bumpScale={0.016} roughness={0.88} />
        </RoundedBox>
        <RoundedBox args={[0.62, 0.44, 0.12]} radius={0.05} smoothness={4} position={[0, 0.46, 0.24]} rotation={[-0.12, 0, 0]} castShadow>
          <meshStandardMaterial color="#e2e8f0" bumpMap={boucleBump} bumpScale={0.016} roughness={0.88} />
        </RoundedBox>
        <RoundedBox args={[0.10, 0.28, 0.54]} radius={0.04} smoothness={4} position={[-0.31, 0.35, 0]} castShadow>
          <meshStandardMaterial color="#e2e8f0" bumpMap={boucleBump} bumpScale={0.016} roughness={0.88} />
        </RoundedBox>
        <RoundedBox args={[0.10, 0.28, 0.54]} radius={0.04} smoothness={4} position={[0.31, 0.35, 0]} castShadow>
          <meshStandardMaterial color="#e2e8f0" bumpMap={boucleBump} bumpScale={0.016} roughness={0.88} />
        </RoundedBox>
      </group>

      {/* D. Small Wooden Side Table between the two Armchairs (Floor Plan) */}
      <group position={[2.15, 0, 3.65]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.028, 24]} />
          <meshStandardMaterial map={oakMap} color="#b45309" roughness={0.46} />
        </mesh>
        {[0, 2.09, 4.18].map((ang, i) => (
          <mesh key={`stleg-${i}`} position={[Math.cos(ang) * 0.14, 0.21, Math.sin(ang) * 0.14]} rotation={[0.08 * Math.cos(ang), 0, 0.08 * Math.sin(ang)]} castShadow>
            <cylinderGeometry args={[0.016, 0.012, 0.42, 10]} />
            <meshStandardMaterial color="#78350f" roughness={0.5} />
          </mesh>
        ))}
        {/* Ceramic vase with succulent */}
        <mesh position={[0, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.048, 0.038, 0.09, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.54, 0]}>
          <sphereGeometry args={[0.042, 10, 10]} scale={[1, 0.7, 1]} />
          <meshStandardMaterial color="#10b981" roughness={0.8} />
        </mesh>
      </group>

      {/* E. 55-Inch 4K Smart TV & Media Console along the East wall of Living Room */}
      <group position={[4.10, 0, 2.85]} rotation={[0, -Math.PI / 2, 0]}>
        <RoundedBox
          args={[1.38, 0.34, 0.38]}
          radius={0.03}
          smoothness={4}
          position={[0, 0.25, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.015} color="#92400e" roughness={0.46} />
        </RoundedBox>
        <mesh position={[-0.44, 0.25, -0.192]}>
          <boxGeometry args={[0.42, 0.26, 0.01]} />
          <meshStandardMaterial map={oakMap} color="#b45309" roughness={0.45} />
        </mesh>
        <mesh position={[0.44, 0.25, -0.192]}>
          <boxGeometry args={[0.42, 0.26, 0.01]} />
          <meshStandardMaterial map={oakMap} color="#b45309" roughness={0.45} />
        </mesh>
        <RoundedBox
          args={[0.68, 0.045, 0.08]}
          radius={0.015}
          smoothness={4}
          position={[0, 0.445, -0.06]}
          castShadow
        >
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.35} />
        </RoundedBox>
        {[
          [-0.60, 0.05, -0.13],
          [0.60, 0.05, -0.13],
          [-0.60, 0.05, 0.13],
          [0.60, 0.05, 0.13],
        ].map((lpos, idx) => (
          <mesh key={`tvleg-${idx}`} position={lpos} castShadow>
            <cylinderGeometry args={[0.022, 0.015, 0.10, 10]} />
            <meshStandardMaterial color="#451a03" roughness={0.6} />
          </mesh>
        ))}
        {/* Sleek Metallic TV Pedestal */}
        <mesh position={[0, 0.44, 0.02]} castShadow>
          <boxGeometry args={[0.42, 0.02, 0.20]} />
          <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.50, 0.03]} castShadow>
          <cylinderGeometry args={[0.032, 0.038, 0.13, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} />
        </mesh>
        {/* 55-Inch 4K Display Panel */}
        <RoundedBox
          args={[1.22, 0.70, 0.035]}
          radius={0.012}
          smoothness={4}
          position={[0, 0.88, 0.03]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#090d16" metalness={0.65} roughness={0.22} />
        </RoundedBox>
        <mesh position={[0, 0.88, -0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.16, 0.64]} />
          <meshBasicMaterial map={tvScreenTex} />
        </mesh>
        <mesh position={[-0.54, 0.545, -0.002]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* =====================================================================
          2. CENTRAL OAK STAIRCASE & UNDER-STAIR CLOSET (Floor Plan UP Arrow)
          Positioned along the central spine at x = 0.55, ascending Northward UP from z = 1.70 to -0.30
         ===================================================================== */}
      <group position={[0.55, 0, 0]}>
        {/* Stringers */}
        <mesh position={[-0.44, 1.25, 0.70]} rotation={[-0.68, 0, 0]} castShadow>
          <boxGeometry args={[0.045, 0.22, 2.95]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} color="#78350f" roughness={0.48} />
        </mesh>
        <mesh position={[0.44, 1.25, 0.70]} rotation={[-0.68, 0, 0]} castShadow>
          <boxGeometry args={[0.045, 0.22, 2.95]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} color="#78350f" roughness={0.48} />
        </mesh>

        {/* 14 Quarter-Sawn Oak Treads and Risers Ascending UP Northward */}
        {[...Array(14)].map((_, i) => {
          const t = (i + 1) / 14
          const y = t * 2.54 - 0.08
          const z = 1.70 - t * 2.00
          return (
            <group key={`stair-step-${i}`}>
              <mesh position={[0, y, z]} castShadow receiveShadow>
                <boxGeometry args={[0.86, 0.045, 0.22]} />
                <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.018} color="#b45309" roughness={0.42} />
              </mesh>
              <mesh position={[0, y - 0.08, z + 0.09]} castShadow>
                <boxGeometry args={[0.84, 0.16, 0.025]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.4} />
              </mesh>
              <mesh position={[0, y + 0.022, z - 0.10]}>
                <boxGeometry args={[0.86, 0.008, 0.015]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
              </mesh>
            </group>
          )
        })}

        {/* Handrail & Spindles along the West opening (x = -0.44) */}
        <mesh position={[-0.44, 1.70, 0.70]} rotation={[-0.68, 0, 0]} castShadow>
          <boxGeometry args={[0.055, 0.05, 2.95]} />
          <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.45} />
        </mesh>
        {[0, 2, 4, 6, 8, 10, 12].map((idx) => {
          const t = (idx + 1) / 14
          const y = t * 2.54 + 0.22
          const z = 1.70 - t * 2.00
          return (
            <mesh key={`srail-${idx}`} position={[-0.44, y, z]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.44, 8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
          )
        })}

        {/* Under-Stairs Closet Partition Wall & Door (Floor Plan: CLOSET) */}
        <group position={[0, 0, -0.32]}>
          <mesh position={[0, 1.10, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.86, 2.20, 0.06]} />
            <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.015} roughness={0.7} />
          </mesh>
          {/* Closet Door Frame & Door */}
          <mesh position={[0, 1.05, 0.035]} castShadow>
            <boxGeometry args={[0.74, 2.00, 0.03]} />
            <meshStandardMaterial map={oakMap} color="#f1f5f9" roughness={0.5} />
          </mesh>
          {/* Brass Closet Knob */}
          <mesh position={[0.28, 1.05, 0.06]}>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Subtle Closet Label */}
          <FloatingLabel3D
            position={[0, 1.82, 0.05]}
            rotation={[0, 0, 0]}
            size={[0.45, 0.12]}
            color="#94a3b8"
            subColor="#cbd5e1"
            fontSize={50}
            subFontSize={28}
            lines={['CLOSET']}
          />
        </group>
      </group>

      {/* =====================================================================
          3. BATHROOM SUITE (9'9" x 10'6" on Floor Plan)
          North of Living Room sofa (z: [-0.20, 1.95]), East of Hallway (x: [1.10, 3.65])
          Includes: Vanity Sink, Mirror, Toilet & Soaking Bathtub
         ===================================================================== */}
      <group position={[2.38, 0, 0.88]}>
        {/* Marble Bathroom Floor Tiles */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
          <planeGeometry args={[2.50, 2.10]} />
          <meshStandardMaterial
            map={marbleMap}
            bumpMap={marbleBump}
            bumpScale={0.016}
            roughness={0.35}
          />
        </mesh>

        {/* South Wall (separating Bathroom from Living Room Couch) at z = 1.05 */}
        <mesh position={[0, 1.25, 1.05]} castShadow receiveShadow>
          <boxGeometry args={[2.50, 2.50, 0.08]} />
          <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.018} roughness={0.7} />
        </mesh>
        {/* North Wall (separating Bathroom from Bedroom) at z = -1.05 */}
        <mesh position={[0, 1.25, -1.05]} castShadow receiveShadow>
          <boxGeometry args={[2.50, 2.50, 0.08]} />
          <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.018} roughness={0.7} />
        </mesh>
        {/* West Hallway Partition Wall with Arched Entrance Doorway */}
        <mesh position={[-1.25, 1.25, -0.45]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 2.50, 1.20]} />
          <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.018} roughness={0.7} />
        </mesh>
        <mesh position={[-1.25, 2.22, 0.45]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.56, 0.90]} />
          <meshStandardMaterial color="#f8fafc" bumpMap={plasterBump} bumpScale={0.018} roughness={0.7} />
        </mesh>

        {/* Warm Bathroom Ceiling Vanity Light */}
        <pointLight position={[0, 2.30, 0]} intensity={1.4} distance={3.8} decay={2} color="#fffbeb" />

        {/* A. Vanity Unit (West/North-West side of Bathroom) */}
        <group position={[-0.65, 0, -0.55]}>
          {/* Walnut Vanity Base Cabinet */}
          <RoundedBox args={[0.88, 0.82, 0.52]} radius={0.02} smoothness={4} position={[0, 0.41, 0]} castShadow>
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
          </RoundedBox>
          {/* White Carrara Quartz Countertop */}
          <mesh position={[0, 0.83, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.035, 0.54]} />
            <meshStandardMaterial color="#ffffff" map={marbleMap} roughness={0.2} />
          </mesh>
          {/* Undermount Porcelain Sink Basin */}
          <mesh position={[0, 0.81, 0]}>
            <boxGeometry args={[0.46, 0.16, 0.34]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.15} />
          </mesh>
          {/* Brushed Brass Gooseneck Faucet */}
          <mesh position={[0, 0.95, -0.14]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 12]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Illuminated LED Frameless Vanity Mirror */}
          <mesh position={[0, 1.48, -0.245]}>
            <boxGeometry args={[0.78, 0.72, 0.02]} />
            <meshStandardMaterial color="#e0f2fe" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 1.48, -0.25]}>
            <planeGeometry args={[0.84, 0.78]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.65} />
          </mesh>
        </group>

        {/* B. Modern Glazed Porcelain Toilet (Next to Vanity) */}
        <group position={[0.25, 0, -0.65]}>
          {/* Toilet Bowl */}
          <RoundedBox args={[0.38, 0.42, 0.55]} radius={0.06} smoothness={4} position={[0, 0.21, 0]} castShadow>
            <meshStandardMaterial color="#ffffff" roughness={0.15} />
          </RoundedBox>
          {/* Toilet Seat & Lid */}
          <RoundedBox args={[0.36, 0.03, 0.50]} radius={0.03} smoothness={4} position={[0, 0.435, 0]} castShadow>
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </RoundedBox>
          {/* Tank & Chrome Flush Button */}
          <RoundedBox args={[0.36, 0.44, 0.20]} radius={0.03} smoothness={4} position={[0, 0.65, -0.20]} castShadow>
            <meshStandardMaterial color="#ffffff" roughness={0.15} />
          </RoundedBox>
          <mesh position={[0, 0.88, -0.20]}>
            <cylinderGeometry args={[0.024, 0.024, 0.015, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>

        {/* C. Freestanding Soaking Bathtub (East Wall of Bathroom, Window Above) */}
        <group position={[0.88, 0, 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <RoundedBox args={[1.45, 0.58, 0.68]} radius={0.14} smoothness={5} position={[0, 0.29, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#ffffff" roughness={0.18} />
          </RoundedBox>
          {/* Tub Inner Hollow */}
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[1.25, 0.52, 0.50]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.2} />
          </mesh>
          {/* Chrome Freestanding Tub Filler */}
          <mesh position={[0.62, 0.62, 0]} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 0.68, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.15} />
          </mesh>
        </group>
      </group>

      {/* =====================================================================
          4. PRIMARY BEDROOM LOCKED DOOR (North Hallway at x = 1.10, z = -0.30)
          User requirement: "you dont need to contstruct the entire bedroom,
          just make a bedroom door which is locked."
         ===================================================================== */}
      <group position={[1.10, 0, -0.30]}>
        {/* Oak Door Casing Archway */}
        <mesh position={[0, 1.10, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.09, 2.22, 1.02]} />
          <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.45} />
        </mesh>

        {/* Solid 6-Panel Dark Oak Bedroom Door */}
        <mesh position={[0.01, 1.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.045, 2.12, 0.88]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} color="#451a03" roughness={0.42} />
        </mesh>

        {/* Recessed Molded Door Panels */}
        {[-0.22, 0.22].map((pz, i) => (
          <group key={`dpanel-${i}`}>
            <mesh position={[-0.015, 1.55, pz]}>
              <boxGeometry args={[0.01, 0.52, 0.30]} />
              <meshStandardMaterial map={oakMap} color="#3b1502" roughness={0.45} />
            </mesh>
            <mesh position={[-0.015, 0.85, pz]}>
              <boxGeometry args={[0.01, 0.65, 0.30]} />
              <meshStandardMaterial map={oakMap} color="#3b1502" roughness={0.45} />
            </mesh>
          </group>
        ))}

        {/* Heavy Brushed Brass Door Lever Handle & Keyhole */}
        <mesh position={[-0.035, 1.02, 0.34]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 10]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-0.035, 0.96, 0.34]}>
          <cylinderGeometry args={[0.015, 0.015, 0.008, 12]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#92400e" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Solid Polished Brass Engraved Plaque: "PRIMARY BEDROOM • PRIVATE / LOCKED" */}
        <mesh position={[-0.026, 1.55, 0]} castShadow>
          <boxGeometry args={[0.008, 0.16, 0.44]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.88} roughness={0.25} />
        </mesh>
        <mesh position={[-0.031, 1.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.42, 0.14]} />
          <meshBasicMaterial map={lockedSignTex} />
        </mesh>
      </group>

      {/* =====================================================================
          5. DINING NOOK (13'8" on Floor Plan behind Kitchen at x = -2.15, z = -3.20)
          Dining Table + 4 Matching Wooden Dining Chairs + Overhead Pendant Lamp
         ===================================================================== */}
      <group position={[-2.15, 0, -3.20]}>
        {/* Solid Quarter-Sawn Oak Dining Table */}
        <RoundedBox args={[1.38, 0.045, 0.95]} radius={0.014} smoothness={4} position={[0, 0.74, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.016} color="#b45309" roughness={0.42} />
        </RoundedBox>
        {/* Table Legs */}
        {[
          [-0.58, 0.37, -0.38],
          [0.58, 0.37, -0.38],
          [-0.58, 0.37, 0.38],
          [0.58, 0.37, 0.38],
        ].map((lp, idx) => (
          <mesh key={`dtleg-${idx}`} position={lp} castShadow>
            <cylinderGeometry args={[0.032, 0.024, 0.74, 12]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
          </mesh>
        ))}

        {/* 4 Dining Chairs (North, South, East, West) around Table */}
        {[
          { pos: [0, 0, -0.68], rot: 0 },
          { pos: [0, 0, 0.68], rot: Math.PI },
          { pos: [-0.85, 0, 0], rot: Math.PI / 2 },
          { pos: [0.85, 0, 0], rot: -Math.PI / 2 },
        ].map((ch, i) => (
          <group key={`dchair-${i}`} position={ch.pos} rotation={[0, ch.rot, 0]}>
            {[
              [-0.18, 0.22, -0.16],
              [0.18, 0.22, -0.16],
              [-0.18, 0.22, 0.16],
              [0.18, 0.22, 0.16],
            ].map((clp, ci) => (
              <mesh key={`cl-${ci}`} position={clp} castShadow>
                <cylinderGeometry args={[0.018, 0.014, 0.44, 10]} />
                <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
              </mesh>
            ))}
            {/* Padded Seat Cushion */}
            <RoundedBox args={[0.42, 0.045, 0.40]} radius={0.02} smoothness={4} position={[0, 0.45, 0]} castShadow>
              <meshStandardMaterial color="#f1f5f9" bumpMap={boucleBump} bumpScale={0.012} roughness={0.85} />
            </RoundedBox>
            {/* Curved Backrest */}
            <mesh position={[0, 0.72, -0.18]} castShadow>
              <boxGeometry args={[0.40, 0.22, 0.024]} />
              <meshStandardMaterial map={oakMap} color="#b45309" roughness={0.46} />
            </mesh>
            <mesh position={[-0.16, 0.60, -0.18]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.32, 8]} />
              <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
            </mesh>
            <mesh position={[0.16, 0.60, -0.18]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.32, 8]} />
              <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
            </mesh>
          </group>
        ))}

        {/* Modern Overhead Brass 3-Globe Pendant Chandelier */}
        <mesh position={[0, 2.10, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.68, 8]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
        </mesh>
        <pointLight position={[0, 1.74, 0]} intensity={1.5} distance={3.8} decay={2} color="#fef08a" />
        {[-0.22, 0, 0.22].map((gx, gi) => (
          <mesh key={`globe-${gi}`} position={[gx, 1.74, 0]}>
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
        ))}

        {/* Minimalist Ceramic Centerpiece Vase on Dining Table */}
        <mesh position={[0, 0.84, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.032, 0.15, 16]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Room 3 (Ground Floor North Wing) — Akanksha's Silicon & Hardware Lab Bench
 *Room 4 (Upstairs Attic Loft at y = 2.58) — Sunlit Attic Art Studio & Interactive Sketchbooks with Sketches!
 */
export function EngineerAndArtistStudioShowcase({ scrollRef }) {
  const { oakMap, oakBump, rugMap, boucleBump, plasterBump } = useMemo(
    () => getHousePBRTextures(),
    []
  )
  const scopeTex = useOscilloscopeScreenTexture()
  const easelArtTex = useStudioArtworkTexture('easel-masterpiece')
  const machaanArtTex = useStudioArtworkTexture('machaan-theatre')
  const merakiArtTex = useStudioArtworkTexture('meraki-botanical')

  const sketchPage1FrontTex = useSketchbookPageTexture('sketch-page1-front')
  const sketchPage1BackTex = useSketchbookPageTexture('sketch-page1-back')
  const sketchPage2InsideTex = useSketchbookPageTexture('sketch-page2-inside')

  const waferRef = useRef(null)
  const sketchFlipHingeRef = useRef(null)

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    if (waferRef.current) {
      waferRef.current.rotation.z = t * 0.45
    }

    // Smoothly flip the Attic Sketchbook page when zooming into the drafting table in Chapter 8 (s ~ 0.53 to 0.60)
    const s = scrollRef ? scrollRef.current : 0
    const flipProgress = smoothstep(0.53, 0.60, s)
    const targetAngle = flipProgress * (Math.PI * 0.95)
    if (sketchFlipHingeRef.current) {
      sketchFlipHingeRef.current.rotation.z = THREE.MathUtils.damp(
        sketchFlipHingeRef.current.rotation.z,
        targetAngle,
        4.2,
        delta
      )
    }
  })

  return (
    <group>
      {/* =====================================================================
          1. SILICON & HARDWARE LAB BENCH (North Wall at x = 2.55, z = -1.12, facing South +z)
         ===================================================================== */}
      <group position={[2.55, 0, -1.12]}>
        {/* Focused Warm Lab Spotlight */}
        <pointLight position={[0, 1.95, 0.65]} intensity={1.85} distance={4.2} decay={2} color="#fde68a" />

        {/* Heavy Oak & Steel Electronics Lab Workbench */}
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.75, 0.045, 0.68]} />
          <meshStandardMaterial map={oakMap} bumpMap={oakBump} bumpScale={0.015} color="#d97706" roughness={0.46} />
        </mesh>
        {[
          [-0.8, 0.37, -0.28],
          [0.8, 0.37, -0.28],
          [-0.8, 0.37, 0.28],
          [0.8, 0.37, 0.28],
        ].map((lpos, i) => (
          <mesh key={`bleg-${i}`} position={lpos} castShadow>
            <boxGeometry args={[0.05, 0.74, 0.05]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}

        {/* A. Digital Oscilloscope (Left side of Lab Bench) */}
        <group position={[-0.48, 0.765, -0.04]} rotation={[0, 0.22, 0]}>
          <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.32, 0.22]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[-0.04, 0.17, 0.112]}>
            <planeGeometry args={[0.28, 0.2]} />
            <meshBasicMaterial map={scopeTex} />
          </mesh>
          {/* Scope Control Knobs */}
          {[0.08, 0.16, 0.24].map((ky, idx) => (
            <mesh key={`knob-${idx}`} position={[0.15, ky, 0.115]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.02, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.2} />
            </mesh>
          ))}
        </group>

        {/* B. Glowing 300mm CMOS Silicon Wafer on Inspection Stand (Center of Bench) */}
        <group position={[0.05, 0.765, 0.04]}>
          <mesh position={[0, 0.03, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.06, 20]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
          </mesh>
          <group position={[0, 0.21, 0]} rotation={[-0.35, 0, 0]} ref={waferRef}>
            <mesh castShadow>
              <cylinderGeometry args={[0.16, 0.16, 0.008, 36]} rotation={[Math.PI / 2, 0, 0]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive="#1e3a8a"
                emissiveIntensity={0.65}
                metalness={0.9}
                roughness={0.12}
              />
            </mesh>
            {/* Golden Die Grid Ring on Wafer */}
            <mesh position={[0, 0, 0.005]}>
              <ringGeometry args={[0.04, 0.145, 24]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#d97706"
                emissiveIntensity={0.5}
                metalness={0.85}
                roughness={0.2}
                wireframe
              />
            </mesh>
          </group>
        </group>

        {/* C. Biometric Fingerprint Scanner & Green PCB Prototype (Right side of Bench) */}
        <group position={[0.52, 0.765, 0.02]} rotation={[0, -0.18, 0]}>
          <mesh position={[0, 0.015, 0]} castShadow>
            <boxGeometry args={[0.34, 0.02, 0.24]} />
            <meshStandardMaterial color="#059669" roughness={0.35} />
          </mesh>
          <mesh position={[-0.06, 0.035, 0]}>
            <boxGeometry args={[0.11, 0.025, 0.11]} />
            <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.3} />
          </mesh>
          {/* Glowing Optical Fingerprint Sensor Window */}
          <mesh position={[0.09, 0.035, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.022, 20]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.2} />
          </mesh>
        </group>
      </group>

      {/* =====================================================================
          2. UPSTAIRS ATTIC ART STUDIO & STUDY LOFT (y = 2.58, accessed via Central Stairs)
          Follows the "ATTIC STUDY / STUDIO" Floor Plan:
          - West Wall: Study Desk with Computer & Office Chair
          - Center: Circular Woven Moroccan Rug
          - South Wall: Drafting Table with Interactive Page-Flipping Sketchbooks
          - East / North Wall: Oak Bookshelves, Storage Cabinets & A-Frame Artist Easel
         ===================================================================== */}
      <group position={[0, 2.58, 0]}>
        {/* Warm Quarter-Sawn Oak Hardwood Attic Floor Deck (North half z: -5.0 to 1.35) */}
        <mesh position={[0, 0.01, -1.80]} receiveShadow>
          <boxGeometry args={[6.8, 0.04, 6.3]} />
          <meshStandardMaterial
            map={oakMap}
            bumpMap={oakBump}
            bumpScale={0.018}
            color="#f8fafc"
            roughness={0.44}
          />
        </mesh>
        {/* South Attic Floor Deck over living room (z: 1.35 to 5.0, East of stairwell x in [1.25, 3.4]) */}
        <mesh position={[2.325, 0.01, 3.175]} receiveShadow>
          <boxGeometry args={[2.15, 0.04, 3.65]} />
          <meshStandardMaterial
            map={oakMap}
            bumpMap={oakBump}
            bumpScale={0.018}
            color="#f8fafc"
            roughness={0.44}
          />
        </mesh>
        {/* South Attic Floor Deck over kitchen/hall (z: 1.35 to 5.0, West of stairwell x in [-3.4, 0.08]) */}
        <mesh position={[-1.66, 0.01, 3.175]} receiveShadow>
          <boxGeometry args={[3.48, 0.04, 3.65]} />
          <meshStandardMaterial
            map={oakMap}
            bumpMap={oakBump}
            bumpScale={0.018}
            color="#f8fafc"
            roughness={0.44}
          />
        </mesh>

        {/* Oak Balustrade around Stairwell Landing Opening (Floor Plan: DN arrow) */}
        <group position={[0.55, 0, 0.70]}>
          <mesh position={[0.45, 0.48, 0]} castShadow>
            <boxGeometry args={[0.055, 0.045, 2.10]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.45} />
          </mesh>
          {[-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9].map((rz, idx) => (
            <mesh key={`abal-${idx}`} position={[0.45, 0.24, rz]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.48, 8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0.45, 0.27, -1.05]} castShadow>
            <boxGeometry args={[0.075, 0.54, 0.075]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.45} />
          </mesh>
          <mesh position={[0.45, 0.27, 1.05]} castShadow>
            <boxGeometry args={[0.075, 0.54, 0.075]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.45} />
          </mesh>
        </group>

        {/* Exposed Timber A-Frame Attic Rafter Beams overhead */}
        {[3.2, 2.0, 0.8, -0.4].map((rz, idx) => (
          <group key={`rafter-${idx}`} position={[0, 0, rz]}>
            <mesh position={[-1.65, 0.68, 0]} rotation={[0, 0, 0.36]} castShadow>
              <boxGeometry args={[3.5, 0.09, 0.11]} />
              <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.55} />
            </mesh>
            <mesh position={[1.65, 0.68, 0]} rotation={[0, 0, -0.36]} castShadow>
              <boxGeometry args={[3.5, 0.09, 0.11]} />
              <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.55} />
            </mesh>
            <mesh position={[0, 1.12, 0]} castShadow>
              <boxGeometry args={[1.65, 0.07, 0.09]} />
              <meshStandardMaterial map={oakMap} color="#92400e" roughness={0.55} />
            </mesh>
          </group>
        ))}

        {/* Warm Attic Skylight & Golden Fairy Lights */}
        <pointLight position={[0.0, 1.22, 2.05]} intensity={2.2} distance={5.5} decay={2} color="#fde68a" />
        <pointLight position={[-0.95, 1.15, 1.55]} intensity={1.4} distance={4.0} decay={2} color="#fef08a" />
        {[-0.9, -0.45, 0.0, 0.45, 0.9].map((lx, i) => (
          <mesh key={`abulb-${i}`} position={[lx, 1.08, 1.4 + (i % 2) * 0.4]}>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={1.8} />
          </mesh>
        ))}

        {/* Woven Moroccan Circular Area Rug in the Center of the Attic Studio (Floor Plan) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.0, 0.032, 1.85]} receiveShadow>
          <circleGeometry args={[1.40, 36]} />
          <meshStandardMaterial map={rugMap} bumpMap={boucleBump} bumpScale={0.012} roughness={0.9} />
        </mesh>

        {/* --- A. STUDY DESK WITH COMPUTER & CHAIR (West Wall on Floor Plan) --- */}
        <group position={[-1.25, 0.03, 1.65]}>
          {/* Oak Computer Desk Top */}
          <RoundedBox args={[0.72, 0.035, 1.25]} radius={0.012} smoothness={4} position={[0, 0.72, 0]} castShadow receiveShadow>
            <meshStandardMaterial map={oakMap} color="#b45309" roughness={0.45} />
          </RoundedBox>
          {/* Desk Legs */}
          {[
            [-0.30, 0.36, -0.56],
            [0.30, 0.36, -0.56],
            [-0.30, 0.36, 0.56],
            [0.30, 0.36, 0.56],
          ].map((dlp, di) => (
            <mesh key={`dleg-${di}`} position={dlp} castShadow>
              <cylinderGeometry args={[0.022, 0.016, 0.72, 10]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
            </mesh>
          ))}
          {/* Ultra-Wide Curved Desktop Monitor */}
          <group position={[-0.12, 0.74, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 0.01, 0]} castShadow>
              <cylinderGeometry args={[0.10, 0.12, 0.018, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.16, -0.04]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.30, 10]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.28, 0]} castShadow>
              <boxGeometry args={[0.72, 0.34, 0.024]} />
              <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.28, 0.013]}>
              <planeGeometry args={[0.68, 0.30]} />
              <meshBasicMaterial map={scopeTex} />
            </mesh>
          </group>
          {/* Mechanical Keyboard & Wireless Mouse */}
          <mesh position={[0.12, 0.745, 0]} castShadow>
            <boxGeometry args={[0.15, 0.012, 0.38]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
          <mesh position={[0.12, 0.745, 0.26]} castShadow>
            <boxGeometry args={[0.09, 0.014, 0.06]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} />
          </mesh>
          {/* Modern Swivel Office Desk Chair */}
          <group position={[0.55, 0, 0]}>
            <mesh position={[0, 0.06, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.03, 5]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.26, 0]} castShadow>
              <cylinderGeometry args={[0.024, 0.024, 0.40, 12]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
            </mesh>
            <RoundedBox args={[0.44, 0.06, 0.44]} radius={0.02} smoothness={4} position={[0, 0.46, 0]} castShadow>
              <meshStandardMaterial color="#1e293b" bumpMap={boucleBump} roughness={0.7} />
            </RoundedBox>
            <RoundedBox args={[0.10, 0.46, 0.42]} radius={0.02} smoothness={4} position={[0.18, 0.72, 0]} castShadow>
              <meshStandardMaterial color="#1e293b" bumpMap={boucleBump} roughness={0.7} />
            </RoundedBox>
          </group>
        </group>

        {/* --- B. DRAFTING & SKETCHBOOK TABLE ALONG SOUTH WALL (Floor Plan) --- */}
        <group position={[0.35, 0.03, 3.10]}>
          <RoundedBox
            args={[1.18, 0.036, 0.72]}
            radius={0.012}
            smoothness={4}
            position={[0, 0.44, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              map={oakMap}
              bumpMap={oakBump}
              bumpScale={0.015}
              color="#b45309"
              roughness={0.44}
            />
          </RoundedBox>
          {[
            [-0.50, 0.22, -0.28],
            [0.50, 0.22, -0.28],
            [-0.50, 0.22, 0.28],
            [0.50, 0.22, 0.28],
          ].map((lpos, idx) => (
            <mesh key={`aleg-${idx}`} position={lpos} castShadow>
              <cylinderGeometry args={[0.024, 0.016, 0.44, 10]} />
              <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
            </mesh>
          ))}

          {/* 1. Primary Open Spiral-Bound Sketchbook with Interactive Flipping Sketch Page! */}
          <group position={[-0.04, 0.464, 0.04]} rotation={[0.14, 0, 0]}>
            <mesh position={[0, 0.004, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.44, 0.01, 0.35]} />
              <meshStandardMaterial color="#1e293b" roughness={0.65} />
            </mesh>
            <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.42, 0.008, 0.33]} />
              <meshStandardMaterial color="#faf5e8" roughness={0.82} />
            </mesh>

            {/* Revealed Inside Page 2 (Machaan Stage Design & UI/UX Storyboards) */}
            <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.41, 0.32]} />
              <meshBasicMaterial map={sketchPage2InsideTex} />
            </mesh>

            {/* Animated Flipping Sketch Page 1 (Meraki Fine Art & Architectural Charcoal Sketches) */}
            <group ref={sketchFlipHingeRef} position={[-0.205, 0.017, 0]}>
              <mesh position={[0.205, 0, 0]} castShadow>
                <boxGeometry args={[0.41, 0.002, 0.32]} />
                <meshStandardMaterial color="#faf5e8" roughness={0.8} />
              </mesh>
              <mesh position={[0.205, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.41, 0.32]} />
                <meshBasicMaterial map={sketchPage1FrontTex} />
              </mesh>
              <mesh position={[0.205, -0.0015, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
                <planeGeometry args={[0.41, 0.32]} />
                <meshBasicMaterial map={sketchPage1BackTex} />
              </mesh>
            </group>
          </group>

          {/* 2. Ceramic Jar of Paintbrushes, Graphite Pencils & Wooden Palette */}
          <group position={[0.38, 0.46, -0.08]}>
            <mesh position={[0, 0.045, 0]} castShadow>
              <cylinderGeometry args={[0.038, 0.032, 0.09, 16]} />
              <meshStandardMaterial color="#c2410c" roughness={0.55} />
            </mesh>
            {[-0.012, 0.0, 0.014].map((bx, i) => (
              <group key={`brush-${i}`} position={[bx, 0.11, (i - 1) * 0.008]} rotation={[0.12 * (i - 1), 0, -0.15 * (i - 1)]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.004, 0.003, 0.11, 8]} />
                  <meshStandardMaterial color="#fde047" roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.062, 0]}>
                  <coneGeometry args={[0.007, 0.022, 8]} />
                  <meshStandardMaterial color={i === 0 ? '#ef4444' : i === 1 ? '#38bdf8' : '#1e293b'} />
                </mesh>
              </group>
            ))}

            <group position={[-0.04, 0.008, 0.16]} rotation={[0, -0.35, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.11, 0.11, 0.01, 20]} scale={[1.25, 1, 0.9]} />
                <meshStandardMaterial map={oakMap} color="#d97706" roughness={0.48} />
              </mesh>
              {[
                [-0.05, 0.008, -0.02, '#ef4444'],
                [0.01, 0.008, -0.04, '#38bdf8'],
                [0.06, 0.008, 0.01, '#fde047'],
                [-0.01, 0.008, 0.04, '#10b981'],
              ].map((dab, idx) => (
                <mesh key={`adab-${idx}`} position={[dab[0], dab[1], dab[2]]}>
                  <sphereGeometry args={[0.016, 10, 10]} />
                  <meshStandardMaterial color={dab[3]} roughness={0.3} />
                </mesh>
              ))}
            </group>
          </group>
        </group>

        {/* --- C. TALL OAK BOOKSHELF & STORAGE CABINETS (East Wall on Floor Plan) --- */}
        <group position={[1.35, 0.03, 1.85]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.65, 1.70, 0.35]} />
            <meshStandardMaterial map={oakMap} bumpMap={oakBump} color="#78350f" roughness={0.48} />
          </mesh>
          {/* Shelves & Books */}
          {[0.25, 0.65, 1.05, 1.45].map((sy, si) => (
            <mesh key={`shelf-${si}`} position={[0, sy, 0]}>
              <boxGeometry args={[1.55, 0.028, 0.32]} />
              <meshStandardMaterial map={oakMap} color="#92400e" roughness={0.5} />
            </mesh>
          ))}
          {/* Rows of colorful hardcovers & notebooks */}
          {[-0.55, -0.35, -0.15, 0.05, 0.25, 0.45].map((bx, bi) => (
            <mesh key={`bgroup-${bi}`} position={[bx, 0.46, 0.02]} castShadow>
              <boxGeometry args={[0.16, 0.28, 0.24]} />
              <meshStandardMaterial color={bi % 3 === 0 ? '#1e3a8a' : bi % 3 === 1 ? '#047857' : '#b45309'} roughness={0.6} />
            </mesh>
          ))}
        </group>

        {/* --- D. WOODEN A-FRAME ARTIST EASEL & GALLERY CANVASES (North-West on Floor Plan) --- */}
        <group position={[-0.85, 0.03, 0.95]} rotation={[0, 0.42, 0]}>
          <mesh position={[-0.18, 0.46, 0.06]} rotation={[-0.14, 0, -0.12]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.96, 8]} />
            <meshStandardMaterial map={oakMap} color="#92400e" roughness={0.55} />
          </mesh>
          <mesh position={[0.18, 0.46, 0.06]} rotation={[-0.14, 0, 0.12]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.96, 8]} />
            <meshStandardMaterial map={oakMap} color="#92400e" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.44, -0.16]} rotation={[0.24, 0, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.94, 8]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.44, 0.09]} castShadow>
            <boxGeometry args={[0.52, 0.025, 0.07]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
          </mesh>
          <group position={[0, 0.68, 0.07]} rotation={[-0.14, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.48, 0.48, 0.026]} />
              <meshStandardMaterial color="#fefce8" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.015]}>
              <planeGeometry args={[0.44, 0.44]} />
              <meshStandardMaterial map={easelArtTex} roughness={0.35} />
            </mesh>
          </group>
        </group>

        {/* Framed Paintings leaning & mounted in the Attic Gallery (Theatrical Stage & Botanical Canvas) */}
        <group position={[-1.32, 0.44, 2.75]} rotation={[-0.1, 0.72, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.54, 0.54, 0.03]} />
            <meshStandardMaterial map={oakMap} color="#78350f" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.017]}>
            <planeGeometry args={[0.47, 0.47]} />
            <meshStandardMaterial map={machaanArtTex} roughness={0.38} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
