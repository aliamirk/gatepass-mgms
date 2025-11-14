import axios from "axios";

// Base API URL
const BASE_URL = "http://13.235.111.187:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface GatePassCreate {
  person_name: string;
  description: string;
  is_returnable?: boolean;
}

export interface StatusHistoryItem {
  status: string;
  changed_at: string;
  changed_by: string;
}

export interface GatePassOut {
  id: string;
  number: string;
  person_name: string;
  description: string;
  created_by: string;
  is_returnable: boolean;
  status: string;
  status_history?: StatusHistoryItem[];
  created_at: string;
  approved_at?: string | null;
  exit_photo_id?: string | null;
  return_photo_id?: string | null;
  exit_time?: string | null;
  return_time?: string | null;
  qr_code_url?: string | null;
}

export interface PhotoItem {
  photo_id: string;
  gatepass_id: string;
  file_url: string;
  type: "exit" | "return";
  captured_at: string;
  captured_by: string;
  pass_number: string;
  _id: string;
}

export interface GatePassPhotoResponse {
  pass_number: string;
  photos: PhotoItem[];
  total: number;
}

// -------------------------------- API Functions -------------------------------------------

export const createGatepass = async (data: GatePassCreate): Promise<GatePassOut> => {
  const response = await api.post<GatePassOut>("/hr/gatepass/create", data);  
  return response.data;
};

export const listMyGatepasses = async (status?: string): Promise<GatePassOut[]> => {
  const response = await api.get<GatePassOut[]>("/hr/gatepass/list", {
    params: status ? { status } : {},
  });
  return response.data;
};

export const getGatepassDetail = async (pass_id: string): Promise<GatePassOut> => {
  const response = await api.get<GatePassOut>(`/hr/gatepass/${pass_id}`);
  return response.data;
};

export const printGatepass = async (pass_id: string): Promise<Blob> => {
  const response = await api.get(`/hr/gatepass/${pass_id}/print`, {
    responseType: "blob",
  });
  return response.data;
};


export async function getGatePassPhotos(
  pass_number: string
): Promise<{ photo_id: string; type: "exit" | "return" }[]> {
  try {
    const res = await api.get(`/gate/photos/${pass_number}`);

    const data = res.data;

    // If no photos array → return empty array
    if (!data?.photos || !Array.isArray(data.photos)) {
      return [];
    }

    // Map only required fields
    return data.photos.map((p: any) => ({
      photo_id: p.photo_id,
      type: p.type,
    }));

  } catch (err: any) {
    console.error("Error fetching gatepass photos:", err.response?.data || err);
    throw err;
  }
}


export async function getGatePassPhotoFile(
  photo_id: string
): Promise<Blob> {
  try {
    const res = await api.get(`/media/photo/${photo_id}`, {
      responseType: "blob", // IMPORTANT!
    });
    return res.data;
  } catch (err: any) {
    console.error("Error fetching photo:", err.response?.data || err);
    throw err;
  }
}