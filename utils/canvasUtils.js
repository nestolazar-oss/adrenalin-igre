const { createCanvas, loadImage } = require('canvas');

/**
 * Create a canvas that scales content to avoid clipping on mobile devices.
 * Strategy: use a higher internal resolution and scale context so that when
 * image is displayed on small screens text doesn't wrap incorrectly.
 */
function createResponsiveCanvas(width, height, scale = 2) {
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  // store original size for convenience
  canvas._displayWidth = width;
  canvas._displayHeight = height;
  return { canvas, ctx };
}

/**
 * Helper to draw wrapped text with max width consideration (works with scaled canvas)
 */
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
  return y;
}

module.exports = { createResponsiveCanvas, drawWrappedText, loadImage };