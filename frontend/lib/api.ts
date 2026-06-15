"use client";

import { clearToken, getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers
    });
    return response;
  } catch (err: any) {
    // Network error: backend unreachable
    throw new ApiError(
      "Cannot connect to the backend server. Please make sure the API is running on http://localhost:8000.",
      0
    );
  }
}

async function parseApiError(response: Response, fallback: string, skipClearToken = false): Promise<never> {
  if (response.status === 401) {
    // Try to get the actual error message from the server first
    try {
      const body = await response.json();
      const msg = body.detail || fallback;
      if (!skipClearToken) {
        clearToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new ApiError("Session expired. Please login again.", 401);
      }
      throw new ApiError(msg, 401);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (!skipClearToken) {
        clearToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      throw new ApiError(skipClearToken ? fallback : "Session expired. Please login again.", 401);
    }
  }
  try {
    const body = await response.json();
    throw new ApiError(body.detail || fallback, response.status);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(fallback, response.status);
  }
}

export async function login(username: string, password: string): Promise<{ access_token: string }> {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    await parseApiError(response, "Invalid username or password", true);
  }
  return response.json();
}

export async function register(username: string, password: string): Promise<{ access_token: string }> {
  const response = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    await parseApiError(response, "Registration failed", true);
  }
  return response.json();
}

export async function createScan(payload: {
  target_url: string;
  scope_mode: "authorized" | "lab";
  authorization_ack: boolean;
  advanced_mode?: boolean;
  generate_poc: boolean;
  ai_instructions?: string;
  notes?: string;
}): Promise<{ scan_id: string; status: string }> {
  const response = await request("/scans", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await parseApiError(response, "Create scan failed");
  }
  return response.json();
}

export async function getScan(scanId: string): Promise<any> {
  const response = await request(`/scans/${scanId}`);
  if (!response.ok) {
    await parseApiError(response, "Scan fetch failed");
  }
  return response.json();
}

export async function getFindings(scanId: string): Promise<any> {
  const response = await request(`/scans/${scanId}/findings`);
  if (!response.ok) {
    await parseApiError(response, "Findings fetch failed");
  }
  return response.json();
}

export async function getScans(): Promise<any> {
  const response = await request("/scans");
  if (!response.ok) {
    await parseApiError(response, "Scans fetch failed");
  }
  return response.json();
}

export async function getTargets(): Promise<any> {
  const response = await request("/targets");
  if (!response.ok) {
    await parseApiError(response, "Targets fetch failed");
  }
  return response.json();
}

export async function getDashboardStats(): Promise<any> {
  const response = await request("/dashboard/stats");
  if (!response.ok) {
    await parseApiError(response, "Dashboard stats fetch failed");
  }
  return response.json();
}

export async function cancelScan(scanId: string): Promise<void> {
  const response = await request(`/scans/${scanId}/cancel`, { method: "POST" });
  if (!response.ok) {
    await parseApiError(response, "Cancel failed");
  }
}

export async function downloadReport(scanId: string, format: "json" | "pdf"): Promise<void> {
  const response = await request(`/reports/${scanId}.${format}`);
  if (!response.ok) {
    await parseApiError(response, "Download failed");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${scanId}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function getAISettings(): Promise<{ provider: string; api_key_set: boolean; model: string }> {
  const response = await request("/settings/ai");
  if (!response.ok) {
    await parseApiError(response, "Failed to load AI settings");
  }
  return response.json();
}

export async function saveAISettings(payload: {
  provider: string;
  api_key: string;
  model: string;
}): Promise<{ provider: string; api_key_set: boolean; model: string }> {
  const response = await request("/settings/ai", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await parseApiError(response, "Failed to save AI settings");
  }
  return response.json();
}
export async function createTarget(payload: { url: string; label?: string; notes?: string }): Promise<any> {
  const response = await request("/targets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await parseApiError(response, "Create target failed");
  }
  return response.json();
}

export async function deleteTarget(targetId: string): Promise<void> {
  const response = await request(`/targets/${targetId}`, { method: "DELETE" });
  if (!response.ok) {
    await parseApiError(response, "Delete target failed");
  }
}
