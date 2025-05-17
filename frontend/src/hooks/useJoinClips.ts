import { useState } from "react";
import { joinClips, JoinClipsRequest, TimelineResponse } from "../api/apiClient";

export function useJoinClips() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeJoin = async (payload: JoinClipsRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await joinClips(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return { executeJoin, loading, result, error };
} 