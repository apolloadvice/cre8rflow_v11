import { useState } from "react";
import { trimClip, TrimClipRequest, TimelineResponse } from "../api/apiClient";

export function useTrimClip() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeTrim = async (payload: TrimClipRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await trimClip(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return { executeTrim, loading, result, error };
} 