import { useState } from "react";
import { removeClip, RemoveClipRequest, TimelineResponse } from "../api/apiClient";

export function useRemoveClip() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeRemove = async (payload: RemoveClipRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await removeClip(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return { executeRemove, loading, result, error };
} 