
/**
 * Formats a time in seconds to a mm:ss.cc format
 * @param time Time in seconds
 * @returns Formatted time string
 */
export function formatTimecode(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const centiseconds = Math.floor((time % 1) * 100);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}
