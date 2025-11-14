import axios from "axios";

// Base API URL
const BASE_URL = "http://3.7.253.28:8000";

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
