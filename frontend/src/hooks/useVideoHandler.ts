import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore, Clip } from "@/store/editorStore";
import { updateAssetDuration } from "@/api/apiClient";
import { supabase } from "@/integrations/supabase/client";

// Utility function to check if two clips overlap
const clipsOverlap = (clip1: { start: number; end: number }, clip2: { start: number; end: number }) => {
  return clip1.start < clip2.end && clip1.end > clip2.start;
};

// Utility function to find the next available position on a track
const findNextAvailablePosition = (clips: Clip[], track: number, startTime: number, clipDuration: number) => {
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

// Utility function to find the best track for a new clip
const findBestTrack = (clips: Clip[], clipType: string, startTime: number, clipDuration: number) => {
  // For video clips, prefer track 0 first
  if (clipType === 'video') {
    const track0Position = findNextAvailablePosition(clips, 0, startTime, clipDuration);
    // If we can place it at the requested time on track 0, use it
    if (track0Position === startTime) {
      return { track: 0, startTime: track0Position };
    }
    // If track 0 is occupied at the requested time, check if there's a suitable gap
    const track0Clips = clips.filter(clip => clip.track === 0).sort((a, b) => a.start - b.start);
    const hasGoodGap = track0Clips.some((clip, i) => {
      const nextClip = track0Clips[i + 1];
      if (nextClip) {
        const gapStart = clip.end;
        const gapEnd = nextClip.start;
        return gapStart <= startTime && startTime + clipDuration <= gapEnd;
      }
      return false;
    });
    
    if (hasGoodGap) {
      return { track: 0, startTime: track0Position };
    }
  }
  
  // For non-video clips or when track 0 doesn't work well, find any available track
  const maxTrack = clips.length > 0 ? Math.max(...clips.map(clip => clip.track)) : -1;
  
  // Try existing tracks first
  for (let track = 0; track <= maxTrack; track++) {
    const position = findNextAvailablePosition(clips, track, startTime, clipDuration);
    // If we can place it close to the requested time (within 5 seconds), use this track
    if (Math.abs(position - startTime) <= 5) {
      return { track, startTime: position };
    }
  }
  
  // Create a new track if no existing track works well
  const newTrack = maxTrack + 1;
  return { track: newTrack, startTime };
};

export const useVideoHandler = () => {
  const { toast } = useToast();
  const {
    clips,
    duration,
    selectedClipId,
    activeVideoAsset,
    videoSrc,
    setClips,
    setSelectedClipId,
    setActiveVideoAsset,
    setVideoSrc,
    setDuration,
    setCurrentTime,
    getAssetById
  } = useEditorStore();

  const handleVideoSelect = (video: any) => {
    setClips([]);
    setActiveVideoAsset(video);
    
    if (video.src) {
      setVideoSrc(video.src);
    }
    
    toast({
      title: "Video selected",
      description: `${video.name} is now ready to edit`,
    });
  };

  const handleVideoDrop = (file: File, track: number, dropTime: number) => {
    const videoUrl = URL.createObjectURL(file);
    
    const video = document.createElement("video");
    video.src = videoUrl;
    
    video.onloadedmetadata = async () => {
      const clipDuration = video.duration;
      
      // Find the best track and position for this video clip
      const { track: bestTrack, startTime: adjustedStartTime } = findBestTrack(clips, 'video', dropTime, clipDuration);
      
      const newClip: Clip = {
        id: `clip-${Date.now()}`,
        start: adjustedStartTime,
        end: adjustedStartTime + clipDuration,
        track: bestTrack,
        type: "video",
        name: file.name
      };
      
      setClips([...clips, newClip]);
      setSelectedClipId(newClip.id);
      
      if (!videoSrc) {
        setVideoSrc(videoUrl);
        setDuration(clipDuration);
      }
      
      // Try to update asset duration in Supabase
      try {
        await updateAssetDuration(file.name, clipDuration);
      } catch (e) {
        console.warn("Failed to update asset duration in Supabase", e);
      }
      
      // Show feedback about placement
      const message = adjustedStartTime !== dropTime 
        ? `${file.name} was placed at ${Math.round(adjustedStartTime)}s on track ${bestTrack + 1} to avoid overlap`
        : bestTrack !== track
        ? `${file.name} was placed on track ${bestTrack + 1} for better organization`
        : `${file.name} has been added to track ${bestTrack + 1}`;
      
      toast({
        title: "Video added to timeline",
        description: message,
      });
    };
  };

  const handleVideoAssetDrop = async (videoAsset: any, track: number, dropTime: number) => {
    // Always look up the asset in the asset store by id
    const asset = getAssetById ? getAssetById(videoAsset.id) : videoAsset;
    if (!asset || !asset.file_path) {
      toast({
        title: "Error",
        description: "Video file path not found. Please re-upload the video.",
        variant: "destructive"
      });
      return;
    }

    // Find the best track and position for this video clip
    const { track: bestTrack, startTime: adjustedStartTime } = findBestTrack(clips, 'video', dropTime, asset.duration);

    // Create a backend-ready timeline clip
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      name: asset.name,
      start: adjustedStartTime,
      end: adjustedStartTime + asset.duration,
      track: bestTrack,
      type: "video",
      file_path: asset.file_path,
      effects: [],
      _type: "VideoClip"
    } as any;
    setClips([...clips, newClip]);
    setSelectedClipId(newClip.id);
    
    // Set the video source for the player if we don't have one yet or if this is the first clip
    if (!videoSrc || clips.length === 0) {
      // Use existing videoAsset.src if available, otherwise create signed URL
      if (videoAsset.src) {
        setVideoSrc(videoAsset.src);
        setDuration(asset.duration);
        setActiveVideoAsset(asset);
      } else {
        try {
          const { data: urlData, error } = await supabase.storage
            .from('assets')
            .createSignedUrl(asset.file_path, 3600); // 1 hour expiry
          
          if (error) {
            console.error('Failed to create signed URL for video player:', error);
          } else if (urlData?.signedUrl) {
            setVideoSrc(urlData.signedUrl);
            setDuration(asset.duration);
            setActiveVideoAsset(asset);
          }
        } catch (e) {
          console.error('Error creating signed URL for video player:', e);
        }
      }
    }
    
    // Try to update asset duration in Supabase
    try {
      await updateAssetDuration(asset.file_path, asset.duration);
    } catch (e) {
      console.warn("Failed to update asset duration in Supabase", e);
    }
    
    // Show feedback about placement
    const message = adjustedStartTime !== dropTime 
      ? `${asset.name} was placed at ${Math.round(adjustedStartTime)}s on track ${bestTrack + 1} to avoid overlap`
      : bestTrack !== track
      ? `${asset.name} was placed on track ${bestTrack + 1} for better organization`
      : `${asset.name} has been added to track ${bestTrack + 1}`;
    
    toast({
      title: "Video added to timeline",
      description: message,
    });
  };

  // Handle processed video update
  const handleVideoProcessed = (processedVideoUrl: string) => {
    console.log("🎬 [Video Handler] handleVideoProcessed called with:", processedVideoUrl);
    console.log("🎬 [Video Handler] Current clips before processing:", clips);
    
    if (processedVideoUrl) {
      console.log("Video processed, updating source:", processedVideoUrl);
      
      // Create a temporary video element to get metadata of the processed video
      const tempVideo = document.createElement("video");
      tempVideo.src = processedVideoUrl;
      
      tempVideo.onloadedmetadata = () => {
        const processedDuration = tempVideo.duration;
        
        console.log("🎬 [Video Handler] Video metadata loaded, duration:", processedDuration);
        
        // Get fresh clips state to avoid stale closure
        const currentClips = useEditorStore.getState().clips;
        console.log("🎬 [Video Handler] Fresh clips state during metadata load:", currentClips);
        
        // Update the video source to show the processed video
        setVideoSrc(processedVideoUrl);
        setDuration(processedDuration);
        
        // Create a new active video asset based on the processed video
        const newVideoAsset = {
          ...activeVideoAsset,
          src: processedVideoUrl,
          duration: processedDuration,
          id: `processed-${Date.now()}`,
          name: activeVideoAsset?.name ? `${activeVideoAsset.name} (Edited)` : "Processed Video"
        };
        
        setActiveVideoAsset(newVideoAsset);
        
        // FIXED: Instead of replacing all clips, preserve the timeline structure
        // Only update video clips to reflect the new processed video source
        if (currentClips.length > 0) {
          console.log("🎬 [Video Handler] Preserving existing clips, updating video clips");
          // Keep existing timeline structure but update video clips to use processed video
          const updatedClips = currentClips.map(clip => {
            if (clip.type === "video") {
              return {
                ...clip,
                name: clip.name.includes("(Edited)") ? clip.name : `${clip.name} (Edited)`
              };
            }
            return clip;
          });
          console.log("🎬 [Video Handler] Updated clips:", updatedClips);
          setClips(updatedClips);
        } else {
          console.log("🎬 [Video Handler] No existing clips, creating new clip for processed video");
          // If no clips exist, create a single clip for the processed video
          const newClip: Clip = {
            id: `clip-${Date.now()}`,
            start: 0,
            end: processedDuration,
            track: 0,
            type: "video",
            name: newVideoAsset.name
          };
          console.log("🎬 [Video Handler] Created new clip:", newClip);
          setClips([newClip]);
        }
        
        // Don't reset current time if user is in the middle of editing
        // setCurrentTime(0);  // Removed: Let user stay at current position
        
        toast({
          title: "Video processed",
          description: "Your video has been updated with the latest edits",
        });
      };
      
      tempVideo.onerror = () => {
        console.log("🎬 [Video Handler] Error loading processed video");
        toast({
          title: "Error",
          description: "Failed to load processed video",
          variant: "destructive"
        });
      };
    }
  };

  return {
    handleVideoSelect,
    handleVideoDrop,
    handleVideoAssetDrop,
    handleVideoProcessed
  };
};
