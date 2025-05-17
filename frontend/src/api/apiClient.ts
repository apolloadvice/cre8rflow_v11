import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Base URL for the backend API
const API_BASE_URL = 'http://localhost:8000/api';

// --- Type Definitions ---

// Timeline operation request/response types (expand as needed)
export interface CutClipRequest {
  clip_name: string;
  timestamp: string;
  track_type?: string;
}

export interface TimelineResponse {
  success: boolean;
  message: string;
  timeline: any;
}

export interface PreviewExportRequest {
  timeline: any;
}

export interface TrimClipRequest {
  clip_name: string;
  timestamp: string;
  track_type?: string;
}

export interface JoinClipsRequest {
  first_clip_name: string;
  second_clip_name: string;
  track_type?: string;
}

export interface RemoveClipRequest {
  clip_name: string;
  track_type?: string;
}

export interface AddTextRequest {
  clip_name: string;
  text: string;
  position?: string;
  start: string;
  end: string;
  track_type?: string;
}

export interface OverlayAssetRequest {
  asset: string;
  position: string;
  start: string;
  end: string;
  track_type?: string;
}

export interface FadeClipRequest {
  clip_name: string;
  direction: string;
  start: string;
  end: string;
  track_type?: string;
}

export interface GroupCutRequest {
  target_type: string;
  timestamp: string;
  track_type?: string;
}

export interface CommandRequest {
  command: string;
  timeline: any;
}

export interface CommandResponse {
  result: string; // e.g., "success"
  message: string; // e.g., "Cut applied"
  logs?: string[]; // backend 'train of thought'
  timeline: any;   // updated timeline
}

// --- Generic API Request Handler ---
async function apiRequest<T = any>(
  url: string,
  method: AxiosRequestConfig['method'] = 'get',
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await axios({
      url: API_BASE_URL + url,
      method,
      data,
      ...config,
    });
    return response.data;
  } catch (error: any) {
    // Optionally, add more robust error handling/logging here
    if (error.response) {
      throw new Error(error.response.data?.detail || error.response.statusText);
    }
    throw error;
  }
}

// --- Timeline Operations ---
export const cutClip = (payload: CutClipRequest) =>
  apiRequest<TimelineResponse>('/timeline/cut', 'post', payload);

export const trimClip = (payload: TrimClipRequest) =>
  apiRequest<TimelineResponse>('/timeline/trim', 'post', payload);

export const joinClips = (payload: JoinClipsRequest) =>
  apiRequest<TimelineResponse>('/timeline/join', 'post', payload);

export const removeClip = (payload: RemoveClipRequest) =>
  apiRequest<TimelineResponse>('/timeline/remove_clip', 'post', payload);

export const addText = (payload: AddTextRequest) =>
  apiRequest<TimelineResponse>('/timeline/add_text', 'post', payload);

export const overlayAsset = (payload: OverlayAssetRequest) =>
  apiRequest<TimelineResponse>('/timeline/overlay', 'post', payload);

export const fadeClip = (payload: FadeClipRequest) =>
  apiRequest<TimelineResponse>('/timeline/fade', 'post', payload);

export const groupCut = (payload: GroupCutRequest) =>
  apiRequest<TimelineResponse>('/timeline/group_cut', 'post', payload);

// Add more timeline operations here (trim, join, remove, etc.)

// --- Preview/Export Operations ---
export const generatePreview = (payload: PreviewExportRequest) =>
  axios.post(API_BASE_URL + '/preview', payload, { responseType: 'blob' });

export const exportVideo = (payload: PreviewExportRequest, quality: 'high' | 'medium' | 'low' = 'high') =>
  axios.post(API_BASE_URL + `/export?quality=${quality}`, payload, { responseType: 'blob' });

// Expand with additional endpoints as needed

export const sendCommand = (payload: CommandRequest) =>
  axios.post<CommandResponse>(API_BASE_URL + '/command', payload);

export const uploadVideo = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(API_BASE_URL + "/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.file_path;
}; 