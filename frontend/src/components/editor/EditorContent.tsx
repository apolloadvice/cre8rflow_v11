import { useState, useRef, useEffect } from "react";
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";
import VideoPlayer from "@/components/editor/VideoPlayer";
import Timeline from "@/components/editor/Timeline";
import ChatPanel from "@/components/editor/ChatPanel";
import AssetsIconBar from "@/components/editor/AssetsIconBar";
import TimecodeDisplay from "@/components/editor/TimecodeDisplay";
import { useEditorStore, useLayoutSetter, useLayout } from "@/store/editorStore";
import { useVideoHandler } from "@/hooks/useVideoHandler";
import { useAICommands } from "@/hooks/useAICommands";
import { saveTimeline } from "@/api/apiClient";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "lodash";

const EditorContent = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  
  // Get layout state and setter
  const layout = useLayout();
  const setLayoutSize = useLayoutSetter();
  
  // Get state from our store
  const {
    currentTime, 
    duration, 
    setCurrentTime,
    setDuration,
    updateClip,
    activeVideoAsset,
    clips,
    setClips,
    selectedClipId,
    setSelectedClipId,
  } = useEditorStore();
  
  // Use our custom hooks
  const { handleVideoDrop, handleVideoAssetDrop: origHandleVideoAssetDrop, handleVideoProcessed } = useVideoHandler();
  const { handleChatCommand } = useAICommands();
  const { toast } = useToast();

  // Debounced timeline save
  const debouncedSaveTimeline = useRef(
    debounce(async (assetPath: string, timeline: any) => {
      try {
        await saveTimeline(assetPath, timeline);
        toast({ title: "Timeline saved", description: "Your changes have been saved.", variant: "default" });
      } catch (err: any) {
        toast({ title: "Save failed", description: err.message || "Failed to save timeline.", variant: "destructive" });
      }
    }, 800)
  ).current;

  // Animation frame for syncing video time with store
  useEffect(() => {
    let animationFrameId: number;
    
    const updateTime = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
      animationFrameId = requestAnimationFrame(updateTime);
    };
    
    animationFrameId = requestAnimationFrame(updateTime);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [setCurrentTime]);

  // Helper to build timeline object for backend
  function buildTimelineObject(clips: any[], frameRate = 30.0) {
    // Group clips by track number
    const trackCount = 6;
    const trackTypes = ["video", "text", "audio", "effects", "format", "other"];
    const tracks = Array.from({ length: trackCount }).map((_, i) => ({
      name: `${trackTypes[i]?.charAt(0).toUpperCase() + trackTypes[i]?.slice(1) || "Track"} ${i + 1}`,
      track_type: trackTypes[i] || "video",
      clips: clips.filter(c => c.track === i)
    }));
    return {
      _type: "Timeline",
      version: "1.0",
      frame_rate: frameRate,
      tracks,
      transitions: []
    };
  }

  // Save timeline after clip update
  const handleClipUpdate = (clipId: string, updates: { start?: number; end?: number }) => {
    updateClip(clipId, updates);
    if (activeVideoAsset?.file_path) {
      const timelineObj = buildTimelineObject(clips.map(c => c.id === clipId ? { ...c, ...updates } : c));
      debouncedSaveTimeline(activeVideoAsset.file_path, timelineObj);
    }
  };

  // Patch handleVideoAssetDrop to save timeline after drop
  const handleVideoAssetDrop = (videoAsset: any, track: number, dropTime: number) => {
    origHandleVideoAssetDrop(videoAsset, track, dropTime);
    // Save after drop (new clip added)
    setTimeout(() => {
      if (activeVideoAsset?.file_path) {
        const timelineObj = buildTimelineObject(useEditorStore.getState().clips);
        debouncedSaveTimeline(activeVideoAsset.file_path, timelineObj);
      }
    }, 0);
  };

  // Handlers for layout changes
  const handleSidebarResize = (sizes: number[]) => {
    setLayoutSize('sidebar', sizes[0]);
  };

  const handleMainPaneResize = (sizes: number[]) => {
    setLayoutSize('preview', sizes[0]);
    setLayoutSize('chat', sizes[1]);
  };

  const handleTimelineResize = (sizes: number[]) => {
    setLayoutSize('timeline', sizes[1]);
  };

  return (
    <div className="flex-1 overflow-hidden">
      <ResizablePanelGroup
        direction="horizontal" 
        onLayout={handleSidebarResize}
      >
        {/* Left sidebar with assets */}
        <ResizablePanel 
          defaultSize={layout.sidebar} 
          minSize={15}
          className="flex"
        >
          <AssetsIconBar />
        </ResizablePanel>
        
        {/* Divider between sidebar and main content */}
        <ResizableHandle withHandle className="bg-cre8r-gray-700 hover:bg-cre8r-violet transition-colors" />
        
        {/* Main content area with nested panel groups */}
        <ResizablePanel>
          <ResizablePanelGroup 
            direction="vertical"
            onLayout={handleTimelineResize}
          >
            {/* Top section with preview and chat */}
            <ResizablePanel>
              <ResizablePanelGroup 
                direction="horizontal"
                onLayout={handleMainPaneResize}
              >
                {/* Video preview */}
                <ResizablePanel 
                  defaultSize={layout.preview} 
                  minSize={50}
                  className="flex-1 min-h-0"
                >
                  <VideoPlayer
                    ref={videoRef}
                    src={useEditorStore.getState().videoSrc}
                    currentTime={currentTime}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={setDuration}
                    className="h-full"
                    rightControl={<TimecodeDisplay />}
                    clips={clips}
                  />
                </ResizablePanel>
                
                {/* Divider between preview and chat */}
                <ResizableHandle withHandle className="bg-cre8r-gray-700 hover:bg-cre8r-violet transition-colors" />
                
                {/* Chat panel */}
                <ResizablePanel 
                  defaultSize={layout.chat} 
                  minSize={20}
                  className="w-1/5 min-w-[280px]"
                >
                  <ChatPanel 
                    onChatCommand={handleChatCommand} 
                    onVideoProcessed={handleVideoProcessed} 
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            
            {/* Divider between top section and timeline */}
            <ResizableHandle withHandle className="bg-cre8r-gray-700 hover:bg-cre8r-violet transition-colors" />
            
            {/* Timeline section */}
            <ResizablePanel 
              defaultSize={layout.timeline} 
              minSize={15}
            >
              <Timeline
                ref={timelineRef}
                duration={duration}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
                clips={clips}
                onClipSelect={setSelectedClipId}
                selectedClipId={selectedClipId}
                onVideoDrop={handleVideoDrop}
                onVideoAssetDrop={handleVideoAssetDrop}
                onClipUpdate={handleClipUpdate}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default EditorContent;
