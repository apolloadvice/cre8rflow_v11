
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
    updateClip
  } = useEditorStore();
  
  // Use our custom hooks
  const { handleVideoDrop, handleVideoAssetDrop, handleVideoProcessed } = useVideoHandler();
  const { handleChatCommand } = useAICommands();

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

  // Handle clip updates (trimming)
  const handleClipUpdate = (clipId: string, updates: { start?: number; end?: number }) => {
    updateClip(clipId, updates);
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
                clips={useEditorStore.getState().clips}
                onClipSelect={useEditorStore.getState().setSelectedClipId}
                selectedClipId={useEditorStore.getState().selectedClipId}
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
