// Utility for optimistic UI updates: parses and simulates 'cut' commands on the timeline clips array

/**
 * Parse a time string (e.g., '00:05', '1:23') into seconds.
 * @param {string} timeStr
 * @returns {number}
 */
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/**
 * Simulate a 'cut' command on the clips array.
 * Supports commands like 'cut first clip at 00:05', 'cut last clip at 00:10', 'cut clip 2 at 00:15'.
 *
 * @param {string} command - The NLP command string.
 * @param {Array} clips - The current array of clips (each with id, start, end, etc.).
 * @returns {Array} - The new clips array with the cut applied, or the original if parsing fails.
 */
export function simulateCutCommand(command: string, clips: any[]): any[] {
  // Regex: cut (first|last|clip N) clip at TIME
  const cutRegex = /cut\s+(first|last|clip\s*\d+)?\s*clip?\s*at\s*([\d:]+)/i;
  const match = command.match(cutRegex);
  if (!match) return clips;

  let targetIdx = 0;
  const target = match[1]?.trim().toLowerCase();
  if (target === "last") {
    targetIdx = clips.length - 1;
  } else if (target && target.startsWith("clip")) {
    const n = parseInt(target.replace("clip", "").trim(), 10);
    if (!isNaN(n) && n > 0 && n <= clips.length) {
      targetIdx = n - 1;
    }
  } // else default to first

  const timeStr = match[2];
  const cutTime = parseTimeToSeconds(timeStr);
  const targetClip = clips[targetIdx];
  if (!targetClip) return clips;

  // Only cut if cutTime is within the clip
  if (cutTime <= targetClip.start || cutTime >= targetClip.end) return clips;

  // Create two new clips split at cutTime
  const newClip1 = {
    ...targetClip,
    id: `${targetClip.id}_part1_${Date.now()}`,
    end: cutTime,
  };
  const newClip2 = {
    ...targetClip,
    id: `${targetClip.id}_part2_${Date.now()}`,
    start: cutTime,
  };

  // Replace the target clip with the two new clips
  const newClips = [
    ...clips.slice(0, targetIdx),
    newClip1,
    newClip2,
    ...clips.slice(targetIdx + 1),
  ];
  return newClips;
} 