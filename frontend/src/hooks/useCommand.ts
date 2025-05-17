import { useState } from "react";
import { useToast } from "./use-toast";
import { sendCommand, CommandRequest, CommandResponse } from "../api/apiClient";

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

export const useCommand = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const executeCommand = async (commandText: string, timeline: any) => {
    if (!commandText.trim()) return null;
    setIsProcessing(true);
    setError(null);
    setLogs([]);
    setLastResult(null);

    try {
      const res = await sendCommand({ command: commandText, timeline });
      setLastResult(res.data);
      setLogs(res.data.logs || []);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      setError(msg);
      toast({
        title: "Error processing command",
        description: msg,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    executeCommand,
    isProcessing,
    lastResult,
    logs,
    error,
  };
};
