/* IRONBLOOM — canvas art: the gym, the equipment, the people. */
'use strict';

function rr(g, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + radius, y);
  g.arcTo(x + w, y, x + w, y + h, radius);
  g.arcTo(x + w, y + h, x, y + h, radius);
  g.arcTo(x, y + h, x, y, radius);
  g.arcTo(x, y, x + w, y, radius);
  g.closePath();
}

function fillStroke(g, fill, stroke = INK, line = 2.6) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = line; g.stroke(); }
}

function line(g, x1, y1, x2, y2, color = INK, width = 2.4, cap = 'round') {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = cap;
  g.stroke();
}

function dot(g, x, y, r, fill, stroke = null, line = 1.5) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = line; g.stroke(); }
}

function drawPlant(g, x, y, s = 1, pot = '#ff6b57') {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = 'rgba(15,45,38,.14)';
  g.beginPath();
  g.ellipse(0, 2, 28, 7, 0, 0, Math.PI * 2);
  g.fill();
  const leaves = [
    [-14, -34, -0.7], [-2, -52, -0.12], [13, -38, 0.6], [-22, -18, -1.05], [20, -20, 0.95], [0, -35, 0.2]
  ];
  leaves.forEach(([lx, ly, rot], i) => {
    g.save();
    g.translate(lx, ly);
    g.rotate(rot);
    g.beginPath();
    g.ellipse(0, 0, 9, 21, 0, 0, Math.PI * 2);
    g.fillStyle = i % 2 ? '#2f8e7a' : '#53b393';
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.stroke();
    line(g, 0, 12, 0, -9, 'rgba(23,63,53,.35)', 1.6);
    g.restore();
  });
  rr(g, -21, -11, 42, 30, 8);
  fillStroke(g, pot);
  rr(g, -25, -14, 50, 8, 4);
  fillStroke(g, '#f3e4c7');
  g.restore();
}

function drawWindow(g, x, y, w, h) {
  g.save();
  rr(g, x - 8, y - 8, w + 16, h + 16, 17);
  fillStroke(g, '#ead8b7', INK, 3.2);

  rr(g, x, y, w, h, 8);
  g.save();
  g.clip();

  const sky = g.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#a9dce9');
  sky.addColorStop(0.55, '#d9f1ee');
  sky.addColorStop(1, '#f8e6bf');
  g.fillStyle = sky;
  g.fillRect(x, y, w, h);

  // sun
  g.globalAlpha = 0.9;
  dot(g, x + w * 0.7, y + h * 0.23, 24, '#ffe28a');
  g.globalAlpha = 1;

  // clouds
  g.fillStyle = 'rgba(255,255,255,.78)';
  const cloud = (cx, cy, s) => {
    g.beginPath();
    g.ellipse(cx, cy, 24 * s, 8 * s, 0, 0, Math.PI * 2);
    g.ellipse(cx - 16 * s, cy + 3 * s, 15 * s, 6 * s, 0, 0, Math.PI * 2);
    g.ellipse(cx + 17 * s, cy + 3 * s, 16 * s, 6 * s, 0, 0, Math.PI * 2);
    g.fill();
  };
  cloud(x + w * 0.3, y + h * 0.24, 1);
  cloud(x + w * 0.76, y + h * 0.39, 0.75);

  // distant city
  const baseY = y + h - 16;
  const blocks = [
    [0.02, 55, 0.2], [0.14, 38, 0.26], [0.24, 68, 0.17], [0.36, 44, 0.22],
    [0.47, 82, 0.14], [0.61, 50, 0.19], [0.72, 64, 0.16], [0.84, 36, 0.23], [0.92, 54, 0.18]
  ];
  blocks.forEach(([px, bh, sw], i) => {
    const bw = w * sw;
    const bx = x + w * px;
    const by = baseY - bh;
    g.fillStyle = i % 2 ? 'rgba(80,130,124,.38)' : 'rgba(70,117,112,.28)';
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = 'rgba(255,248,233,.36)';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        if ((row + col + i) % 3 !== 0) g.fillRect(bx + 6 + col * 13, by + 9 + row * 14, 5, 6);
      }
    }
  });

  // tree line
  g.fillStyle = 'rgba(47,142,122,.4)';
  for (let i = 0; i < 7; i++) {
    dot(g, x + 20 + i * (w / 7), baseY - 3, 16, 'rgba(47,142,122,.35)');
  }

  // glass shine
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.beginPath();
  g.moveTo(x - 20, y + h);
  g.lineTo(x + w * 0.4, y);
  g.lineTo(x + w * 0.58, y);
  g.lineTo(x - 2, y + h);
  g.closePath();
  g.fill();
  g.restore();

  // frame bars
  g.strokeStyle = INK;
  g.lineWidth = 3.2;
  g.strokeRect(x, y, w, h);
  line(g, x + w / 2, y, x + w / 2, y + h, INK, 3.2);
  line(g, x, y + h * 0.55, x + w, y + h * 0.55, INK, 3.2);
  line(g, x + 3, y + h * 0.55, x + 3, y + h, 'rgba(255,255,255,.35)', 2);

  // sill
  rr(g, x - 15, y + h + 5, w + 30, 12, 5);
  fillStroke(g, '#fff2d7', INK, 2.6);
  g.restore();
}

function drawPoster(g, x, y, w, h, title, sub, color) {
  g.save();
  g.translate(x, y);
  g.rotate(-1.2 * Math.PI / 180);
  rr(g, 0, 0, w, h, 6);
  fillStroke(g, '#fffaf0', INK, 2.4);
  g.save();
  rr(g, 0, 0, w, h, 6);
  g.clip();
  g.fillStyle = color;
  g.fillRect(0, 0, w, h * 0.58);
  g.fillStyle = INK;
  g.font = '900 15px Lato, sans-serif';
  g.textAlign = 'center';
  g.fillText(title, w / 2, h * 0.33);
  g.fillStyle = 'rgba(255,250,240,.85)';
  g.font = '800 7px Lato, sans-serif';
  g.letterSpacing = '1px';
  g.fillText(sub, w / 2, h * 0.47);
  g.restore();
  g.fillStyle = INK;
  g.font = '800 7px Lato, sans-serif';
  g.textAlign = 'center';
  g.fillText('IRONBLOOM', w / 2, h - 10);
  g.restore();
}

function drawNeonSign(g) {
  g.save();
  // plaque
  rr(g, 405, 47, 370, 106, 20);
  fillStroke(g, '#123b32', '#f7e5bd', 3.2);
  rr(g, 413, 55, 354, 90, 15);
  g.strokeStyle = 'rgba(255,248,233,.18)';
  g.lineWidth = 1.5;
  g.stroke();

  // flower mark
  g.save();
  g.translate(448, 101);
  for (let i = 0; i < 6; i++) {
    g.save();
    g.rotate(i * Math.PI / 3);
    g.beginPath();
    g.ellipse(0, -18, 10, 18, 0, 0, Math.PI * 2);
    g.fillStyle = '#ff6b57';
    g.shadowColor = '#ff6b57';
    g.shadowBlur = 12;
    g.fill();
    g.restore();
  }
  dot(g, 0, 0, 9, '#ffc857', INK, 2);
  g.restore();

  // neon text
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = '900 46px Lato, sans-serif';
  g.letterSpacing = '-1px';
  g.shadowColor = '#ff8a72';
  g.shadowBlur = 22;
  g.fillStyle = '#fff2cf';
  g.fillText('IRONBLOOM', 480, 96);
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,107,87,.7)';
  g.lineWidth = 1.4;
  g.strokeText('IRONBLOOM', 480, 96);
  g.fillStyle = '#8bd6b8';
  g.font = '900 9px Lato, sans-serif';
  g.letterSpacing = '3px';
  g.fillText('STRICT FORM  •  SOFT LANDING', 482, 130);
  g.restore();
}

function drawMirror(g) {
  g.save();
  rr(g, 430, 202, 320, 188, 13);
  fillStroke(g, '#e8d4ae', INK, 3.4);
  rr(g, 438, 210, 304, 172, 8);
  const grad = g.createLinearGradient(438, 210, 742, 382);
  grad.addColorStop(0, '#1e5a4d');
  grad.addColorStop(0.45, '#123f35');
  grad.addColorStop(1, '#2d7a68');
  fillStroke(g, grad, INK, 2);
  g.save();
  rr(g, 438, 210, 304, 172, 8);
  g.clip();
  g.globalAlpha = 0.13;
  g.fillStyle = '#d9fff1';
  g.beginPath();
  g.moveTo(470, 382);
  g.lineTo(610, 210);
  g.lineTo(665, 210);
  g.lineTo(525, 382);
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,248,233,.18)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) line(g, 438, 240 + i * 36, 742, 240 + i * 36, 'rgba(255,248,233,.09)', 1);
  g.restore();

  g.textAlign = 'center';
  g.fillStyle = '#fff2cf';
  g.font = '900 34px Lato, sans-serif';
  g.letterSpacing = '1px';
  g.fillText('FORM FIRST', 590, 290);
  g.fillStyle = '#8bd6b8';
  g.font = '900 8px Lato, sans-serif';
  g.letterSpacing = '3px';
  g.fillText('THE MIRROR NEVER LIES', 590, 312);

  // little corner screws
  [[444, 216], [736, 216], [444, 376], [736, 376]].forEach(([x, y]) => dot(g, x, y, 2.5, '#ffc857'));
  g.restore();
}

function drawFloor(g) {
  g.save();
  const floor = g.createLinearGradient(0, 478, 0, 760);
  floor.addColorStop(0, '#e3d2b1');
  floor.addColorStop(0.55, '#d4bf99');
  floor.addColorStop(1, '#c2a77f');
  g.fillStyle = floor;
  g.fillRect(0, 478, DESIGN_W, 282);

  // clipped grid
  g.save();
  g.beginPath();
  g.rect(0, 478, DESIGN_W, 282);
  g.clip();

  g.strokeStyle = 'rgba(23,63,53,.09)';
  g.lineWidth = 1.5;
  const vpX = 590;
  for (let i = -12; i <= 12; i++) {
    g.beginPath();
    g.moveTo(vpX, 478);
    g.lineTo(vpX + i * 105, 760);
    g.stroke();
  }
  for (let i = 1; i <= 10; i++) {
    const y = 478 + Math.pow(i / 10, 1.55) * 282;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(DESIGN_W, y);
    g.stroke();
  }

  // terrazzo flecks
  const flecks = [
    [90, 520, 2, '#9b7f59'], [150, 590, 1.6, '#f5e8cf'], [260, 700, 2.2, '#8f7150'],
    [320, 620, 1.4, '#fff4d8'], [460, 520, 2, '#a98a63'], [540, 640, 1.5, '#f3dfbe'],
    [620, 560, 2, '#997a55'], [700, 730, 2.2, '#f8e8c7'], [780, 610, 1.6, '#947653'],
    [840, 540, 2, '#fff1d2'], [950, 650, 1.8, '#9e7f59'], [1040, 560, 2.2, '#f6e4c4'],
    [1110, 720, 1.5, '#8c6d4a'], [380, 750, 2, '#f5e1bc'], [1000, 740, 2, '#947554']
  ];
  flecks.forEach(([x, y, r, c]) => dot(g, x, y, r, c));

  // big soft logo rug
  g.globalAlpha = 0.12;
  g.beginPath();
  g.ellipse(590, 694, 205, 57, 0, 0, Math.PI * 2);
  g.fillStyle = '#173f35';
  g.fill();
  g.globalAlpha = 0.23;
  g.beginPath();
  g.ellipse(590, 694, 205, 57, 0, 0, Math.PI * 2);
  g.strokeStyle = '#173f35';
  g.lineWidth = 2;
  g.setLineDash([7, 8]);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;
  g.restore();

  // front edge
  g.fillStyle = 'rgba(15,45,38,.14)';
  g.fillRect(0, 752, DESIGN_W, 8);
  g.restore();
}

function drawSunbeams(g) {
  g.save();
  g.globalCompositeOperation = 'screen';
  g.fillStyle = 'rgba(255,236,174,.15)';
  g.beginPath();
  g.moveTo(70, 360);
  g.lineTo(330, 360);
  g.lineTo(500, 740);
  g.lineTo(250, 740);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(860, 360);
  g.lineTo(1120, 360);
  g.lineTo(1060, 740);
  g.lineTo(810, 740);
  g.closePath();
  g.fill();
  g.restore();
}

function drawDesk(g) {
  g.save();
  // shadow
  g.fillStyle = 'rgba(15,45,38,.13)';
  g.beginPath();
  g.ellipse(170, 575, 128, 17, 0, 0, Math.PI * 2);
  g.fill();

  // counter
  rr(g, 55, 438, 230, 120, 12);
  fillStroke(g, '#ff6b57', INK, 3.4);
  rr(g, 48, 428, 244, 27, 10);
  fillStroke(g, '#fff2d7', INK, 3.4);
  // front panel
  rr(g, 75, 470, 190, 68, 7);
  fillStroke(g, '#f9e7c6', INK, 2.2);
  g.textAlign = 'center';
  g.fillStyle = INK;
  g.font = '900 14px Lato, sans-serif';
  g.letterSpacing = '2px';
  g.fillText('CHECK IN', 170, 501);
  g.fillStyle = '#2a7f6d';
  g.font = '900 7px Lato, sans-serif';
  g.letterSpacing = '1px';
  g.fillText('STRICT FORM • SOFT LANDING', 170, 515);
  // flower logo on desk
  g.save();
  g.translate(170, 538);
  for (let i = 0; i < 5; i++) {
    g.save();
    g.rotate(i * Math.PI * 2 / 5);
    g.beginPath();
    g.ellipse(0, -7, 4, 7, 0, 0, Math.PI * 2);
    g.fillStyle = '#ffc857';
    g.fill();
    g.restore();
  }
  dot(g, 0, 0, 3, '#173f35');
  g.restore();

  // laptop
  rr(g, 90, 392, 58, 38, 4);
  fillStroke(g, '#173f35', INK, 2.2);
  rr(g, 96, 398, 46, 26, 2);
  g.fillStyle = '#8bd6b8';
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.fillRect(100, 402, 20, 3);
  g.fillRect(100, 408, 30, 2);

  // bell
  g.beginPath();
  g.arc(190, 421, 13, Math.PI, 0);
  g.fillStyle = '#ffc857';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  g.stroke();
  line(g, 177, 421, 203, 421, INK, 2.4);
  line(g, 190, 408, 190, 403, INK, 2.4);
  dot(g, 190, 406, 3.2, '#ffc857', INK, 1.5);

  // clipboard
  g.save();
  g.translate(235, 400);
  g.rotate(0.12);
  rr(g, 0, 0, 31, 42, 4);
  fillStroke(g, '#fffaf0', INK, 2.2);
  g.fillStyle = '#ffc857';
  g.fillRect(6, 0, 19, 7);
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.strokeRect(6, 0, 19, 7);
  g.strokeStyle = 'rgba(23,63,53,.3)';
  for (let i = 0; i < 4; i++) line(g, 6, 16 + i * 6, 25, 16 + i * 6, 'rgba(23,63,53,.3)', 1.2);
  g.restore();

  // towel stack
  rr(g, 120, 412, 32, 8, 3);
  fillStroke(g, '#b9a7e8', INK, 1.8);
  rr(g, 120, 418, 32, 8, 3);
  fillStroke(g, '#8bd6b8', INK, 1.8);

  drawPlant(g, 280, 430, 0.62, '#ffc857');
  g.restore();
}

function drawDumbbellRack(g) {
  g.save();
  g.fillStyle = 'rgba(15,45,38,.12)';
  g.beginPath();
  g.ellipse(374, 571, 68, 10, 0, 0, Math.PI * 2);
  g.fill();
  rr(g, 314, 492, 118, 67, 8);
  fillStroke(g, '#2f8e7a', INK, 3);
  g.fillStyle = '#173f35';
  g.font = '900 8px Lato, sans-serif';
  g.textAlign = 'center';
  g.letterSpacing = '1px';
  g.fillText('FREE WEIGHTS', 373, 505);
  const colors = ['#ff6b57', '#ffc857', '#8bd6b8', '#b9a7e8'];
  for (let tier = 0; tier < 2; tier++) {
    const y = 522 + tier * 25;
    line(g, 324, y + 8, 422, y + 8, 'rgba(23,63,53,.25)', 2);
    for (let i = 0; i < 4; i++) {
      const x = 330 + i * 23;
      dot(g, x - 6, y + 3, 5.5, colors[(i + tier) % 4], INK, 1.6);
      line(g, x - 1, y + 3, x + 7, y + 3, INK, 2);
      dot(g, x + 12, y + 3, 5.5, colors[(i + tier) % 4], INK, 1.6);
    }
  }
  g.restore();
}

function drawSquatRack(g) {
  g.save();
  g.fillStyle = 'rgba(15,45,38,.14)';
  g.beginPath();
  g.ellipse(725, 660, 110, 14, 0, 0, Math.PI * 2);
  g.fill();
  // rack uprights
  rr(g, 624, 478, 12, 164, 4);
  fillStroke(g, '#2f8e7a', INK, 2.8);
  rr(g, 820, 478, 12, 164, 4);
  fillStroke(g, '#2f8e7a', INK, 2.8);
  rr(g, 618, 630, 30, 12, 3);
  fillStroke(g, '#173f35', INK, 2);
  rr(g, 808, 630, 30, 12, 3);
  fillStroke(g, '#173f35', INK, 2);
  // top bar
  rr(g, 618, 472, 220, 12, 4);
  fillStroke(g, '#2f8e7a', INK, 2.8);

  // barbell
  line(g, 604, 526, 852, 526, INK, 5);
  [[612, 526], [844, 526]].forEach(([x, y], idx) => {
    g.beginPath();
    g.arc(x, y, 23, 0, Math.PI * 2);
    g.fillStyle = idx ? '#ffc857' : '#ff6b57';
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.stroke();
    g.beginPath();
    g.arc(x, y, 12, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(23,63,53,.32)';
    g.lineWidth = 2;
    g.stroke();
  });

  // bench
  rr(g, 670, 588, 112, 17, 7);
  fillStroke(g, '#b9a7e8', INK, 2.8);
  line(g, 692, 605, 682, 636, INK, 4);
  line(g, 760, 605, 770, 636, INK, 4);
  rr(g, 676, 633, 20, 6, 2);
  fillStroke(g, '#173f35', INK, 1.5);
  rr(g, 754, 633, 20, 6, 2);
  fillStroke(g, '#173f35', INK, 1.5);

  // chalk bowl
  g.beginPath();
  g.ellipse(858, 614, 17, 7, 0, 0, Math.PI * 2);
  fillStroke(g, '#fff2d7', INK, 2);
  g.fillStyle = 'rgba(255,255,255,.8)';
  g.beginPath();
  g.ellipse(858, 611, 11, 3.5, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawTreadmill(g, x = 945, scale = 1) {
  g.save();
  g.translate(x, 0);
  g.scale(scale, scale);
  g.fillStyle = 'rgba(15,45,38,.14)';
  g.beginPath();
  g.ellipse(0, 697, 92, 14, 0, 0, Math.PI * 2);
  g.fill();
  // base
  rr(g, -92, 652, 184, 38, 12);
  fillStroke(g, '#173f35', INK, 3);
  rr(g, -78, 657, 156, 24, 7);
  fillStroke(g, '#5b6f69', INK, 2);
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) line(g, -68 + i * 17, 660, -68 + i * 17, 678, 'rgba(255,255,255,.2)', 1.5);
  // arms
  line(g, -76, 650, -48, 566, INK, 5);
  line(g, 76, 650, 48, 566, INK, 5);
  line(g, -48, 566, 48, 566, INK, 5);
  // console
  rr(g, -52, 548, 104, 39, 7);
  fillStroke(g, '#2f8e7a', INK, 2.8);
  rr(g, -43, 556, 86, 21, 4);
  g.fillStyle = '#173f35';
  g.fill();
  g.fillStyle = '#8bd6b8';
  g.font = '900 8px Lato, sans-serif';
  g.textAlign = 'center';
  g.fillText('KEEP GOING', 0, 570);
  dot(g, -34, 559, 2, '#ff6b57');
  dot(g, 34, 559, 2, '#ffc857');
  // bottle
  rr(g, 62, 620, 13, 29, 5);
  fillStroke(g, '#b9a7e8', INK, 1.8);
  g.restore();
}

function drawYogaArea(g) {
  g.save();
  // mats
  const mats = [
    [-145, 704, 118, 22, '#8bd6b8', -0.06],
    [5, 722, 130, 25, '#b9a7e8', 0.05],
    [-82, 741, 104, 19, '#ff8a5b', -0.02]
  ];
  mats.forEach(([x, y, w, h, c, rot]) => {
    g.save();
    g.translate(510 + x, y);
    g.rotate(rot);
    rr(g, -w / 2, -h / 2, w, h, 8);
    fillStroke(g, c, INK, 2.2);
    line(g, -w / 2 + 7, 0, w / 2 - 7, 0, 'rgba(23,63,53,.15)', 1.2);
    g.restore();
  });
  // blocks
  g.save();
  g.translate(600, 680);
  g.rotate(0.12);
  rr(g, -12, -14, 24, 28, 4);
  fillStroke(g, '#ffc857', INK, 2);
  rr(g, -12, -5, 24, 2, 1);
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  g.stroke();
  g.restore();
  // foam roller
  g.save();
  g.translate(378, 716);
  g.rotate(-0.18);
  rr(g, -27, -8, 54, 16, 8);
  fillStroke(g, '#ff6b57', INK, 2.2);
  line(g, -16, -6, -16, 6, 'rgba(23,63,53,.3)', 1.5);
  line(g, 14, -6, 14, 6, 'rgba(23,63,53,.3)', 1.5);
  g.restore();
  // sign
  g.save();
  g.translate(380, 650);
  g.rotate(-0.05);
  rr(g, 0, 0, 58, 22, 5);
  fillStroke(g, '#fff2d7', INK, 1.8);
  g.fillStyle = TEAL;
  g.font = '900 8px Lato, sans-serif';
  g.textAlign = 'center';
  g.fillText('MOBILITY', 29, 14);
  g.restore();
  g.restore();
}

function drawSmoothieBar(g) {
  g.save();
  g.translate(322, 356);
  rr(g, 0, 0, 132, 114, 9);
  fillStroke(g, '#8bd6b8', INK, 3);
  rr(g, 9, 10, 114, 29, 5);
  fillStroke(g, '#fff2d7', INK, 2);
  g.fillStyle = INK;
  g.font = '900 10px Lato, sans-serif';
  g.textAlign = 'center';
  g.fillText('SMOOTHIES', 66, 29);
  // cups
  const colors = ['#ff6b57', '#ffc857', '#b9a7e8'];
  colors.forEach((c, i) => {
    g.save();
    g.translate(30 + i * 37, 63);
    g.beginPath();
    g.moveTo(-9, 0);
    g.lineTo(9, 0);
    g.lineTo(6, 28);
    g.lineTo(-6, 28);
    g.closePath();
    fillStroke(g, c, INK, 2);
    line(g, 0, 0, 0, -15, INK, 2.4);
    g.restore();
  });
  rr(g, 14, 99, 104, 7, 3);
  fillStroke(g, '#ffc857', INK, 1.7);
  g.restore();
}

function drawRecoveryNook(g) {
  g.save();
  g.translate(754, 362);
  rr(g, 0, 0, 84, 104, 9);
  fillStroke(g, '#d9f0df', INK, 3);
  g.fillStyle = TEAL;
  g.font = '900 9px Lato, sans-serif';
  g.textAlign = 'center';
  g.fillText('RECOVER', 42, 19);
  // shelf
  line(g, 10, 39, 74, 39, INK, 3);
  // rollers
  [0, 1, 2].forEach(i => {
    g.save();
    g.translate(20 + i * 22, 31);
    g.rotate(0.1);
    rr(g, -7, -9, 14, 18, 6);
    fillStroke(g, i === 1 ? '#ff6b57' : '#ffc857', INK, 1.8);
    g.restore();
  });
  // plant
  drawPlant(g, 42, 88, 0.5, '#ff6b57');
  g.restore();
}

function drawSoundSystem(g) {
  g.save();
  [368, 790].forEach((x, i) => {
    g.save();
    g.translate(x, 176);
    g.rotate(i ? 0.08 : -0.08);
    rr(g, -17, -28, 34, 56, 6);
    fillStroke(g, '#173f35', '#fff2d7', 2.2);
    dot(g, 0, -13, 7, '#5b6f69', '#fff2d7', 1.3);
    dot(g, 0, 13, 11, '#5b6f69', '#fff2d7', 1.3);
    dot(g, 0, -13, 2.5, '#ffc857');
    dot(g, 0, 13, 4, '#ffc857');
    g.restore();
  });
  g.fillStyle = 'rgba(255,248,233,.65)';
  g.font = '900 13px Lato, sans-serif';
  g.fillText('♪', 400, 145);
  g.fillText('♫', 754, 166);
  g.restore();
}

function drawExtraFloor(g) {
  g.save();
  // pennant
  g.save();
  g.translate(1040, 170);
  line(g, 0, 0, 0, 86, INK, 2);
  g.beginPath();
  g.moveTo(0, 5);
  g.lineTo(92, 21);
  g.lineTo(0, 42);
  g.closePath();
  fillStroke(g, '#ff6b57', INK, 2.2);
  g.fillStyle = '#fffaf0';
  g.font = '900 10px Lato, sans-serif';
  g.textAlign = 'center';
  g.fillText('NEW WING', 40, 26);
  g.restore();
  // plyo box
  rr(g, 850, 632, 44, 36, 4);
  fillStroke(g, '#b9a7e8', INK, 2.4);
  line(g, 850, 648, 894, 648, INK, 1.5);
  g.restore();
}

function drawWallDetails(g) {
  // clock
  g.save();
  g.translate(338, 122);
  dot(g, 0, 0, 24, '#fff2d7', INK, 3);
  dot(g, 0, 0, 18, '#f8e8c7', INK, 1.4);
  line(g, 0, 0, 0, -13, INK, 2.4);
  line(g, 0, 0, 9, 5, INK, 2.4);
  dot(g, 0, 0, 2.2, INK);
  g.restore();

  // towel cubbies
  g.save();
  g.translate(774, 96);
  rr(g, 0, 0, 58, 78, 6);
  fillStroke(g, '#f3e4c7', INK, 2.6);
  for (let i = 0; i < 3; i++) {
    rr(g, 7, 8 + i * 23, 44, 17, 3);
    fillStroke(g, i === 1 ? '#8bd6b8' : '#fffaf0', INK, 1.4);
  }
  g.restore();

  // water station
  g.save();
  g.translate(306, 380);
  rr(g, -13, -25, 26, 25, 5);
  fillStroke(g, '#7fc9c2', INK, 2);
  rr(g, -8, 0, 16, 31, 3);
  fillStroke(g, '#fff2d7', INK, 2);
  dot(g, 0, -13, 3, '#ffc857');
  g.restore();

  // string lights
  g.save();
  g.strokeStyle = 'rgba(23,63,53,.25)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(0, 30);
  g.quadraticCurveTo(295, 78, 590, 28);
  g.quadraticCurveTo(885, -22, 1180, 26);
  g.stroke();
  const bulbs = [70, 150, 230, 310, 400, 500, 600, 700, 790, 880, 970, 1060, 1140];
  bulbs.forEach((x, i) => {
    const t = x / 1180;
    const y = 30 + Math.sin(t * Math.PI) * 36 + (x > 590 ? -Math.sin((x - 590) / 590 * Math.PI) * 34 : 0);
    dot(g, x, y + 5, 3.2, i % 3 === 0 ? '#ffc857' : '#fff2d7', INK, 1);
  });
  g.restore();

  // framed certificate
  g.save();
  g.translate(846, 198);
  g.rotate(0.04);
  rr(g, 0, 0, 42, 52, 3);
  fillStroke(g, '#fffaf0', INK, 2);
  g.fillStyle = '#ffc857';
  g.fillRect(5, 6, 32, 12);
  g.fillStyle = '#173f35';
  g.font = '900 6px Lato, sans-serif';
  g.textAlign = 'center';
  g.fillText('CERTIFIED', 21, 14);
  for (let i = 0; i < 3; i++) line(g, 8, 27 + i * 7, 34, 27 + i * 7, 'rgba(23,63,53,.3)', 1.2);
  g.restore();
}

function drawGymBackground(g) {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';

  // wall
  const wall = g.createLinearGradient(0, 0, 0, 480);
  wall.addColorStop(0, '#f9e9c8');
  wall.addColorStop(0.62, '#f2ddb7');
  wall.addColorStop(1, '#ead1a7');
  g.fillStyle = wall;
  g.fillRect(0, 0, DESIGN_W, 480);

  // subtle wall dots
  g.fillStyle = 'rgba(23,63,53,.035)';
  for (let y = 20; y < 470; y += 26) {
    for (let x = 14; x < DESIGN_W; x += 26) {
      g.fillRect(x + ((y / 26) % 2) * 13, y, 1.5, 1.5);
    }
  }

  // panel seams
  for (let x = 0; x <= DESIGN_W; x += 148) {
    line(g, x, 0, x, 392, 'rgba(23,63,53,.055)', 1.2);
  }

  // wainscot
  rr(g, 0, 392, DESIGN_W, 92, 0);
  fillStroke(g, '#a9d8c2', INK, 3);
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.fillRect(0, 392, DESIGN_W, 7);
  for (let x = 18; x < DESIGN_W; x += 70) {
    line(g, x, 410, x, 472, 'rgba(23,63,53,.11)', 1.5);
  }
  line(g, 0, 392, DESIGN_W, 392, INK, 3);

  drawWindow(g, 52, 90, 278, 282);
  drawWindow(g, 850, 90, 278, 282);
  drawNeonSign(g);
  drawMirror(g);
  drawPoster(g, 350, 216, 55, 98, 'NO', 'EGO', '#ff6b57');
  drawPoster(g, 780, 216, 55, 98, 'LIFT', 'BIG', '#ffc857');
  drawWallDetails(g);
  drawSoundSystemIfOwned(g);

  drawFloor(g);
  drawSunbeams(g);
  drawDesk(g);
  drawDumbbellRack(g);
  drawSquatRack(g);
  drawTreadmill(g);
  drawYogaArea(g);
  drawSmoothieIfOwned(g);
  drawRecoveryIfOwned(g);
  drawExtraFloorIfOwned(g);

  // plants
  drawPlant(g, 26, 570, 1.05, '#ff6b57');
  drawPlant(g, 1152, 570, 1.0, '#ffc857');
  drawPlant(g, 330, 476, 0.55, '#8bd6b8');

  // floor scuffs
  g.strokeStyle = 'rgba(23,63,53,.08)';
  g.lineWidth = 1.4;
  [[610, 590, 640, 594], [720, 722, 752, 718], [430, 620, 458, 616], [1020, 610, 1050, 616]].forEach(([a, b, c, d]) => line(g, a, b, c, d, 'rgba(23,63,53,.08)', 1.4));

  // vignette
  const vig = g.createRadialGradient(590, 390, 210, 590, 390, 720);
  vig.addColorStop(0, 'rgba(23,63,53,0)');
  vig.addColorStop(1, 'rgba(15,45,38,.2)');
  g.fillStyle = vig;
  g.fillRect(0, 0, DESIGN_W, DESIGN_H);
  g.restore();
}

function drawSoundSystemIfOwned(g) { if (state.upgrades.sound) drawSoundSystem(g); }
function drawSmoothieIfOwned(g) { if (state.upgrades.smoothie) drawSmoothieBar(g); }
function drawRecoveryIfOwned(g) { if (state.upgrades.recovery) drawRecoveryNook(g); }
function drawExtraFloorIfOwned(g) { if (state.upgrades.floor) drawExtraFloor(g); }

/* ------------------------------------------------------------
   People
   ------------------------------------------------------------ */
function drawLimb(g, x, y, angle, length, width, fill, shoe = null) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  rr(g, -width / 2, 0, width, length, width / 2);
  fillStroke(g, fill, INK, 2.3);
  if (shoe) {
    g.save();
    g.translate(0, length - 2);
    rr(g, -width * 0.72, -2, width * 1.45, 9, 4);
    fillStroke(g, shoe, INK, 2);
    g.restore();
  }
  g.restore();
}

function drawArm(g, x, y, angle, length, width, fill) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  rr(g, -width / 2, 0, width, length, width / 2);
  fillStroke(g, fill, INK, 2.2);
  dot(g, 0, length, width * 0.48, fill, INK, 1.8);
  g.restore();
}

function drawHair(g, cfg, headY, bob) {
  const hair = cfg.hair || 'bun';
  const color = cfg.palette.hair;
  const y = headY + bob;
  g.save();
  if (hair === 'bun') {
    dot(g, 0, y - 22, 8.5, color, INK, 2.2);
    g.beginPath();
    g.ellipse(0, y - 6, 15, 13, 0, Math.PI, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.stroke();
    line(g, -9, y - 14, 9, y - 14, cfg.palette.accent, 3);
  } else if (hair === 'curly') {
    [[-12, y - 10, 7], [0, y - 16, 8], [12, y - 10, 7], [-15, y, 6], [15, y, 6], [-8, y + 8, 5], [8, y + 8, 5]].forEach(([hx, hy, r]) => dot(g, hx, hy, r, color, INK, 2));
  } else if (hair === 'bob') {
    g.beginPath();
    g.ellipse(0, y - 2, 17, 20, 0, Math.PI, Math.PI * 2);
    g.lineTo(17, y + 12);
    g.lineTo(11, y + 12);
    g.lineTo(11, y - 1);
    g.lineTo(-11, y - 1);
    g.lineTo(-11, y + 12);
    g.lineTo(-17, y + 12);
    g.closePath();
    fillStroke(g, color, INK, 2.2);
  } else if (hair === 'short') {
    g.beginPath();
    g.ellipse(0, y - 5, 15, 14, 0, Math.PI, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.stroke();
    line(g, -10, y - 6, 10, y - 6, 'rgba(255,255,255,.18)', 2);
  } else if (hair === 'pony') {
    dot(g, 17, y + 1, 8, color, INK, 2.2);
    g.beginPath();
    g.ellipse(0, y - 6, 15, 13, 0, Math.PI, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.stroke();
  } else if (hair === 'locs') {
    g.beginPath();
    g.ellipse(0, y - 5, 15, 14, 0, Math.PI, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.stroke();
    [-14, -8, 0, 8, 14].forEach((hx, i) => line(g, hx, y - 3, hx + (i % 2 ? 2 : -2), y + 13, color, 4.4));
  } else if (hair === 'cap') {
    g.beginPath();
    g.ellipse(0, y - 6, 15, 13, 0, Math.PI, Math.PI * 2);
    g.fillStyle = cfg.palette.shirt;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.stroke();
    rr(g, -17, y - 7, 35, 5, 2.5);
    fillStroke(g, cfg.palette.shirt, INK, 2);
    line(g, 0, y - 18, 0, y - 8, INK, 1.6);
  } else {
    g.beginPath();
    g.ellipse(0, y - 6, 15, 13, 0, Math.PI, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.stroke();
    g.beginPath();
    g.arc(-3, y - 8, 11, Math.PI * 1.1, Math.PI * 1.85);
    g.strokeStyle = 'rgba(255,255,255,.2)';
    g.lineWidth = 2;
    g.stroke();
  }
  g.restore();
}

function drawFace(g, cfg, headY, bob, isHero) {
  const y = headY + bob;
  // ears
  dot(g, -13.5, y + 2, 3.2, cfg.palette.skin, INK, 1.8);
  dot(g, 13.5, y + 2, 3.2, cfg.palette.skin, INK, 1.8);
  // brows
  g.strokeStyle = INK;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(-7, y - 3);
  g.quadraticCurveTo(-4.5, y - 5, -2, y - 3);
  g.moveTo(2, y - 3);
  g.quadraticCurveTo(4.5, y - 5, 7, y - 3);
  g.stroke();
  // eyes
  dot(g, -4.5, y + 1, 2.3, INK);
  dot(g, 4.5, y + 1, 2.3, INK);
  dot(g, -3.8, y + 0.3, 0.75, CREAM);
  dot(g, 5.2, y + 0.3, 0.75, CREAM);
  // nose
  line(g, 0, y + 3, 1.3, y + 5.2, 'rgba(23,63,53,.4)', 1.2);
  // smile
  g.beginPath();
  g.moveTo(-4, y + 8);
  g.quadraticCurveTo(0, y + 11.5, 4, y + 8);
  g.strokeStyle = INK;
  g.lineWidth = 1.8;
  g.stroke();
  // blush
  dot(g, -8.5, y + 7, 2.4, 'rgba(255,107,87,.32)');
  dot(g, 8.5, y + 7, 2.4, 'rgba(255,107,87,.32)');
  // accessory
  const acc = cfg.accessory || 'none';
  if (acc === 'glasses') {
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(-4.5, y + 1, 5.2, 0, Math.PI * 2);
    g.arc(4.5, y + 1, 5.2, 0, Math.PI * 2);
    g.moveTo(-9.7, y + 1);
    g.lineTo(-13, y);
    g.moveTo(9.7, y + 1);
    g.lineTo(13, y);
    g.moveTo(-0.7, y + 1);
    g.lineTo(0.7, y + 1);
    g.stroke();
  } else if (acc === 'headphones') {
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    g.beginPath();
    g.arc(0, y - 2, 16, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    rr(g, -20, y - 3, 6, 12, 3);
    fillStroke(g, cfg.palette.accent, INK, 1.7);
    rr(g, 14, y - 3, 6, 12, 3);
    fillStroke(g, cfg.palette.accent, INK, 1.7);
  } else if (acc === 'headband' || isHero) {
    g.beginPath();
    g.moveTo(-13, y - 7);
    g.quadraticCurveTo(0, y - 1, 13, y - 7);
    g.strokeStyle = cfg.palette.accent;
    g.lineWidth = 4.5;
    g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.stroke();
  } else if (acc === 'earring') {
    dot(g, 13.5, y + 7, 1.9, cfg.palette.accent, INK, 1.2);
  }
}

function drawPerson(g, cfg, x, y, scale, pose, time, facing = 1, isHero = false) {
  const p = cfg.palette;
  const seed = cfg.seed || 0;
  const phase = time * 0.0045 + seed * 5;
  let bob = Math.sin(phase * 2) * 0.9;
  let legA = 0.05;
  let legB = -0.05;
  let armA = 0.22;
  let armB = -0.22;
  let bar = false;

  if (pose === 'run') {
    const p2 = Math.sin(phase * 5.5);
    legA = p2 * 0.62;
    legB = -p2 * 0.62;
    armA = -p2 * 0.7;
    armB = p2 * 0.7;
    bob = Math.abs(Math.cos(phase * 5.5)) * -1.4;
  } else if (pose === 'lift') {
    legA = 0.13;
    legB = -0.13;
    armA = 2.65 + Math.sin(phase * 2.4) * 0.03;
    armB = 2.48 + Math.cos(phase * 2.4) * 0.03;
    bob = Math.sin(phase * 2.4) * 1.2;
    bar = true;
  } else if (pose === 'stretch') {
    legA = 0.17;
    legB = -0.1;
    armA = 2.55;
    armB = -0.45;
    bob = Math.sin(phase * 1.7) * 0.8;
  } else if (pose === 'coach') {
    armA = 0.35;
    armB = -0.42;
    bob = Math.sin(phase * 1.7) * 0.7;
  }

  g.save();
  g.translate(x, y);
  g.scale(facing * scale, scale);

  // shadow
  g.fillStyle = 'rgba(15,45,38,.17)';
  g.beginPath();
  g.ellipse(0, 0, 25, 6.5, 0, 0, Math.PI * 2);
  g.fill();

  // far arm + far leg
  drawArm(g, -14, -72 + bob, armA, 28, 8.5, p.skin);
  drawLimb(g, -6, -42 + bob, legA, 37, 10, p.pants, p.shoe);

  // torso
  g.save();
  g.translate(0, bob);
  rr(g, -17, -81, 34, 42, 12);
  fillStroke(g, p.shirt, INK, 2.6);
  // shirt collar / zip
  g.beginPath();
  g.moveTo(-8, -81);
  g.lineTo(0, -71);
  g.lineTo(8, -81);
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.stroke();
  line(g, 0, -71, 0, -41, 'rgba(23,63,53,.45)', 1.4);
  // accent stripe
  rr(g, -17, -52, 34, 6, 2);
  fillStroke(g, p.accent, INK, 1.2);
  // tiny badge
  dot(g, 8, -64, 3.2, p.accent, INK, 1.2);
  // hero lanyard
  if (isHero) {
    g.beginPath();
    g.moveTo(-7, -80);
    g.quadraticCurveTo(0, -60, 8, -77);
    g.strokeStyle = p.accent;
    g.lineWidth = 2.4;
    g.stroke();
    dot(g, 4, -55, 4, p.accent, INK, 1.4);
    dot(g, 4, -55, 1.5, INK);
  }
  g.restore();

  // near leg
  drawLimb(g, 7, -42 + bob, legB, 37, 10, p.pants, p.shoe);

  // near arm
  drawArm(g, 14, -72 + bob, armB, 28, 8.5, p.skin);

  // head
  const headY = -98 + bob;
  g.save();
  g.translate(0, headY);
  // neck
  rr(g, -5, 9, 10, 11, 4);
  fillStroke(g, p.skin, INK, 2);
  // hair behind
  if ((cfg.hair || 'bun') === 'bun') dot(g, 0, -16, 7.5, p.hair, INK, 2);
  if ((cfg.hair || 'bun') === 'pony') dot(g, 16, 1, 7, p.hair, INK, 2);
  // head
  g.beginPath();
  g.ellipse(0, 0, 13.2, 14.2, 0, 0, Math.PI * 2);
  g.fillStyle = p.skin;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2.3;
  g.stroke();
  drawHair(g, cfg, 0, 0);
  drawFace(g, cfg, 0, 0, isHero);
  // hero star clip
  if (isHero) {
    g.save();
    g.translate(-11, -11);
    g.rotate(-0.35);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 2.3 : 5.4;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    fillStroke(g, SUN, INK, 1.2);
    g.restore();
  }
  g.restore();

  // barbell for lift pose
  if (bar) {
    const by = -128 + bob;
    line(g, -27, by, 27, by, INK, 3.4);
    [-27, 27].forEach((bx, i) => {
      dot(g, bx, by, 9, i ? SUN : CORAL, INK, 2);
      dot(g, bx, by, 4, 'rgba(23,63,53,.25)');
    });
    // hands wrap bar
    dot(g, -21, by + 1, 4.2, p.skin, INK, 1.8);
    dot(g, 21, by + 1, 4.2, p.skin, INK, 1.8);
  }

  // run motion lines
  if (pose === 'run') {
    g.strokeStyle = 'rgba(23,63,53,.18)';
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const yy = -70 + i * 12 + Math.sin(phase * 5.5 + i) * 3;
      line(g, -28 - i * 4, yy, -20 - i * 4, yy, 'rgba(23,63,53,.16)', 1.7);
    }
  }

  g.restore();
}

function drawCoachNpc(g, time) {
  drawPerson(g, {
    palette: { skin: '#6e3f2a', hair: '#17110f', shirt: '#ffc857', pants: '#315a70', shoe: '#fffaf0', accent: '#ff6b57' },
    hair: 'short',
    accessory: 'whistle',
    seed: 2.7
  }, 348, 690, 0.9, 'coach', time, 1, false);
}

function drawCleanerNpc(g, time) {
  drawPerson(g, {
    palette: { skin: '#d98e69', hair: '#2b1b18', shirt: '#b9a7e8', pants: '#3c6c63', shoe: '#fffaf0', accent: '#ffc857' },
    hair: 'bob',
    accessory: 'glasses',
    seed: 5.2
  }, 118, 716, 0.82, 'idle', time, 1, false);
  // broom
  g.save();
  g.translate(142, 650);
  g.rotate(0.1);
  line(g, 0, 0, 0, 78, '#9a6b3f', 3);
  g.beginPath();
  g.moveTo(-8, 76);
  g.lineTo(8, 76);
  g.lineTo(14, 96);
  g.lineTo(-14, 96);
  g.closePath();
  fillStroke(g, '#ffc857', INK, 2);
  g.restore();
}
