
import React, { useRef, useEffect, useState } from 'react';
import { useCurrentTime, useDuration, useEditorStore } from '@/store/editorStore';

interface PlayheadProps {
  timelineRef: React.RefObject<HTMLDivElement>;
}

const Playhead: React.FC<PlayheadProps> = ({ timelineRef }) => {
  const currentTime = useCurrentTime();
  const duration = useDuration();
  const setCurrentTime = useEditorStore(state => state.setCurrentTime);
  
  const [isDragging, setIsDragging] = useState(false);
  const requestRef = useRef<number>();
  const positionRef = useRef<number>(0);
  
  const updatePlayheadPosition = () => {
    if (!timelineRef.current || duration <= 0) return 0;
    
    const timelineWidth = timelineRef.current.clientWidth;
    const position = (currentTime / duration) * timelineWidth;
    positionRef.current = position;
    return position;
  };
  
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = (x / rect.width) * duration;
      setCurrentTime(Math.max(0, Math.min(duration, newTime)));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, setCurrentTime, timelineRef]);
  
  // Animate playhead using requestAnimationFrame
  useEffect(() => {
    const animate = () => {
      updatePlayheadPosition();
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [currentTime, duration]);
  
  const playheadPosition = updatePlayheadPosition();
  
  return (
    <div 
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 cursor-ew-resize"
      style={{ transform: `translateX(${playheadPosition}px)` }}
      onMouseDown={handlePlayheadMouseDown}
    >
      <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 -mt-1.5 absolute top-6"></div>
    </div>
  );
};

export default Playhead;
