import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore, Clip } from "@/store/editorStore";

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
    
    video.onloadedmetadata = () => {
      const clipDuration = video.duration;
      const newClip: Clip = {
        id: `clip-${Date.now()}`,
        start: dropTime,
        end: dropTime + clipDuration,
        track,
        type: "video",
        name: file.name
      };
      
      setClips([...clips, newClip]);
      setSelectedClipId(newClip.id);
      
      if (!videoSrc) {
        setVideoSrc(videoUrl);
        setDuration(clipDuration);
      }
      
      toast({
        title: "Video added to timeline",
        description: `${file.name} has been added to track ${track + 1}`,
      });
    };
  };

  const handleVideoAssetDrop = (videoAsset: any, track: number, dropTime: number) => {
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

    // Create a backend-ready timeline clip
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      name: asset.name,
      start: dropTime,
      end: dropTime + asset.duration,
      track,
      type: "video",
      file_path: asset.file_path,
      effects: [],
      _type: "VideoClip"
    } as any;
    setClips([...clips, newClip]);
    setSelectedClipId(newClip.id);
    toast({
      title: "Video added to timeline",
      description: `${asset.name} has been added to track ${track + 1}`,
    });
  };

  // Handle processed video update
  const handleVideoProcessed = (processedVideoUrl: string) => {
    if (processedVideoUrl) {
      console.log("Video processed, updating source:", processedVideoUrl);
      
      // Create a temporary video element to get metadata of the processed video
      const tempVideo = document.createElement("video");
      tempVideo.src = processedVideoUrl;
      
      tempVideo.onloadedmetadata = () => {
        const processedDuration = tempVideo.duration;
        
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
        
        // Replace all clips with a single clip for the processed video
        const newClip: Clip = {
          id: `clip-${Date.now()}`,
          start: 0,
          end: processedDuration,
          track: 0,
          type: "video",
          name: newVideoAsset.name
        };
        
        setClips([newClip]);
        setSelectedClipId(newClip.id);
        setCurrentTime(0);  // Seek to the beginning of the new video
        
        toast({
          title: "Video processed",
          description: "Your edited video has replaced the original in the timeline",
        });
      };
      
      tempVideo.onerror = () => {
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
