import { useState } from "react";
import { useToast } from "./use-toast";
import { sendCommand } from "@/api/apiClient";
import { useEditorStore } from "@/store/editorStore";

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
  const { activeVideoAsset } = useEditorStore();

  const executeCommand = async (commandText: string, timeline?: any) => {
    if (!commandText.trim()) return null;
    setIsProcessing(true);
    setError(null);
    setLogs([]);
    setLastResult(null);

    const assetPath = activeVideoAsset?.file_path;
    if (!assetPath || typeof assetPath !== "string") {
      throw new Error("No valid video asset selected");
    }

    try {
      const res = await sendCommand(assetPath, commandText);
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
