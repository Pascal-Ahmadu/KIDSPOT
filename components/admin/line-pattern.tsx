/**
 * Decorative "Line pattern" from the login design: a 298×408 grid of short white strokes whose angle
 * sweeps gradually across the block, giving a soft swirl. Pure SVG, no image file.
 */
export function LinePattern({ className }: { className?: string }) {
  const cols = 11;
  const rows = 19;
  const lines: { x: number; y: number; a: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Angle sweeps with column and row, like the Figma's -140° … -10° fan.
      const a = -140 + c * 10 + r * 10;
      lines.push({ x: 12 + c * 27.5, y: 4 + r * 21.8, a });
    }
  }
  return (
    <svg viewBox="0 0 298 408" className={className} aria-hidden="true">
      {lines.map(({ x, y, a }, i) => (
        <line key={i} x1={x - 6} y1={y} x2={x + 6} y2={y} stroke="#fff" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} ${x} ${y})`} />
      ))}
    </svg>
  );
}
