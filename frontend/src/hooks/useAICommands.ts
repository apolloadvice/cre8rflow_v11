import { useCommand, Operation } from "@/hooks/useCommand";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore } from "@/store/editorStore";
import { useVideoHandler } from "@/hooks/useVideoHandler";

// Utility function to check if two clips overlap
const clipsOverlap = (clip1: { start: number; end: number }, clip2: { start: number; end: number }) => {
  return clip1.start < clip2.end && clip1.end > clip2.start;
};

// Utility function to find the next available position on a track
const findNextAvailablePosition = (clips: any[], track: number, startTime: number, clipDuration: number) => {
  // Get all clips on the same track, sorted by start time
  const trackClips = clips
    .filter(clip => clip.track === track)
    .sort((a, b) => a.start - b.start);
  
  // Try the originally requested position first
  let proposedClip = {
    start: startTime,
    end: startTime + clipDuration
  };
  
  // Check if this position overlaps with any existing clip
  let hasOverlap = trackClips.some(existingClip => clipsOverlap(proposedClip, existingClip));
  
  if (!hasOverlap) {
    return startTime; // Original position is fine
  }
  
  // If there's an overlap, try to find the next available gap
  for (let i = 0; i < trackClips.length; i++) {
    const currentClip = trackClips[i];
    const nextClip = trackClips[i + 1];
    
    // Try placing after the current clip
    const candidateStart = currentClip.end;
    const candidateEnd = candidateStart + clipDuration;
    
    // Check if this fits before the next clip (or if there's no next clip)
    if (!nextClip || candidateEnd <= nextClip.start) {
      return candidateStart;
    }
  }
  
  // If no gap found, place at the end of the last clip
  if (trackClips.length > 0) {
    return trackClips[trackClips.length - 1].end;
  }
  
  // Fallback to original position (shouldn't happen)
  return startTime;
};

// Utility function to find the best track for a new clip following specific rules
const findBestTrack = (clips: any[], clipType: string, startTime: number, clipDuration: number) => {
  const endTime = startTime + clipDuration;
  
  console.log("🎬 [Track Assignment] Finding track for:", { clipType, startTime, endTime });
  console.log("🎬 [Track Assignment] Existing clips:", clips);
  
  // Rule: Videos always go on track 0
  if (clipType === 'video') {
    console.log("🎬 [Track Assignment] Video clip -> Track 0");
    return { track: 0, startTime };
  }
  
  // Get all non-video clips grouped by track
  const nonVideoClips = clips.filter(clip => clip.type !== 'video');
  console.log("🎬 [Track Assignment] Non-video clips:", nonVideoClips);
  
  if (nonVideoClips.length === 0) {
    // No non-video clips exist, start with track 1
    console.log("🎬 [Track Assignment] No existing non-video clips -> Track 1");
    return { track: 1, startTime };
  }
  
  // Function to check if two time ranges overlap
  const overlaps = (start1: number, end1: number, start2: number, end2: number) => {
    return start1 < end2 && end1 > start2;
  };
  
  // Rule 1: Check for time overlap with any existing element
  const hasOverlap = nonVideoClips.some(clip => 
    overlaps(startTime, endTime, clip.start, clip.end)
  );
  
  if (hasOverlap) {
    // Rule 1: If overlap exists, create new track below all existing tracks
    const maxTrack = Math.max(...nonVideoClips.map(clip => clip.track));
    const newTrack = maxTrack + 1;
    console.log("🎬 [Track Assignment] Time overlap detected -> New track", newTrack);
    return { track: newTrack, startTime };
  }
  
  // Rule 2: Check if this is a different element type
  const existingTypes = [...new Set(nonVideoClips.map(clip => clip.type))];
  console.log("🎬 [Track Assignment] Existing types:", existingTypes);
  
  if (!existingTypes.includes(clipType)) {
    // Rule 2: Different element type -> new track below most recent track
    const maxTrack = Math.max(...nonVideoClips.map(clip => clip.track));
    const newTrack = maxTrack + 1;
    console.log("🎬 [Track Assignment] Different element type -> New track", newTrack);
    return { track: newTrack, startTime };
  }
  
  // Rule 3: Same type, no overlap -> try to use existing track of same type
  const sameTypeClips = nonVideoClips.filter(clip => clip.type === clipType);
  console.log("🎬 [Track Assignment] Same type clips:", sameTypeClips);
  
  // Group same type clips by track
  const trackGroups: { [track: number]: any[] } = {};
  sameTypeClips.forEach(clip => {
    if (!trackGroups[clip.track]) {
      trackGroups[clip.track] = [];
    }
    trackGroups[clip.track].push(clip);
  });
  
  // Check each track of the same type for available space
  for (const track of Object.keys(trackGroups).map(Number).sort()) {
    const trackClips = trackGroups[track];
    const hasTrackOverlap = trackClips.some(clip => 
      overlaps(startTime, endTime, clip.start, clip.end)
    );
    
    if (!hasTrackOverlap) {
      console.log("🎬 [Track Assignment] Same type, no overlap -> Existing track", track);
      return { track, startTime };
    }
  }
  
  // If no existing track of same type works, create new track
  const maxTrack = Math.max(...nonVideoClips.map(clip => clip.track));
  const newTrack = maxTrack + 1;
  console.log("🎬 [Track Assignment] Same type but all tracks have overlap -> New track", newTrack);
  return { track: newTrack, startTime };
};

// Utility function to convert backend timeline format to frontend clips
const convertTimelineToClips = (timeline: any) => {
  console.log("🎬 [Convert Timeline] Input timeline:", timeline);
  const clips: any[] = [];
  
  if (!timeline || !timeline.tracks) {
    console.log("🎬 [Convert Timeline] No tracks found in timeline");
    return clips;
  }
  
  const frameRate = timeline.frame_rate || 30;
  console.log("🎬 [Convert Timeline] Frame rate:", frameRate);
  
  // First pass: collect all clips from backend timeline
  const backendClips: any[] = [];
  
  timeline.tracks.forEach((track: any, trackIndex: number) => {
    console.log("🎬 [Convert Timeline] Processing track:", track);
    
    if (!track.clips || !Array.isArray(track.clips)) {
      console.log("🎬 [Convert Timeline] Track has no clips:", track);
      return;
    }
    
    track.clips.forEach((clip: any) => {
      console.log("🎬 [Convert Timeline] Processing clip:", clip);
      
      const frontendClip: any = {
        id: clip.clip_id || clip.id || `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        start: typeof clip.start === 'number' ? clip.start / frameRate : 0,
        end: typeof clip.end === 'number' ? clip.end / frameRate : 0,
        originalTrack: trackIndex, // Keep original track for reference
        type: clip.type || track.track_type || 'video',
        name: clip.name || 'Unnamed Clip',
        file_path: clip.file_path,
      };
      
      // Add text-specific properties and fix display names
      if (clip.type === 'text' || clip.text) {
        frontendClip.text = clip.text;
        frontendClip.type = 'text';
        frontendClip.name = clip.text || 'Text';  // Show actual text content
      } else if (clip.type === 'overlay' || frontendClip.name.startsWith('Overlay:')) {
        frontendClip.type = 'overlay';
        // Simplify overlay names - remove "Overlay:" prefix if present
        if (frontendClip.name.startsWith('Overlay: ')) {
          frontendClip.name = frontendClip.name.replace('Overlay: ', '');
        }
      }
      
      backendClips.push(frontendClip);
    });
  });
  
  console.log("🎬 [Convert Timeline] Backend clips collected:", backendClips);
  
  // Second pass: re-assign tracks following our rules
  const finalClips: any[] = [];
  
  // Sort clips by start time to process them in chronological order
  const sortedClips = backendClips.sort((a, b) => a.start - b.start);
  
  for (const clip of sortedClips) {
    const clipDuration = clip.end - clip.start;
    
    // Use our track assignment logic
    const { track, startTime } = findBestTrack(finalClips, clip.type, clip.start, clipDuration);
    
    const finalClip = {
      ...clip,
      track: track,
      start: startTime, // Use the calculated start time (though it should be the same)
    };
    
    // Remove the originalTrack property as it's no longer needed
    delete finalClip.originalTrack;
    
    finalClips.push(finalClip);
    console.log("🎬 [Convert Timeline] Assigned clip to track:", finalClip);
  }
  
  console.log("🎬 [Convert Timeline] Final clips with reassigned tracks:", finalClips);
  return finalClips;
};

export const useAICommands = () => {
  const { toast } = useToast();
  const { executeCommand } = useCommand();
  const { 
    activeVideoAsset, 
    clips, 
    selectedClipId, 
    setClips, 
    setSelectedClipId,
    setVideoSrc, 
    setDuration 
  } = useEditorStore();
  const { handleVideoProcessed } = useVideoHandler();

  const handleChatCommand = async (command: string) => {
    if (!activeVideoAsset && clips.length === 0) {
      toast({
        title: "No video available",
        description: "Please add a video to the timeline first",
        variant: "destructive",
      });
      return;
    }
    
    console.log("🎬 [AI Commands] Processing command:", command);
    console.log("🎬 [AI Commands] Current clips before command:", clips);
    console.log("🎬 [AI Commands] Clips count before:", clips.length);
    
    // Store initial clip count to detect if optimistic edit was applied
    const initialClipCount = clips.length;
    
    // Use our command hook to process the NLP request
    try {
      console.log("🎬 [AI Commands] Calling executeCommand...");
      const result = await executeCommand(command);
      
      console.log("🎬 [AI Commands] Backend result:", result);
      console.log("🎬 [AI Commands] Current clips after executeCommand:", useEditorStore.getState().clips);
      
      if (result) {
        console.log("🎬 [AI Commands] Result has operations:", !!result.operations);
        console.log("🎬 [AI Commands] Result has videoUrl:", !!result.videoUrl);
        console.log("🎬 [AI Commands] Operations array:", result.operations);
        console.log("🎬 [AI Commands] VideoUrl value:", result.videoUrl);
        
        // Get fresh state to check if optimistic edit was applied
        const currentClips = useEditorStore.getState().clips;
        const optimisticEditApplied = currentClips.length > initialClipCount;
        console.log("🎬 [AI Commands] Optimistic edit detected:", optimisticEditApplied);
        
        // Handle backend response with timeline data
        if (result.timeline) {
          console.log("🎬 [AI Commands] Using timeline response path:", result.timeline);
          
          // Convert backend timeline to frontend clips
          const timelineClips = convertTimelineToClips(result.timeline);
          console.log("🎬 [AI Commands] Converted timeline clips:", timelineClips);
          
          // Always use the backend timeline as the authoritative source
          // This replaces both the original clips and any optimistic edits
          console.log("🎬 [AI Commands] Replacing timeline with backend result");
          setClips(timelineClips);
          
          toast({
            title: "Edit applied",
            description: result.message || "Timeline updated successfully",
          });
          
          return result;
        }
        // Prioritize operations over processed video for timeline-based editing
        else if (result.operations && result.operations.length > 0) {
          console.log("🎬 [AI Commands] Using operations path:", result.operations);
          
          // If optimistic edit was applied, we should avoid duplicate operations
          if (optimisticEditApplied) {
            console.log("🎬 [AI Commands] Optimistic edit detected - skipping duplicate operations");
            toast({
              title: "Edit applied",
              description: "Timeline updated successfully",
            });
          } else {
            applyOperationsToTimeline(result.operations);
            toast({
              title: "Edits applied to timeline",
              description: `${result.operations.length} operations added to timeline`,
            });
          }
          
          // Don't process videoUrl if we successfully processed operations
          return result;
        }
        // Only use processed video if no operations are available
        else if (result.videoUrl) {
          console.log("🎬 [AI Commands] Using processed video path:", result.videoUrl);
          console.log("🎬 [AI Commands] Current clips before handleVideoProcessed:", currentClips);
          
          // Update the video source with the new processed video
          handleVideoProcessed(result.videoUrl);
          
          toast({
            title: "Video processed",
            description: "Your edited video is now ready to view",
          });
          
          return result;
        }
        // If backend doesn't return operations, create them locally for simple commands
        else {
          console.log("🎬 [AI Commands] Using inference path");
          
          // If optimistic edit was applied, we don't need to infer
          if (optimisticEditApplied) {
            console.log("🎬 [AI Commands] Optimistic edit already applied - skipping inference");
            toast({
              title: "Edit applied",
              description: "Timeline updated successfully",
            });
          } else {
            // Try to infer the operation from the command for timeline visualization
            const inferredOperations = inferOperationsFromCommand(command);
            if (inferredOperations.length > 0) {
              console.log("🎬 [AI Commands] Inferred operations:", inferredOperations);
              applyOperationsToTimeline(inferredOperations);
              
              toast({
                title: "Edit visualized on timeline",
                description: `Added ${inferredOperations.length} operations to timeline`,
              });
            } else {
              console.log("🎬 [AI Commands] No operations could be inferred from command");
              toast({
                title: "Command processed",
                description: "Command sent to backend successfully",
              });
            }
          }
          
          return result;
        }
        
        return result;
      } else {
        console.log("🎬 [AI Commands] No result from backend - executeCommand returned null/undefined");
        throw new Error("No response from backend");
      }
    } catch (error) {
      console.error("🎬 [AI Commands] Error during executeCommand:", error);
      console.error("🎬 [AI Commands] Error stack:", error instanceof Error ? error.stack : 'No stack');
      
      // Re-throw the error so ChatPanel can handle it (including reverting optimistic edits)
      throw error;
    }
  };

  // Infer timeline operations from simple commands for visualization
  const inferOperationsFromCommand = (command: string): Operation[] => {
    console.log("🎬 [Inference] Starting inference for command:", command);
    const operations: Operation[] = [];
    
    // Extract text overlay commands - multiple patterns
    let textMatch = command.match(/add text ['"]([^'"]+)['"].*?from\s+(\d+).*?to\s+(\d+)/i);
    console.log("🎬 [Inference] First text pattern match:", textMatch);
    
    if (!textMatch) {
      // Try simpler pattern: "add text 'hello'" (assume 5 second duration)
      textMatch = command.match(/add text ['"]([^'"]+)['"]/i);
      console.log("🎬 [Inference] Simple text pattern match:", textMatch);
      if (textMatch) {
        const [, text] = textMatch;
        operations.push({
          start_sec: 5,  // Default start at 5 seconds
          end_sec: 10,   // Default 5 second duration
          effect: 'textOverlay',
          params: { text }
        });
        console.log("🎬 [Inference] Added simple text operation:", operations[operations.length - 1]);
      }
    } else {
      const [, text, startStr, endStr] = textMatch;
      operations.push({
        start_sec: parseInt(startStr),
        end_sec: parseInt(endStr),
        effect: 'textOverlay',
        params: { text }
      });
      console.log("🎬 [Inference] Added timed text operation:", operations[operations.length - 1]);
    }
    
    // Try overlay commands (but exclude text commands to prevent duplicates)
    const overlayMatch = command.match(/overlay\s+([\w.]+).*?from\s+(\d+).*?to\s+(\d+)/i);
    console.log("🎬 [Inference] Overlay pattern match:", overlayMatch);
    if (overlayMatch) {
      const [, asset, startStr, endStr] = overlayMatch;
      operations.push({
        start_sec: parseInt(startStr),
        end_sec: parseInt(endStr),
        effect: 'caption',  // Using 'caption' as the valid type for overlay-like operations
        params: { asset }
      });
      console.log("🎬 [Inference] Added overlay operation:", operations[operations.length - 1]);
    }
    
    // Also try "add [asset]" pattern for overlay-like commands (but exclude "add text")
    const addAssetMatch = command.match(/add\s+([\w.]+).*?from\s+(\d+).*?to\s+(\d+)/i);
    console.log("🎬 [Inference] Add asset pattern match:", addAssetMatch);
    // Only process if it's not already matched as overlay AND it's not a text command
    if (addAssetMatch && !overlayMatch && !command.toLowerCase().includes('add text')) {
      const [, asset, startStr, endStr] = addAssetMatch;
      operations.push({
        start_sec: parseInt(startStr),
        end_sec: parseInt(endStr),
        effect: 'caption',  // Using 'caption' as the valid type for overlay-like operations
        params: { asset }
      });
      console.log("🎬 [Inference] Added add-asset as overlay operation:", operations[operations.length - 1]);
    }
    
    console.log("🎬 [Inference] Command:", command, "-> Operations:", operations);
    
    return operations;
  };

  // Apply AI operations to the timeline
  const applyOperationsToTimeline = (operations: Operation[]) => {
    console.log("🎬 [Apply Operations] Input operations:", operations);
    
    // Get fresh state instead of using potentially stale closure variable
    const currentClips = useEditorStore.getState().clips;
    console.log("🎬 [Apply Operations] Current clips before:", currentClips);
    console.log("🎬 [Apply Operations] Current clips count:", currentClips.length);
    
    // Convert operations to clips
    const newClips = operations.map(op => {
      const clipId = `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const clipDuration = op.end_sec - op.start_sec;
      
      // Determine the final clip type first, before calling findBestTrack
      let finalClipType: string;
      if (op.effect === 'textOverlay') {
        finalClipType = "text";
      } else if (op.effect === 'caption') {
        finalClipType = "overlay";
      } else {
        finalClipType = op.effect;
      }
      
      // Use smart track assignment with the correct final clip type
      const { track, startTime } = findBestTrack(currentClips, finalClipType, op.start_sec, clipDuration);
      
      console.log("🎬 [Apply Operations] Operation:", op.effect, "→ Final type:", finalClipType, "→ Assigned track:", track);
      
      // Create clip based on operation type
      if (op.effect === 'textOverlay') {
        return {
          id: clipId,
          start: startTime,
          end: startTime + clipDuration,
          track: track,
          type: "text",
          text: op.params?.text || "Text",
          name: op.params?.text || "Text"  // Show the actual text content, not "Text: content"
        };
      } else if (op.effect === 'caption') {
        return {
          id: clipId,
          start: startTime,
          end: startTime + clipDuration,
          track: track,
          type: "overlay",  // Use 'overlay' as the clip type for track assignment
          name: `${op.params?.asset || "Asset"}`,  // Simplified name for overlays
          asset: op.params?.asset
        };
      }
      
      // Default for other effects
      return {
        id: clipId,
        start: startTime,
        end: startTime + clipDuration,
        track: track,
        type: op.effect,
        name: `${op.effect.charAt(0).toUpperCase() + op.effect.slice(1)} Effect`
      };
    });
    
    console.log("🎬 [Apply Operations] New clips created:", newClips);
    console.log("🎬 [Apply Operations] New clips count:", newClips.length);
    
    // Preserve existing clips by merging them with new clips
    const updatedClips = [...currentClips, ...newClips];
    console.log("🎬 [Apply Operations] Updated clips (merged):", updatedClips);
    console.log("🎬 [Apply Operations] Final clips count:", updatedClips.length);
    
    setClips(updatedClips);
    
    if (newClips.length > 0) {
      setSelectedClipId(newClips[0].id);
      
      // Verify clips are still there after a small delay
      setTimeout(() => {
        const currentClipsAfterOperation = useEditorStore.getState().clips;
        console.log("🎬 [Apply Operations] Clips verification after 100ms:", currentClipsAfterOperation);
        console.log("🎬 [Apply Operations] Clips count after 100ms:", currentClipsAfterOperation.length);
        
        if (currentClipsAfterOperation.length !== updatedClips.length) {
          console.error("🎬 [Apply Operations] CLIPS MISMATCH! Expected:", updatedClips.length, "Actual:", currentClipsAfterOperation.length);
        }
      }, 100);
    }
  };

  return {
    handleChatCommand
  };
};
