/**
 * Cross-checks the drywall joint-tape allowance against the seam length a room
 * actually has. Run: npx tsx scripts/audit-drywall-tape.mts
 */

function seamFeet(length: number, width: number, height: number, sheetWidth = 4) {
  const perimeter = 2 * (length + width);

  // 4 ft sheets hung horizontally on an 8 ft wall: one horizontal seam per run.
  const horizontalWallSeams = height > sheetWidth ? perimeter : 0;
  // Vertical butt joints roughly every 8 ft of wall run.
  const verticalButtJoints = Math.max(0, Math.floor(perimeter / 8)) * Math.min(height, 8);
  // Inside corners, wall-to-wall.
  const insideCorners = 4 * height;
  // Wall-to-ceiling angle all the way round.
  const ceilingAngle = perimeter;
  // Seams across the ceiling itself.
  const ceilingSeams = Math.max(0, Math.floor(Math.min(length, width) / sheetWidth)) * Math.max(length, width);

  return horizontalWallSeams + verticalButtJoints + insideCorners + ceilingAngle + ceilingSeams;
}

const rooms: [number, number, number][] = [
  [14, 12, 8],
  [12, 12, 8],
  [20, 16, 9],
  [10, 8, 8],
  [24, 20, 10],
];

console.log("room          sqft  sheets   seam ft   current(40/sheet)   at 12/sheet   ft per sheet");
for (const [l, w, h] of rooms) {
  const wall = 2 * (l + w) * h;
  const ceiling = l * w;
  const total = wall + ceiling;
  const sheets = Math.ceil((total * 1.1) / 32);
  const seams = seamFeet(l, w, h);
  console.log(
    `${`${l}x${w}x${h}`.padEnd(12)} ${String(Math.round(total)).padStart(5)} ${String(sheets).padStart(6)} ${String(Math.round(seams)).padStart(9)} ${String(sheets * 40).padStart(19)} ${String(sheets * 12).padStart(13)} ${(seams / sheets).toFixed(1).padStart(14)}`,
  );
}

// Published trade figure: roughly 380 linear ft of tape per 1,000 sq ft of board.
console.log("\ncross-check against ~380 ft per 1,000 sq ft of drywall:");
for (const [l, w, h] of rooms) {
  const total = 2 * (l + w) * h + l * w;
  console.log(`  ${`${l}x${w}x${h}`.padEnd(12)} ${Math.round((total / 1000) * 380)} ft`);
}
