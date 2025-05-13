
import { useState, useRef, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Download, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import UndoIcon from "@/components/icons/UndoIcon";
import RedoIcon from "@/components/icons/RedoIcon";
import { useEditorStore } from "@/store/editorStore";

interface VideoPlayerProps {
  src?: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  className?: string;
  rightControl?: React.ReactNode;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({
  src,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  className,
  rightControl
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);
  
  // Get undo/redo functions from store
  const { undo, redo, history } = useEditorStore();
  
  // Use the forwarded ref or fall back to internal ref
  const resolvedRef = (ref as React.RefObject<HTMLVideoElement>) || videoRef;

  // Update video currentTime when prop changes (e.g., from timeline)
  useEffect(() => {
    const video = resolvedRef.current;
    if (video && Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime, resolvedRef]);

  // Toggle play/pause
  const togglePlayPause = () => {
    const video = resolvedRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Toggle mute
  const toggleMute = () => {
    const video = resolvedRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const video = resolvedRef.current;
    if (!video) return;
    
    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0 && !isMuted) {
      setIsMuted(true);
      video.muted = true;
    } else if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      video.muted = false;
    }
  };

  // Auto-hide controls after inactivity
  const showControls = () => {
    setIsControlsVisible(true);
    
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = window.setTimeout(() => {
      setIsControlsVisible(false);
    }, 3000);
  };

  // Setup initial event listeners
  useEffect(() => {
    const video = resolvedRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const handleDurationChange = () => {
      onDurationChange(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("ended", handleEnded);

    showControls();

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("ended", handleEnded);
      
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [onTimeUpdate, onDurationChange, resolvedRef]);

  return (
    <div 
      className={cn("relative bg-black flex items-center justify-center", className)}
      onMouseMove={showControls}
    >
      {src ? (
        <video 
          ref={resolvedRef}
          className="max-h-full max-w-full"
          src={src}
          onClick={togglePlayPause}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="flex flex-col items-center justify-center text-cre8r-gray-400 h-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-30"><path d="m10 7 5 3-5 3z"></path><rect width="20" height="14" x="2" y="3" rx="2"></rect><path d="M22 17v4"></path><path d="M2 17v4"></path></svg>
          <p>No video selected</p>
          <p className="text-sm mt-2">Upload or select a video to start editing</p>
        </div>
      )}

      {/* Video controls overlay */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity",
          isControlsVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Updated control bar with centered play/pause and timecode */}
        <div className="grid grid-cols-3 items-center mb-2">
          {/* Left section - Undo/Redo */}
          <div className="flex items-center gap-2">
            {/* Undo button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              onClick={undo}
              disabled={history.past.length === 0}
            >
              <UndoIcon className="h-5 w-5" />
            </Button>
            
            {/* Redo button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              onClick={redo}
              disabled={history.future.length === 0}
            >
              <RedoIcon className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Center section - Play/Pause and Timecode */}
          <div className="flex items-center justify-center gap-2">
            {/* Play/Pause button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            {/* Timecode display (rightControl) */}
            {rightControl && <div>{rightControl}</div>}
          </div>

          {/* Right section - Volume, Download, Settings */}
          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="h-1"
                />
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            >
              <Download className="h-5 w-5" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
