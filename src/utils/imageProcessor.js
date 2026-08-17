/**
 * imageProcessor.js
 * Utility engine untuk pemrosesan citra kanvas berbasis JS (Chroma Key, Magic Wand, Brush, Defringe, Smoothing, Shape & Text Boolean Operations)
 */

// Menghitung jarak Euclidean antar dua warna RGB (0 - 100%)
export function getColorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (Math.sqrt(dr * dr + dg * dg + db * db) / 441.6729559300637) * 100;
}

/**
 * Chroma Keying / Color Thresholding dengan pembersihan Halo Tepi (Edge Defringing)
 */
export function removeByColorKey(imageData, targetColor, tolerance = 20, feather = 10, autoDefringe = true) {
  const data = imageData.data;
  const length = data.length;
  const { r: tr, g: tg, b: tb } = targetColor;

  const minDist = Math.max(0, tolerance - feather);
  const maxDist = tolerance + feather;
  const range = maxDist - minDist || 1;

  for (let i = 0; i < length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const currentAlpha = data[i + 3];

    if (currentAlpha === 0) continue;

    const dist = getColorDistance(r, g, b, tr, tg, tb);

    if (dist <= minDist) {
      // Hapus total piksel latar
      data[i + 3] = 0;
    } else if (dist < maxDist) {
      // Feathering (transisi mulus di tepi)
      const factor = (dist - minDist) / range;
      data[i + 3] = Math.min(currentAlpha, Math.round(currentAlpha * Math.pow(factor, 1.5)));
    }
  }

  if (autoDefringe) {
    defringeEdges(imageData, 1);
  }

  return imageData;
}

/**
 * Magic Wand (Flood Fill Segmentation) dengan Edge Defringing
 */
export function removeByMagicWand(imageData, startX, startY, tolerance = 25, autoDefringe = true) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  const startIndex = (startY * width + startX) * 4;
  const sr = data[startIndex];
  const sg = data[startIndex + 1];
  const sb = data[startIndex + 2];
  const sa = data[startIndex + 3];

  if (sa === 0) return imageData; // Sudah transparan

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height * 2);
  let qHead = 0;
  let qTail = 0;

  queue[qTail++] = startX;
  queue[qTail++] = startY;
  visited[startY * width + startX] = 1;

  const dx = [1, -1, 0, 0];
  const dy = [0, 0, 1, -1];

  while (qHead < qTail) {
    const cx = queue[qHead++];
    const cy = queue[qHead++];
    const idx = (cy * width + cx) * 4;

    // Set transparansi
    data[idx + 3] = 0;

    for (let d = 0; d < 4; d++) {
      const nx = cx + dx[d];
      const ny = cy + dy[d];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos]) {
          visited[nPos] = 1;
          const nIdx = nPos * 4;
          const nr = data[nIdx];
          const ng = data[nIdx + 1];
          const nb = data[nIdx + 2];
          const na = data[nIdx + 3];

          if (na > 0) {
            const dist = getColorDistance(sr, sg, sb, nr, ng, nb);
            if (dist <= tolerance) {
              queue[qTail++] = nx;
              queue[qTail++] = ny;
            }
          }
        }
      }
    }
  }

  if (autoDefringe) {
    defringeEdges(imageData, 1);
  }

  return imageData;
}

/**
 * Defringe / Edge Choke (Merapikan Tepi Halo / Sisa Garis Putih/Hitam)
 */
export function defringeEdges(imageData, chokeAmount = 1) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  for (let step = 0; step < chokeAmount; step++) {
    const copy = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const alpha = copy[idx + 3];

        if (alpha > 0) {
          let transparentNeighbors = 0;
          let solidNeighborIdx = -1;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              const nAlpha = copy[nIdx + 3];

              if (nAlpha === 0) {
                transparentNeighbors++;
              } else if (nAlpha > 200 && solidNeighborIdx === -1) {
                solidNeighborIdx = nIdx;
              }
            }
          }

          if (transparentNeighbors >= 2) {
            if (alpha < 230) {
              data[idx + 3] = 0;
            } else if (solidNeighborIdx !== -1) {
              data[idx] = copy[solidNeighborIdx];
              data[idx + 1] = copy[solidNeighborIdx + 1];
              data[idx + 2] = copy[solidNeighborIdx + 2];
              data[idx + 3] = Math.round(alpha * 0.85);
            }
          }
        }
      }
    }
  }

  return imageData;
}

/**
 * Manual Precision Eraser / Restore Brush
 */
export function applyBrush(targetImageData, originalImageData, centerX, centerY, radius, hardness = 80, mode = 'erase') {
  const width = targetImageData.width;
  const height = targetImageData.height;
  const targetData = targetImageData.data;
  const origData = originalImageData.data;

  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));

  const hardRadius = radius * (hardness / 100);
  const hardR2 = hardRadius * hardRadius;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= r2) {
        const idx = (y * width + x) * 4;
        let factor = 1;

        if (distSq > hardR2) {
          const dist = Math.sqrt(distSq);
          factor = 1 - (dist - hardRadius) / (radius - hardRadius);
          factor = Math.max(0, Math.min(1, factor));
        }

        if (mode === 'erase') {
          targetData[idx + 3] = Math.round(targetData[idx + 3] * (1 - factor));
        } else if (mode === 'restore') {
          targetData[idx] = origData[idx];
          targetData[idx + 1] = origData[idx + 1];
          targetData[idx + 2] = origData[idx + 2];
          const targetA = targetData[idx + 3];
          const origA = origData[idx + 3];
          targetData[idx + 3] = Math.round(targetA + (origA - targetA) * factor);
        }
      }
    }
  }

  return targetImageData;
}

/**
 * Menggambar Path Geometris (Bentuk) dengan skala independen Width & Height
 */
export function drawShapePath(ctx, shapeType, width, height, cornerRadius = 0) {
  ctx.beginPath();
  const w2 = width / 2;
  const h2 = height / 2;

  switch (shapeType) {
    case 'rect':
      ctx.rect(-w2, -h2, width, height);
      break;

    case 'rounded_rect': {
      const radius = Math.min(cornerRadius || 20, Math.abs(w2), Math.abs(h2));
      if (ctx.roundRect) {
        ctx.roundRect(-w2, -h2, width, height, radius);
      } else {
        ctx.moveTo(-w2 + radius, -h2);
        ctx.lineTo(w2 - radius, -h2);
        ctx.quadraticCurveTo(w2, -h2, w2, -h2 + radius);
        ctx.lineTo(w2, h2 - radius);
        ctx.quadraticCurveTo(w2, h2, w2 - radius, h2);
        ctx.lineTo(-w2 + radius, h2);
        ctx.quadraticCurveTo(-w2, h2, -w2, h2 - radius);
        ctx.lineTo(-w2, -h2 + radius);
        ctx.quadraticCurveTo(-w2, -h2, -w2 + radius, -h2);
      }
      break;
    }

    case 'circle':
    case 'ellipse':
      ctx.ellipse(0, 0, Math.abs(w2), Math.abs(h2), 0, 0, Math.PI * 2);
      break;

    case 'star': {
      const points = 5;
      const step = Math.PI / points;
      let rot = (Math.PI / 2) * 3;

      ctx.moveTo(0, -h2);
      for (let i = 0; i < points; i++) {
        let x = Math.cos(rot) * w2;
        let y = Math.sin(rot) * h2;
        ctx.lineTo(x, y);
        rot += step;

        x = Math.cos(rot) * (w2 * 0.45);
        y = Math.sin(rot) * (h2 * 0.45);
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.closePath();
      break;
    }

    case 'heart': {
      const scaleX = w2 / 100;
      const scaleY = h2 / 100;
      ctx.moveTo(0, 35 * scaleY);
      ctx.bezierCurveTo(-75 * scaleX, -40 * scaleY, -100 * scaleX, -90 * scaleY, -45 * scaleX, -95 * scaleY);
      ctx.bezierCurveTo(0, -95 * scaleY, 0, -60 * scaleY, 0, -45 * scaleY);
      ctx.bezierCurveTo(0, -60 * scaleY, 0, -95 * scaleY, 45 * scaleX, -95 * scaleY);
      ctx.bezierCurveTo(100 * scaleX, -90 * scaleY, 75 * scaleX, -40 * scaleY, 0, 35 * scaleY);
      ctx.closePath();
      break;
    }

    case 'triangle':
      ctx.moveTo(0, -h2);
      ctx.lineTo(w2, h2);
      ctx.lineTo(-w2, h2);
      ctx.closePath();
      break;

    case 'hexagon': {
      const sides = 6;
      ctx.moveTo(w2, 0);
      for (let i = 1; i <= sides; i++) {
        const angle = (i * 2 * Math.PI) / sides;
        ctx.lineTo(w2 * Math.cos(angle), h2 * Math.sin(angle));
      }
      ctx.closePath();
      break;
    }

    case 'diamond':
      ctx.moveTo(0, -h2);
      ctx.lineTo(w2, 0);
      ctx.lineTo(0, h2);
      ctx.lineTo(-w2, 0);
      ctx.closePath();
      break;

    default:
      ctx.rect(-w2, -h2, width, height);
      break;
  }
}

/**
 * Memecah teks menjadi baris-baris sesuai batas lebar maksimum (Word Wrap Engine)
 */
export function getWrappedTextLines(ctx, text, maxWidth, wrapText = true) {
  const paragraphs = String(text || '').split('\n');
  if (!wrapText || maxWidth <= 0) {
    return paragraphs;
  }

  const allLines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push('');
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx ? ctx.measureText(testLine).width : testLine.length * 12;

      if (testWidth <= maxWidth || !currentLine) {
        currentLine = testLine;
      } else {
        allLines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines.length > 0 ? allLines : [''];
}

/**
 * Menggambar Teks Kustom pada Context dengan Text Wrapping, Alignment, dan Box Bounding
 */
export function drawTextSilhouette(ctx, options = {}) {
  const {
    text = 'STUDIO',
    fontSize = 72,
    fontFamily = 'Impact, sans-serif',
    fontWeight = 'bold',
    fontStyle = 'normal',
    width = 300,
    wrapText = true,
    textAlign = 'center',
    lineHeight = 1.2
  } = typeof options === 'string' ? { text: options } : options;

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';

  const lines = getWrappedTextLines(ctx, text, width, wrapText);
  const lineSpacing = fontSize * (lineHeight || 1.2);
  const totalTextHeight = lines.length * lineSpacing;
  const startY = -(totalTextHeight / 2) + lineSpacing / 2;

  let xPos = 0;
  if (textAlign === 'left') {
    xPos = -width / 2;
  } else if (textAlign === 'right') {
    xPos = width / 2;
  }

  lines.forEach((line, idx) => {
    ctx.fillText(line, xPos, startY + idx * lineSpacing);
  });
}

/**
 * Menerapkan Operasi Boolean (Intersection atau Subtract) pada Canvas
 */
export function applyShapeTextOperation(workingCanvas, options) {
  if (!workingCanvas) return;
  const {
    operation = 'intersect',
    maskType = 'shape',
    shapeType = 'circle',
    x = workingCanvas.width / 2,
    y = workingCanvas.height / 2,
    width = 300,
    height = 300,
    rotation = 0,
    feather = 0,
    cornerRadius = 20,
    text = 'STUDIO',
    fontSize = 120,
    fontFamily = 'Impact, sans-serif',
    fontWeight = '900',
    fontStyle = 'normal',
    wrapText = true,
    textAlign = 'center',
    lineHeight = 1.2
  } = options;

  const w = workingCanvas.width;
  const h = workingCanvas.height;

  // 1. Buat Mask Canvas terpisah
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const mCtx = maskCanvas.getContext('2d');

  mCtx.save();
  mCtx.translate(x, y);
  mCtx.rotate((rotation * Math.PI) / 180);

  if (feather > 0) {
    mCtx.filter = `blur(${feather}px)`;
  }

  mCtx.fillStyle = '#000000';

  if (maskType === 'shape') {
    drawShapePath(mCtx, shapeType, width, height, cornerRadius);
    mCtx.fill();
  } else {
    drawTextSilhouette(mCtx, {
      text,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      width,
      height,
      wrapText,
      textAlign,
      lineHeight
    });
  }
  mCtx.restore();

  // 2. Buat Buffer Hasil Komposisi
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tCtx = tempCanvas.getContext('2d');

  // Gambar citra saat ini ke temp
  tCtx.drawImage(workingCanvas, 0, 0);

  // Lakukan Boolean Composition
  if (operation === 'intersect') {
    tCtx.globalCompositeOperation = 'destination-in';
    tCtx.drawImage(maskCanvas, 0, 0);
  } else if (operation === 'subtract') {
    tCtx.globalCompositeOperation = 'destination-out';
    tCtx.drawImage(maskCanvas, 0, 0);
  }

  // 3. Salin kembali hasil ke workingCanvas
  const ctx = workingCanvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tempCanvas, 0, 0);
}

/**
 * Sample RGB Color dari koordinat kanvas
 */
export function sampleColorFromCanvas(ctx, x, y) {
  const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  return {
    r: pixel[0],
    g: pixel[1],
    b: pixel[2],
    hex: rgbToHex(pixel[0], pixel[1], pixel[2])
  };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}
