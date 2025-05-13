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
  }[];
  onClipSelect?: (clipId: string | null) => void;
  selectedClipId?: string | null;
  onVideoDrop?: (file: File, track: number, time: number) => void;
  onVideoAssetDrop?: (videoAsset: any, track: number, time: number) => void;
  onClipUpdate?: (clipId: string, updates: { start?: number; end?: number }) => void;
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
  onClipUpdate,
}, ref) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const trackCount = 6;
  const [thumbnailsVisible, setThumbnailsVisible] = useState(true);
  const [isDraggingHandle, setIsDraggingHandle] = useState<{ clipId: string; handle: 'start' | 'end' } | null>(null);
  
  // Use the forwarded ref or fall back to internal ref
  const resolvedRef = (ref as React.RefObject<HTMLDivElement>) || timelineRef;
  
  // Track labels
  const trackLabels = [
    "Video",
    "Text",
    "Audio",
    "Effects",
    "Format",
    "Other"
  ];

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
        return "from-fuchsia-700 to-fuchsia-500";
      default:
        return "from-cre8r-violet-dark to-cre8r-violet";
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

  // Handle drag over for video dropping
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    target.style.backgroundColor = "rgba(139, 92, 246, 0.1)"; // Highlight drop zone
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    target.style.backgroundColor = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, trackIndex: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    target.style.backgroundColor = "";
    
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
      // Check if this is a video asset drop
      try {
        const assetData = e.dataTransfer.getData("application/json");
        if (assetData) {
          const asset = JSON.parse(assetData);
          
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
          } else {
            // This is a regular video asset drop
            const videoAsset = JSON.parse(assetData);
            
            const rect = resolvedRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const dropTime = (x / rect.width) * duration;
            
            onVideoAssetDrop?.(videoAsset, trackIndex, dropTime);
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
    };
  }, [handleTrimHandleMouseMove, handleTrimHandleMouseUp]);

  return (
    <div className="h-full flex flex-col bg-cre8r-gray-900 border-t border-cre8r-gray-700 select-none">
      <div className="flex items-center justify-between p-2 bg-cre8r-gray-800 border-b border-cre8r-gray-700">
        <div className="flex items-center gap-2">
          <button 
            className="p-1 hover:bg-cre8r-gray-700 rounded" 
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-minus"><path d="M5 12h14"/></svg>
          </button>
          <span className="text-xs text-cre8r-gray-300">{Math.round(zoom * 100)}%</span>
          <button 
            className="p-1 hover:bg-cre8r-gray-700 rounded" 
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
          <button
            className={`p-1 hover:bg-cre8r-gray-700 rounded text-xs ${thumbnailsVisible ? 'text-cre8r-violet' : 'text-cre8r-gray-400'}`}
            onClick={() => setThumbnailsVisible(!thumbnailsVisible)}
          >
            {thumbnailsVisible ? 'Hide Thumbnails' : 'Show Thumbnails'}
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
          onClick={handleTimelineClick}
        >
          {/* Time markers */}
          <div className="h-6 border-b border-cre8r-gray-700 relative mb-1">
            {generateTimeMarkers()}
          </div>

          {/* Tracks with labels */}
          <div className="flex flex-col gap-1">
            {Array.from({ length: trackCount }).map((_, index) => (
              <div key={index} className="flex">
                <div className="w-20 h-12 flex items-center justify-center bg-cre8r-gray-800 border-r border-cre8r-gray-700 text-xs text-cre8r-gray-300 font-medium">
                  {trackLabels[index] || `Track ${index + 1}`}
                </div>
                <div 
                  className="flex-1 h-12 bg-cre8r-gray-800 rounded-r border border-cre8r-gray-700 relative"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {clips.filter(clip => clip.track === index).map((clip) => (
                    <div
                      key={clip.id}
                      className={cn(
                        "video-timeline-marker absolute h-10 my-1 rounded overflow-hidden cursor-pointer hover:opacity-100 transition-opacity",
                        selectedClipId === clip.id ? "ring-2 ring-cre8r-violet opacity-100" : "opacity-90 hover:ring-1 hover:ring-white"
                      )}
                      style={{
                        left: `${(clip.start / duration) * 100}%`,
                        width: `${((clip.end - clip.start) / duration) * 100}%`,
                        ...getThumbnailStyle(clip)
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClipSelect?.(clip.id);
                      }}
                      title={clip.name || "Edit"}
                    >
                      <div className={`h-full w-full bg-gradient-to-r ${getClipStyle(clip.type)} flex items-center justify-center px-2 bg-opacity-70`}>
                        <span className="text-xs text-white truncate font-medium">
                          {clip.name || formatTime(clip.end - clip.start)}
                        </span>
                      </div>
                      
                      {/* Left trim handle */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-3 hover:bg-white hover:bg-opacity-30 cursor-w-resize z-10"
                        onMouseDown={(e) => handleTrimHandleMouseDown(e, clip.id, 'start')}
                        title="Trim start"
                      >
                        <div className="h-full w-1 bg-white opacity-60 mx-auto"></div>
                      </div>
                      
                      {/* Right trim handle */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-3 hover:bg-white hover:bg-opacity-30 cursor-e-resize z-10"
                        onMouseDown={(e) => handleTrimHandleMouseDown(e, clip.id, 'end')}
                        title="Trim end"
                      >
                        <div className="h-full w-1 bg-white opacity-60 mx-auto"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Playhead */}
          <Playhead timelineRef={resolvedRef} />
        </div>
      </div>
    </div>
  );
});

Timeline.displayName = "Timeline";

export default Timeline;
