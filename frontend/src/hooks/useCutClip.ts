import { useState } from "react";
import { cutClip, CutClipRequest, TimelineResponse } from "../api/apiClient";

export function useCutClip() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeCut = async (payload: CutClipRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await cutClip(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return { executeCut, loading, result, error };
} 