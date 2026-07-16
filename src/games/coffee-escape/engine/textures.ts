import * as THREE from 'three';

/** Procedural house-interior textures — no external image assets. */

export function makeFloorTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  // Warm hardwood base
  g.fillStyle = '#c48952';
  g.fillRect(0, 0, 256, 256);
  // Planks running along the hallway (horizontal bands on texture)
  for (let i = 0; i < 4; i++) {
    const y = i * 64;
    const tint = ['#c48952', '#b87a45', '#cc9158', '#b07040'][i]!;
    g.fillStyle = tint;
    g.fillRect(0, y, 256, 64);
    // Plank separator (darker groove)
    g.fillStyle = 'rgba(55, 28, 10, 0.45)';
    g.fillRect(0, y, 256, 2);
    // Wood grain
    g.strokeStyle = 'rgba(90, 45, 18, 0.2)';
    g.lineWidth = 0.8;
    for (let j = 0; j < 5; j++) {
      const gy = y + 10 + j * 10 + Math.sin(j * 1.9 + i) * 2;
      g.beginPath();
      g.moveTo(0, gy);
      g.bezierCurveTo(70, gy + 2, 140, gy - 2, 256, gy + 1);
      g.stroke();
    }
    // Knots
    for (let k = 0; k < 2; k++) {
      const kx = 28 + ((i * 71 + k * 109) % 200);
      const ky = y + 16 + ((i * 37 + k * 23) % 36);
      g.fillStyle = 'rgba(55, 28, 10, 0.28)';
      g.beginPath();
      g.ellipse(kx, ky, 7, 4, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 28);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeWallTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  // Warm plaster / painted house wall
  g.fillStyle = '#f7e2c0';
  g.fillRect(0, 0, 256, 256);
  // Soft noise blotches
  for (let i = 0; i < 40; i++) {
    const x = (i * 47) % 256;
    const y = (i * 89) % 256;
    g.fillStyle = `rgba(200, 140, 80, ${0.03 + (i % 3) * 0.01})`;
    g.beginPath();
    g.ellipse(x, y, 18, 12, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Wainscoting / chair rail lower third
  g.fillStyle = 'rgba(140, 85, 40, 0.1)';
  g.fillRect(0, 168, 256, 88);
  g.fillStyle = 'rgba(120, 70, 30, 0.22)';
  g.fillRect(0, 165, 256, 4);
  // Vertical panel lines in wainscot
  g.strokeStyle = 'rgba(120, 70, 30, 0.12)';
  g.lineWidth = 1.5;
  for (let x = 32; x < 256; x += 48) {
    g.beginPath();
    g.moveTo(x, 168);
    g.lineTo(x, 256);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeCeilingTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  // Soft cream ceiling (house, not office tiles)
  g.fillStyle = '#fff6e4';
  g.fillRect(0, 0, 256, 256);
  // Very subtle plaster variation
  for (let i = 0; i < 20; i++) {
    g.fillStyle = `rgba(230, 200, 150, ${0.04 + (i % 2) * 0.02})`;
    g.beginPath();
    g.ellipse((i * 53) % 256, (i * 97) % 256, 30, 20, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Light crown-molding hint as soft edge bands
  g.fillStyle = 'rgba(200, 160, 100, 0.08)';
  g.fillRect(0, 0, 256, 8);
  g.fillRect(0, 248, 256, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Kitchen ceramic tile floor. */
export function makeKitchenFloorTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e8e0d4';
  g.fillRect(0, 0, 256, 256);
  const tile = 32;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const light = ((x / tile + y / tile) % 2 === 0);
      g.fillStyle = light ? '#f2ebe0' : '#ddd4c6';
      g.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      // Grout
      g.strokeStyle = 'rgba(160, 150, 140, 0.55)';
      g.lineWidth = 2;
      g.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 24);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cooler kitchen wall (soft mint / backsplash hint). */
export function makeKitchenWallTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e8f0ea';
  g.fillRect(0, 0, 256, 256);
  // Upper paint
  g.fillStyle = '#dfeae2';
  g.fillRect(0, 0, 256, 150);
  // Tile backsplash lower band
  for (let y = 150; y < 256; y += 22) {
    for (let x = 0; x < 256; x += 28) {
      g.fillStyle = (x / 28 + y / 22) % 2 === 0 ? '#c8ddd0' : '#b8d0c4';
      g.fillRect(x + 1, y + 1, 26, 20);
    }
  }
  g.fillStyle = 'rgba(100, 130, 110, 0.35)';
  g.fillRect(0, 148, 256, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Living room warm plaster (slightly rosier than hall). */
export function makeLivingWallTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f8e4cc';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 36; i++) {
    g.fillStyle = `rgba(210, 140, 90, ${0.03 + (i % 3) * 0.012})`;
    g.beginPath();
    g.ellipse((i * 53) % 256, (i * 91) % 256, 20, 14, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Soft chair rail
  g.fillStyle = 'rgba(150, 90, 50, 0.12)';
  g.fillRect(0, 170, 256, 86);
  g.fillStyle = 'rgba(130, 75, 40, 0.2)';
  g.fillRect(0, 168, 256, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Garden grass floor. */
export function makeGrassTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#4a8a38';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) {
    const x = (i * 47) % 256;
    const y = (i * 89) % 256;
    g.strokeStyle = i % 3 === 0 ? 'rgba(60, 120, 40, 0.55)' : 'rgba(90, 160, 55, 0.4)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, y + 6);
    g.lineTo(x + (i % 5) - 2, y);
    g.stroke();
  }
  // Patch variation
  for (let i = 0; i < 12; i++) {
    g.fillStyle = `rgba(40, 90, 30, ${0.08 + (i % 3) * 0.04})`;
    g.beginPath();
    g.ellipse((i * 61) % 256, (i * 97) % 256, 28, 18, 0, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 22);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Stone patio path band texture. */
export function makePathTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#9a9080';
  g.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 28) {
    g.fillStyle = y % 56 === 0 ? '#a8a090' : '#8e8678';
    g.fillRect(4, y + 2, 120, 24);
    g.strokeStyle = 'rgba(60, 55, 45, 0.35)';
    g.strokeRect(4.5, y + 2.5, 119, 23);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 18);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makePictureTexture(variant: number) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 96;
  const g = c.getContext('2d')!;
  const v = variant % 4;

  if (v === 0) {
    // Family photo — warm living room silhouette
    g.fillStyle = '#e8c090';
    g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#8a5a30';
    g.fillRect(0, 60, 128, 36);
    // Window glow
    g.fillStyle = '#fff2c8';
    g.fillRect(70, 12, 40, 32);
    g.strokeStyle = '#6a4020';
    g.strokeRect(70, 12, 40, 32);
    // Two stick figures
    g.fillStyle = '#5a3a20';
    g.beginPath();
    g.arc(40, 42, 8, 0, Math.PI * 2);
    g.fill();
    g.fillRect(34, 50, 12, 22);
    g.beginPath();
    g.arc(58, 44, 7, 0, Math.PI * 2);
    g.fill();
    g.fillRect(52, 51, 12, 20);
  } else if (v === 1) {
    // Landscape — hills at sunset
    const grad = g.createLinearGradient(0, 0, 0, 96);
    grad.addColorStop(0, '#ffb070');
    grad.addColorStop(0.55, '#f0d0a0');
    grad.addColorStop(1, '#7a9a50');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#5a7a38';
    g.beginPath();
    g.moveTo(0, 70);
    g.quadraticCurveTo(40, 40, 80, 65);
    g.quadraticCurveTo(100, 80, 128, 55);
    g.lineTo(128, 96);
    g.lineTo(0, 96);
    g.fill();
    g.fillStyle = '#ffd080';
    g.beginPath();
    g.arc(100, 28, 12, 0, Math.PI * 2);
    g.fill();
  } else if (v === 2) {
    // Kitchen still life — cup & fruit
    g.fillStyle = '#f0d8b0';
    g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#c08050';
    g.fillRect(0, 68, 128, 28);
    // Cup
    g.fillStyle = '#fff';
    g.fillRect(30, 36, 28, 28);
    g.fillStyle = '#3a1f08';
    g.beginPath();
    g.ellipse(44, 38, 12, 4, 0, 0, Math.PI * 2);
    g.fill();
    // Apple
    g.fillStyle = '#c04030';
    g.beginPath();
    g.arc(88, 55, 12, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#3a6a20';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(88, 44);
    g.lineTo(90, 36);
    g.stroke();
  } else {
    // Abstract house art — warm shapes
    g.fillStyle = '#f4c890';
    g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#d07040';
    g.beginPath();
    g.moveTo(64, 12);
    g.lineTo(100, 48);
    g.lineTo(28, 48);
    g.closePath();
    g.fill();
    g.fillStyle = '#e8b878';
    g.fillRect(40, 48, 48, 36);
    g.fillStyle = '#6a4020';
    g.fillRect(56, 60, 16, 24);
    g.fillStyle = '#88b0d0';
    g.fillRect(44, 56, 10, 10);
    g.fillRect(74, 56, 10, 10);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
