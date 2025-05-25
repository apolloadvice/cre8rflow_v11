import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import Playhead from "./Playhead";

interface TimelineProps {
  duration: number;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  clips?: {
    id: string;
    start: number;
    end: number;
    track: number;
    type?: string;
    name?: string;
    text?: string;
    asset?: string;
  }[];
  onClipSelect?: (clipId: string | null) => void;
  selectedClipId?: string | null;
  onVideoDrop?: (file: File, track: number, time: number) => void;
  onVideoAssetDrop?: (videoAsset: any, track: number, time: number) => void;
  onMultipleVideoAssetDrop?: (videoAssets: any[], track: number, time: number) => void;
  onClipUpdate?: (clipId: string, updates: { start?: number; end?: number }) => void;
  onClipMove?: (clipId: string, newTrack: number, newStartTime: number) => void;
}

const Timeline = forwardRef<HTMLDivElement, TimelineProps>(({
  duration,
  currentTime,
  onTimeUpdate,
  clips = [],
  onClipSelect,
  selectedClipId,
  onVideoDrop,
  onVideoAssetDrop,
  onMultipleVideoAssetDrop,
  onClipUpdate,
  onClipMove,
}, ref) => {
  console.log('[Timeline] RENDER');

  // Debug: log clips prop on every render
  console.log("🎬 [Timeline] clips prop:", clips);
  console.log("🎬 [Timeline] clips length:", clips.length);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [thumbnailsVisible, setThumbnailsVisible] = useState(true);
  const [isDraggingHandle, setIsDraggingHandle] = useState<{ clipId: string; handle: 'start' | 'end' } | null>(null);
  const [isAutoZoom, setIsAutoZoom] = useState(true); // Auto-zoom when content changes
  const [draggingClip, setDraggingClip] = useState<{ clipId: string; dragStartX: number; clipStartTime: number } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ track: number; time: number; insertionIndex?: number } | null>(null);
  const [dragCursor, setDragCursor] = useState<{ x: number; y: number } | null>(null);
  
  // Use the forwarded ref or fall back to internal ref
  const resolvedRef = (ref as React.RefObject<HTMLDivElement>) || timelineRef;
  
  // Calculate dynamic track count based on clips
  const maxTrack = clips.length > 0 ? Math.max(...clips.map(clip => clip.track)) : 0;
  const trackCount = Math.max(maxTrack + 1, 3); // Minimum 3 tracks, expand as needed

  // Dynamic zoom calculation based on content
  const calculateOptimalZoom = useCallback(() => {
    if (!resolvedRef.current || clips.length === 0 || !isAutoZoom) return zoom;
    
    // Get timeline container width
    const containerWidth = resolvedRef.current.getBoundingClientRect().width;
    if (containerWidth === 0) return zoom;
    
    // Calculate total content duration and minimum clip width requirements
    const contentDuration = duration;
    const clipCount = clips.length;
    
    // Base zoom calculation: ensure content fits well in viewport
    // Minimum of 50px per clip for readability, but also ensure total duration is well visible
    const minPixelsPerSecond = 20; // Minimum pixels per second for readability
    const maxPixelsPerSecond = 100; // Maximum to prevent over-zooming
    const idealPixelsPerSecond = Math.max(minPixelsPerSecond, Math.min(maxPixelsPerSecond, containerWidth / Math.max(contentDuration, 30)));
    
    // Calculate zoom level
    const baseZoom = idealPixelsPerSecond / (containerWidth / Math.max(contentDuration, 30));
    
    // Adjust based on number of clips for better UX
    const clipDensityFactor = Math.min(1.5, 1 + (clipCount * 0.05)); // Slight zoom boost for more clips
    
    const calculatedZoom = Math.max(0.3, Math.min(3, baseZoom * clipDensityFactor));
    
    console.log("🔍 [Timeline] Zoom calculation:", {
      containerWidth,
      contentDuration,
      clipCount,
      idealPixelsPerSecond,
      baseZoom,
      clipDensityFactor,
      calculatedZoom
    });
    
    return calculatedZoom;
  }, [resolvedRef, clips.length, duration, isAutoZoom, zoom]);
  
  // Auto-zoom effect when content changes
  useEffect(() => {
    if (isAutoZoom && clips.length > 0) {
      const optimalZoom = calculateOptimalZoom();
      if (Math.abs(optimalZoom - zoom) > 0.1) { // Only update if significant change
        setZoom(optimalZoom);
      }
    }
  }, [clips.length, duration, isAutoZoom, calculateOptimalZoom]);
  
  // Zoom to fit content function
  const zoomToFit = () => {
    const optimalZoom = calculateOptimalZoom();
    setZoom(optimalZoom);
    setIsAutoZoom(true);
  };

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate time markers based on duration and zoom
  const generateTimeMarkers = () => {
    const markers = [];
    const step = 5; // 5 second intervals
    for (let i = 0; i <= duration; i += step) {
      markers.push(
        <div
          key={i}
          className="absolute h-3 border-l border-cre8r-gray-600 text-xs text-cre8r-gray-400"
          style={{ left: `${(i / duration) * 100}%` }}
        >
          <span className="absolute top-3 left-1">{formatTime(i)}</span>
        </div>
      );
    }
    return markers;
  };

  // Get color for clip based on type
  const getClipStyle = (type?: string) => {
    switch (type) {
      case "text":
        return "from-green-700 to-green-500";  // Green for text elements
      case "overlay":
        return "from-orange-700 to-orange-500";  // Orange for overlay elements
      case "video":
        return "from-cre8r-violet-dark to-cre8r-violet";  // Keep purple for video
      case "trim":
        return "from-blue-700 to-blue-500";
      case "highlight":
        return "from-yellow-700 to-yellow-500";
      case "subtitle":
        return "from-green-700 to-green-500";
      case "audio":
        return "from-purple-700 to-purple-500";
      case "color":
        return "from-orange-700 to-orange-500";
      case "crop":
        return "from-pink-700 to-pink-500";
      case "cut":
        return "from-red-700 to-red-500";
      case "fade":
        return "from-indigo-700 to-indigo-500";
      case "zoom":
        return "from-emerald-700 to-emerald-500";
      case "speed":
        return "from-amber-700 to-amber-500";
      case "brightness":
        return "from-sky-700 to-sky-500";
      case "textOverlay":
        return "from-green-700 to-green-500";  // Also green for consistency with text
      default:
        return "from-cre8r-violet-dark to-cre8r-violet";  // Default purple for video elements
    }
  };

  // Debounced function to handle thumbnail updates on zoom changes
  const debouncedThumbnailUpdate = useCallback(
    debounce((newZoom) => {
      // This would trigger a re-fetch of thumbnails at appropriate resolution
      console.log("Updating thumbnails for zoom level:", newZoom);
    }, 300),
    []
  );

  // Effect to handle zoom changes for thumbnails
  useEffect(() => {
    if (thumbnailsVisible) {
      debouncedThumbnailUpdate(zoom);
    }
  }, [zoom, thumbnailsVisible, debouncedThumbnailUpdate]);

  // Handle timeline click to update current time
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!resolvedRef.current) return;

    const rect = resolvedRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / rect.width) * duration;
    onTimeUpdate(Math.max(0, Math.min(duration, clickedTime)));
  };

  // Handle clip drag start
  const handleClipDragStart = (e: React.DragEvent, clip: any) => {
    console.log('🎬 [Timeline] Starting clip drag:', clip.id);
    
    // Set drag data for the clip being moved
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "TIMELINE_CLIP",
      clipId: clip.id,
      originalTrack: clip.track,
      originalStart: clip.start
    }));
    e.dataTransfer.effectAllowed = "move";
    
    // Store drag state
    const rect = resolvedRef.current?.getBoundingClientRect();
    if (rect) {
      const dragStartX = e.clientX - rect.left;
      setDraggingClip({
        clipId: clip.id,
        dragStartX,
        clipStartTime: clip.start
      });
    }
    
    // Add global mouse move listener for better tracking
    document.addEventListener('dragover', handleGlobalDragOver);
  };
  
  // Global drag over handler for better tracking
  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    if (!draggingClip || !resolvedRef.current) return;
    
    e.preventDefault();
    
    const timelineRect = resolvedRef.current.getBoundingClientRect();
    
    // Update cursor position relative to timeline for visual tracking
    const relativeX = e.clientX - timelineRect.left;
    const relativeY = e.clientY - timelineRect.top;
    
    setDragCursor({
      x: relativeX,
      y: relativeY
    });
    
    // Check if mouse is over the timeline
    const isOverTimeline = e.clientX >= timelineRect.left && e.clientX <= timelineRect.right &&
                          e.clientY >= timelineRect.top && e.clientY <= timelineRect.bottom;
    
    if (isOverTimeline) {
      const trackHeight = 48 + 4;
      const headerHeight = 28;
      const trackIndex = Math.floor((relativeY - headerHeight) / trackHeight);
      
      if (trackIndex >= 0 && trackIndex < trackCount) {
        const dropTime = (relativeX / timelineRect.width) * duration;
        
        // Calculate insertion index
        let insertionIndex = 0;
        const otherClipsOnTrack = clips.filter(c => c.id !== draggingClip.clipId && c.track === trackIndex);
        const sortedClips = otherClipsOnTrack.sort((a, b) => a.start - b.start);
        
        for (let i = 0; i < sortedClips.length; i++) {
          const currentClip = sortedClips[i];
          const nextClip = sortedClips[i + 1];
          
          if (dropTime < currentClip.start) {
            insertionIndex = i;
            break;
          }
          
          if (nextClip && dropTime >= currentClip.end && dropTime < nextClip.start) {
            insertionIndex = i + 1;
            break;
          }
          
          if (i === sortedClips.length - 1) {
            insertionIndex = sortedClips.length;
            break;
          }
        }
        
        setDropIndicator({ track: trackIndex, time: dropTime, insertionIndex });
      } else {
        setDropIndicator(null);
      }
    } else {
      setDropIndicator(null);
    }
  }, [draggingClip, clips, duration, trackCount]);

  // Handle clip drag end
  const handleClipDragEnd = (e: React.DragEvent) => {
    console.log('🎬 [Timeline] Ending clip drag');
    setDraggingClip(null);
    setDropIndicator(null);
    setDragCursor(null);
    
    // Remove global listener
    document.removeEventListener('dragover', handleGlobalDragOver);
  };
  
  // Handle global drag over for the entire timeline
  const handleTimelineDragOver = (e: React.DragEvent) => {
    if (!draggingClip) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Find which track the mouse is over
    const timelineRect = resolvedRef.current?.getBoundingClientRect();
    if (!timelineRect) return;
    
    const relativeY = e.clientY - timelineRect.top;
    const trackHeight = 48 + 4; // Track height + gap (h-12 = 48px + gap-1 = 4px)
    const headerHeight = 28; // Time markers height (h-6 = 24px + margin)
    const trackIndex = Math.floor((relativeY - headerHeight) / trackHeight);
    
    console.log('🎯 [Timeline] Global drag over - Y:', relativeY, 'Track:', trackIndex, 'Mouse X:', e.clientX - timelineRect.left);
    
    // Only update if we're over a valid track
    if (trackIndex >= 0 && trackIndex < trackCount) {
      updateDropIndicator(e, trackIndex);
    } else {
      // Clear drop indicator if not over a valid track
      setDropIndicator(null);
    }
  };
  
  // Handle drag leave from timeline
  const handleTimelineDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the timeline container
    const rect = resolvedRef.current?.getBoundingClientRect();
    if (rect) {
      const isOutside = e.clientX < rect.left || e.clientX > rect.right || 
                       e.clientY < rect.top || e.clientY > rect.bottom;
      if (isOutside) {
        setDropIndicator(null);
      }
    }
  };

  // Handle drag over for video dropping and clip moving
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, trackIndex: number) => {
    e.preventDefault();
    
    // If we're dragging a clip, let the global handler manage the drop indicator
    if (draggingClip) {
      e.stopPropagation();
      return;
    }
    
    const target = e.currentTarget as HTMLDivElement;
    target.style.backgroundColor = "rgba(139, 92, 246, 0.1)"; // Highlight drop zone
    
    updateDropIndicator(e, trackIndex);
    
    target.style.borderLeft = "2px solid rgba(139, 92, 246, 0.8)";
    target.style.borderLeftStyle = "dashed";
  };
  
  // Update drop indicator based on mouse position
  const updateDropIndicator = (e: React.DragEvent | React.MouseEvent, trackIndex: number) => {
    const rect = resolvedRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const dropTime = (x / rect.width) * duration;
      
      console.log('🎯 [Timeline] updateDropIndicator - X:', x, 'Width:', rect.width, 'DropTime:', dropTime, 'Track:', trackIndex);
      
      // Calculate insertion index for clip reordering
      let insertionIndex = 0;
      if (draggingClip) {
        const otherClipsOnTrack = clips.filter(c => c.id !== draggingClip.clipId && c.track === trackIndex);
        const sortedClips = otherClipsOnTrack.sort((a, b) => a.start - b.start);
        
        console.log('🎯 [Timeline] Other clips on track:', sortedClips.map(c => ({ id: c.id, start: c.start, end: c.end })));
        
        for (let i = 0; i < sortedClips.length; i++) {
          const currentClip = sortedClips[i];
          const nextClip = sortedClips[i + 1];
          
          if (dropTime < currentClip.start) {
            insertionIndex = i;
            break;
          }
          
          if (nextClip && dropTime >= currentClip.end && dropTime < nextClip.start) {
            insertionIndex = i + 1;
            break;
          }
          
          if (i === sortedClips.length - 1) {
            insertionIndex = sortedClips.length;
            break;
          }
        }
        
        console.log('🎯 [Timeline] Calculated insertion index:', insertionIndex);
      }
      
      // Update drop indicator for visual feedback
      setDropIndicator({ track: trackIndex, time: dropTime, insertionIndex });
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // If we're dragging a clip, let the global handler manage the drop indicator
    if (draggingClip) {
      return;
    }
    
    const target = e.currentTarget as HTMLDivElement;
    target.style.backgroundColor = "";
    target.style.borderLeft = "";
    target.style.borderLeftStyle = "";
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, trackIndex: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    target.style.backgroundColor = "";
    target.style.borderLeft = "";
    target.style.borderLeftStyle = "";
    setDropIndicator(null);
    
    // Check if this is a file drop or a video asset drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // This is a file drop
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("video/")) return;

      const rect = resolvedRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const dropTime = (x / rect.width) * duration;

      onVideoDrop?.(file, trackIndex, dropTime);
    } else {
      // Check if this is a video asset drop or clip move
      try {
        const assetData = e.dataTransfer.getData("application/json");
        if (assetData) {
          const asset = JSON.parse(assetData);
          
          if (asset.type === "TIMELINE_CLIP") {
            // This is a clip being moved within the timeline
            console.log('🎬 [Timeline] Clip move detected:', asset.clipId);
            
            const rect = resolvedRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const newStartTime = (x / rect.width) * duration;
            
            // Only move if position or track changed
            if (asset.originalTrack !== trackIndex || Math.abs(asset.originalStart - newStartTime) > 0.1) {
              console.log('🎬 [Timeline] Moving clip to track', trackIndex, 'at time', newStartTime);
              onClipMove?.(asset.clipId, trackIndex, Math.max(0, newStartTime));
            }
            
            return;
          }
          
          if (asset.type === "ASSET") {
            // This is an asset from our AssetsTabs
            console.log("Asset dropped:", asset.asset);
            // Here you would handle the asset drop based on its type
            // For now, we'll just pass it to onVideoAssetDrop if it's a video
            if (asset.asset.type === "video") {
              const rect = resolvedRef.current?.getBoundingClientRect();
              if (!rect) return;
              
              const x = e.clientX - rect.left;
              const dropTime = (x / rect.width) * duration;
              
              onVideoAssetDrop?.(asset.asset, trackIndex, dropTime);
            }
          } else if (asset.type === "MULTIPLE_ASSETS") {
            // This is a multiple asset drop from AssetPanel
            console.log("🎬 [Timeline] Multiple assets dropped:", asset.assets.map((a: any) => a.name));
            
            const rect = resolvedRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const dropTime = (x / rect.width) * duration;
            
            // Disable auto-zoom temporarily to prevent it from firing during multi-drop
            setIsAutoZoom(false);
            
            onMultipleVideoAssetDrop?.(asset.assets, trackIndex, dropTime);
            
            // Re-enable auto-zoom after a short delay to allow all clips to be added
            setTimeout(() => {
              setIsAutoZoom(true);
            }, 500);
          } else {
            // This is a regular video asset drop (from AssetPanel)
            const rect = resolvedRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const dropTime = (x / rect.width) * duration;
            
            onVideoAssetDrop?.(asset, trackIndex, dropTime);
          }
        }
      } catch (error) {
        console.error("Error parsing dragged asset:", error);
      }
    }
  };

  // Get thumbnail background position based on current time
  const getThumbnailStyle = (clipInfo: any) => {
    if (!thumbnailsVisible) return {};
    
    // This would use real sprite data in a production implementation
    // The background-position calculation would be based on the actual VTT data
    const spritePosition = -(Math.floor(clipInfo.start) % 10) * 320;
    
    return {
      backgroundImage: `url(https://example.com/sprites/sample_sprite.png)`,
      backgroundPosition: `${spritePosition}px 0`,
      backgroundSize: 'auto 100%',
      backgroundRepeat: 'no-repeat'
    };
  };

  // Handle mouse down on trim handles
  const handleTrimHandleMouseDown = (
    e: React.MouseEvent,
    clipId: string,
    handle: 'start' | 'end'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingHandle({ clipId, handle });
    
    // Add event listeners for mousemove and mouseup
    document.addEventListener('mousemove', handleTrimHandleMouseMove);
    document.addEventListener('mouseup', handleTrimHandleMouseUp);
  };
  
  // Handle mouse move when dragging trim handles
  const handleTrimHandleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingHandle || !resolvedRef.current) return;
    
    const { clipId, handle } = isDraggingHandle;
    const clipToUpdate = clips.find(clip => clip.id === clipId);
    
    if (!clipToUpdate) return;
    
    const rect = resolvedRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const draggedTime = (x / rect.width) * duration;
    
    // Calculate the new start/end time with constraints
    if (handle === 'start') {
      // Don't allow start time to go past end time - 1 second minimum duration
      const newStart = Math.min(Math.max(0, draggedTime), clipToUpdate.end - 1);
      onClipUpdate?.(clipId, { start: newStart });
    } else if (handle === 'end') {
      // Don't allow end time to go before start time + 1 second minimum duration
      const newEnd = Math.max(Math.min(duration, draggedTime), clipToUpdate.start + 1);
      onClipUpdate?.(clipId, { end: newEnd });
    }
  }, [isDraggingHandle, clips, duration, onClipUpdate, resolvedRef]);
  
  // Handle mouse up to end dragging
  const handleTrimHandleMouseUp = useCallback(() => {
    setIsDraggingHandle(null);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleTrimHandleMouseMove);
    document.removeEventListener('mouseup', handleTrimHandleMouseUp);
  }, [handleTrimHandleMouseMove]);
  
  // Clean up event listeners on component unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleTrimHandleMouseMove);
      document.removeEventListener('mouseup', handleTrimHandleMouseUp);
      document.removeEventListener('dragover', handleGlobalDragOver);
    };
  }, [handleTrimHandleMouseMove, handleTrimHandleMouseUp, handleGlobalDragOver]);

  return (
    <>
      <div className="h-full flex flex-col bg-cre8r-gray-900 border-t border-cre8r-gray-700 select-none">
        <div className="flex items-center justify-between p-2 bg-cre8r-gray-800 border-b border-cre8r-gray-700">
        <div className="flex items-center gap-2">
          <button 
            className="p-1 hover:bg-cre8r-gray-700 rounded" 
            onClick={() => {
              setZoom(Math.max(0.5, zoom - 0.1));
              setIsAutoZoom(false); // Disable auto-zoom when manually adjusting
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-minus"><path d="M5 12h14"/></svg>
          </button>
          <span className="text-xs text-cre8r-gray-300">{Math.round(zoom * 100)}%</span>
          <button 
            className="p-1 hover:bg-cre8r-gray-700 rounded" 
            onClick={() => {
              setZoom(Math.min(2, zoom + 0.1));
              setIsAutoZoom(false); // Disable auto-zoom when manually adjusting
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
          <button
            className={`p-1 hover:bg-cre8r-gray-700 rounded text-xs ${thumbnailsVisible ? 'text-cre8r-violet' : 'text-cre8r-gray-400'}`}
            onClick={() => setThumbnailsVisible(!thumbnailsVisible)}
          >
            {thumbnailsVisible ? 'Hide Thumbnails' : 'Show Thumbnails'}
          </button>
          <button
            className="p-1 hover:bg-cre8r-gray-700 rounded text-xs text-cre8r-gray-300 hover:text-white"
            onClick={zoomToFit}
            title="Zoom to fit all content"
          >
            Fit
          </button>
          <button
            className={`p-1 hover:bg-cre8r-gray-700 rounded text-xs ${
              isAutoZoom ? 'text-cre8r-violet' : 'text-cre8r-gray-400'
            }`}
            onClick={() => setIsAutoZoom(!isAutoZoom)}
            title="Auto-zoom when content changes"
          >
            Auto
          </button>
        </div>
        <div className="text-sm text-cre8r-gray-200">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div className="relative flex-1 overflow-x-auto overflow-y-hidden p-2 bg-cre8r-gray-900">
        {/* Timeline with markers */}
        <div 
          ref={resolvedRef}
          className="relative h-full"
          style={{ width: `${100 * zoom}%`, minWidth: "100%" }}
          onClick={(e) => {
            // Deselect any selected clip when clicking empty timeline space
            if (e.target === e.currentTarget) {
              onClipSelect?.(null);
            }
            handleTimelineClick(e);
          }}
          onDragOver={handleTimelineDragOver}
          onDragLeave={handleTimelineDragLeave}
        >
          {/* Drag tracking line - positioned relative to timeline */}
          {draggingClip && dragCursor && (
            <div
              className="absolute pointer-events-none z-[60] w-0.5 bg-cre8r-violet shadow-lg"
              style={{
                left: dragCursor.x,
                top: 0,
                bottom: 0,
                height: '100%'
              }}
            >
              {/* Circular indicator at cursor position */}
              <div 
                className="absolute w-3 h-3 bg-cre8r-violet rounded-full shadow-lg"
                style={{
                  left: '-5px',
                  top: dragCursor.y - 6
                }}
              />
            </div>
          )}
          
          {/* Time markers */}
          <div className="h-6 border-b border-cre8r-gray-700 relative mb-1">
            {generateTimeMarkers()}
          </div>

          {/* Tracks without labels - full width */}
          <div className="flex flex-col gap-1">
            {Array.from({ length: trackCount }).map((_, index) => (
              <div 
                key={index}
                className="w-full h-12 bg-cre8r-gray-800 rounded border border-cre8r-gray-700 relative"
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Render all clips for this track */}
                {clips.filter(clip => clip.track === index).map((clip) => {
                  const isDragging = draggingClip?.clipId === clip.id;
                  return (
                    <div
                      key={clip.id}
                      draggable
                      className={cn(
                        "absolute h-10 my-1 rounded overflow-hidden cursor-move hover:opacity-100 transition-opacity",
                        selectedClipId === clip.id ? "border-2 border-white ring-2 ring-cre8r-violet opacity-100" : "opacity-90 hover:ring-1 hover:ring-white border-0",
                        isDragging && "opacity-30 z-50 scale-95 transition-all duration-200"
                      )}
                      style={{
                        left: `${(clip.start / duration) * 100}%`,
                        width: `${((clip.end - clip.start) / duration) * 100}%`,
                        ...getThumbnailStyle(clip)
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('[Timeline] Clip clicked:', clip.id, clip.type);
                        onClipSelect?.(clip.id);
                      }}
                      onDragStart={(e) => handleClipDragStart(e, clip)}
                      onDragEnd={handleClipDragEnd}
                      title={clip.name || clip.text || clip.asset || "Edit"}
                    >
                    <div className={`h-full w-full bg-gradient-to-r ${getClipStyle(clip.type)} flex items-center justify-center px-2 bg-opacity-70`}>
                      <span className="text-xs text-white truncate font-medium">
                        {clip.name || clip.text || clip.asset || formatTime(clip.end - clip.start)}
                      </span>
                    </div>
                    {/* Left trim handle */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-3 hover:bg-white hover:bg-opacity-30 cursor-w-resize z-10"
                      onMouseDown={(e) => handleTrimHandleMouseDown(e, clip.id, 'start')}
                      onDragStart={(e) => e.preventDefault()} // Prevent drag from trim handles
                      title="Trim start"
                    >
                      <div className="h-full w-1 bg-white opacity-60 mx-auto"></div>
                    </div>
                    {/* Right trim handle */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-3 hover:bg-white hover:bg-opacity-30 cursor-e-resize z-10"
                      onMouseDown={(e) => handleTrimHandleMouseDown(e, clip.id, 'end')}
                      onDragStart={(e) => e.preventDefault()} // Prevent drag from trim handles
                      title="Trim end"
                    >
                      <div className="h-full w-1 bg-white opacity-60 mx-auto"></div>
                    </div>
                  </div>
                  );
                })}
                  
                    {/* Drop indicator for visual feedback during clip movement */}
                    {dropIndicator && dropIndicator.track === index && (
                    <div className="absolute top-0 bottom-0 pointer-events-none z-50">
                    {/* Insertion line indicator */}
                    <div
                    className="absolute top-0 bottom-0 w-1 bg-cre8r-violet shadow-lg"
                    style={{
                    left: `${(dropIndicator.time / duration) * 100}%`,
                      transform: 'translateX(-50%)'
                      }}
                    >
                    <div className="absolute -top-2 -left-1.5 w-3 h-3 bg-cre8r-violet rounded-full shadow-lg"></div>
                      <div className="absolute -bottom-2 -left-1.5 w-3 h-3 bg-cre8r-violet rounded-full shadow-lg"></div>
                    </div>
                    
                    {/* Insertion position label */}
                    {draggingClip && dropIndicator.insertionIndex !== undefined && (
                    <div
                    className="absolute -top-8 px-2 py-1 bg-cre8r-violet text-white text-xs rounded shadow-lg whitespace-nowrap"
                    style={{
                    left: `${(dropIndicator.time / duration) * 100}%`,
                      transform: 'translateX(-50%)'
                      }}
                    >
                      Insert at position {dropIndicator.insertionIndex + 1}
                      </div>
                      )}
                      </div>
                )}
              </div>
            ))}
          </div>

          {/* Playhead */}
          <Playhead timelineRef={resolvedRef} />
        </div>
      </div>
      </div>
    </>
  );
});

Timeline.displayName = "Timeline";

export default Timeline;
