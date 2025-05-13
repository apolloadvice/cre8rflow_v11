
import { useState } from "react";
import { useToast } from "./use-toast";

export interface Operation {
  start_sec: number;
  end_sec: number;
  effect: "cut" | "fade" | "zoom" | "speed" | "textOverlay" | "caption" | "brightness" | "colorGrade";
  params?: Record<string, any>;
}

export interface CommandResult {
  operations: Operation[];
  videoUrl?: string; // For storing the processed video URL
}

export const useCommand = (projectId: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const { toast } = useToast();

  const executeCommand = async (commandText: string) => {
    if (!commandText.trim()) return null;
    
    setIsProcessing(true);
    
    try {
      // In a real implementation, this would call your backend API
      // const response = await fetch('/api/command', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     project_id: projectId,
      //     command_text: commandText,
      //     user_id: 'current-user-id', // This would come from auth context
      //     apply_immediately: true // This tells the backend to apply the edit immediately
      //   })
      // });
      // const result = await response.json();
      
      // For now, we'll simulate the API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Determine if this command should actually process the video or just add visual effects
      const shouldProcessVideo = commandRequiresProcessing(commandText);
      
      // Mock response based on command text
      const mockResult: CommandResult = {
        operations: simulateOperations(commandText)
      };
      
      // If this command should result in actual video processing, include a video URL
      if (shouldProcessVideo) {
        mockResult.videoUrl = simulateProcessedVideo(commandText);
      }
      
      setLastResult(mockResult);
      
      return mockResult;
    } catch (error) {
      toast({
        title: "Error processing command",
        description: "Failed to process your editing command",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to determine if a command should actually process video instead of just adding UI elements
  const commandRequiresProcessing = (commandText: string): boolean => {
    const lowerCommand = commandText.toLowerCase();
    
    // Commands that should actually process the video
    const processingCommands = [
      "cut", "trim", "remove", "delete",
      "speed", "slow", "fast",
      "crop", "resize",
      "rotate", "flip"
    ];
    
    return processingCommands.some(cmd => lowerCommand.includes(cmd));
  };
  
  // Function to simulate operations based on command text
  const simulateOperations = (commandText: string): Operation[] => {
    const lowerCommand = commandText.toLowerCase();
    
    if (lowerCommand.includes("cut") || lowerCommand.includes("remove")) {
      // Extract time information from the command
      let start = 0;
      let end = 5; // Default to first 5 seconds
      
      if (lowerCommand.includes("first")) {
        const match = lowerCommand.match(/first\s+(\d+)/);
        if (match && match[1]) {
          end = parseInt(match[1], 10);
          start = 0;
        }
      } else if (lowerCommand.includes("last")) {
        const match = lowerCommand.match(/last\s+(\d+)/);
        if (match && match[1]) {
          end = 60; // Assuming 60 seconds total
          start = end - parseInt(match[1], 10);
        }
      } else if (lowerCommand.includes("between")) {
        const match = lowerCommand.match(/between\s+(\d+)\s+and\s+(\d+)/);
        if (match && match[1] && match[2]) {
          start = parseInt(match[1], 10);
          end = parseInt(match[2], 10);
        }
      }
      
      return [
        { start_sec: start, end_sec: end, effect: "cut" }
      ];
    } else if (lowerCommand.includes("fade")) {
      return [
        { start_sec: 10, end_sec: 15, effect: "fade", params: { type: "in" } },
        { start_sec: 25, end_sec: 30, effect: "fade", params: { type: "out" } }
      ];
    } else if (lowerCommand.includes("caption") || lowerCommand.includes("subtitle")) {
      return [
        { start_sec: 0, end_sec: 60, effect: "caption", params: { style: "centered" } }
      ];
    } else if (lowerCommand.includes("color") || lowerCommand.includes("grade")) {
      return [
        { start_sec: 0, end_sec: 120, effect: "colorGrade", params: { style: "cinematic" } }
      ];
    } else {
      // Default operation
      return [
        { start_sec: 0, end_sec: 10, effect: "zoom", params: { scale: 1.2 } }
      ];
    }
  };
  
  // Function to simulate a processed video URL based on the command
  const simulateProcessedVideo = (commandText: string): string => {
    // In a real implementation, this would be a URL to the processed video
    // For now, we'll just return a mock URL with a timestamp to simulate uniqueness
    const timestamp = Date.now();
    const commandType = commandText.toLowerCase().includes("cut") ? "cut" : 
                       commandText.toLowerCase().includes("fade") ? "fade" : 
                       commandText.toLowerCase().includes("caption") ? "caption" : 
                       commandText.toLowerCase().includes("color") ? "color" : "edit";
                       
    // Use a sample video URL from a public source for testing
    return `https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4?${commandType}_${timestamp}`;
  };

  return {
    executeCommand,
    isProcessing,
    lastResult
  };
};
