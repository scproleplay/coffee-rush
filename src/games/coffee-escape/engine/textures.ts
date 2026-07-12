import * as THREE from 'three';

/** Procedural hallway textures — no external image assets. */

export function makeFloorTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  // Base wood color
  g.fillStyle = '#b07a48';
  g.fillRect(0, 0, 256, 256);
  // Slight color variation per plank (3 planks tall)
  for (let i = 0; i < 3; i++) {
    const y = i * 86;
    const tint = ['#a87042', '#b67e4c', '#aa7244'][i];
    g.fillStyle = tint;
    g.fillRect(0, y, 256, 86);
    // Plank separator
    g.fillStyle = 'rgba(60, 30, 10, 0.4)';
    g.fillRect(0, y, 256, 1);
    // Wood grain lines within the plank
    g.strokeStyle = 'rgba(80, 40, 20, 0.18)';
    g.lineWidth = 0.7;
    for (let j = 0; j < 6; j++) {
      const gy = y + 8 + j * 13 + Math.sin(j * 1.7) * 2;
      g.beginPath();
      g.moveTo(0, gy);
      g.bezierCurveTo(60, gy + 2, 130, gy - 2, 256, gy + 1);
      g.stroke();
    }
    // A few knots
    for (let k = 0; k < 2; k++) {
      const kx = 30 + ((i * 73 + k * 113) % 200);
      const ky = y + 20 + ((i * 41 + k * 19) % 50);
      g.fillStyle = 'rgba(60, 30, 10, 0.3)';
      g.beginPath();
      g.ellipse(kx, ky, 6, 4, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 30);
  tex.anisotropy = 4;
  return tex;
}

export function makeWallTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  // Base cream — warm house wall.
  g.fillStyle = '#f4d6a8';
  g.fillRect(0, 0, 256, 256);
  // Subtle vertical stripes (very faint, gives the wall depth).
  g.fillStyle = 'rgba(178, 94, 0, 0.05)';
  for (let x = 0; x < 256; x += 24) g.fillRect(x, 0, 12, 256);
  // Wainscoting: lower panel with a horizontal rail.
  g.fillStyle = 'rgba(120, 70, 30, 0.08)';
  g.fillRect(0, 170, 256, 86);
  g.fillStyle = 'rgba(120, 70, 30, 0.15)';
  g.fillRect(0, 168, 256, 3);
  // Subtle picture-frame rectangles on the upper wall.
  g.strokeStyle = 'rgba(120, 70, 30, 0.10)';
  g.lineWidth = 1.5;
  g.strokeRect(40, 20, 60, 45);
  g.strokeRect(156, 28, 50, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 1);
  tex.anisotropy = 4;
  return tex;
}

export function makeCeilingTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff7e0';
  g.fillRect(0, 0, 256, 256);
  // Tile grid
  g.strokeStyle = '#caa274';
  g.lineWidth = 2;
  for (let y = 0; y <= 256; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  for (let x = 0; x <= 256; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 256);
    g.stroke();
  }
  // Soft tint per tile (alternates)
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if ((x + y) % 2 === 0) {
        g.fillStyle = 'rgba(255, 220, 160, 0.18)';
        g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 12);
  return tex;
}

export function makePictureTexture(variant: number) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const g = c.getContext('2d')!;
  // Background gradient
  if (variant === 0) {
    // Steam swirl (matches the cup)
    g.fillStyle = '#f4b572'; g.fillRect(0, 0, 128, 96);
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(32, 80);
    g.bezierCurveTo(20, 40, 80, 40, 96, 16);
    g.stroke();
  } else if (variant === 1) {
    // A coffee bean
    g.fillStyle = '#fff7e0'; g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#5a3a14';
    g.save();
    g.translate(64, 48);
    g.rotate(0.5);
    g.beginPath();
    g.ellipse(0, 0, 28, 18, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff7e0';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-22, 0);
    g.quadraticCurveTo(0, 4, 22, 0);
    g.stroke();
    g.restore();
  } else if (variant === 2) {
    // A espresso cup
    g.fillStyle = '#e7c08a'; g.fillRect(0, 0, 128, 96);
    // Saucer
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(64, 70, 36, 8, 0, 0, Math.PI * 2);
    g.fill();
    // Cup
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(40, 30);
    g.lineTo(88, 30);
    g.lineTo(82, 68);
    g.lineTo(46, 68);
    g.closePath();
    g.fill();
    g.strokeStyle = '#5a3a14';
    g.lineWidth = 1.5;
    g.stroke();
    // Coffee
    g.fillStyle = '#3a1f08';
    g.beginPath();
    g.ellipse(64, 32, 22, 4, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    // Chalkboard menu
    g.fillStyle = '#2a4a32'; g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#fff';
    g.font = 'bold 14px sans-serif';
    g.textAlign = 'center';
    g.fillText('MENU', 64, 18);
    g.font = '10px sans-serif';
    g.fillText('Espresso ..... $3', 64, 38);
    g.fillText('Latte ......... $4', 64, 52);
    g.fillText('Cappuccino ... $4', 64, 66);
    g.fillText('Drip Coffee .. $2', 64, 80);
  }
  return new THREE.CanvasTexture(c);
}
