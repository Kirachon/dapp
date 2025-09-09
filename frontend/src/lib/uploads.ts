"use client";

// Note: In production build we avoid Session.fetch typing issues by using native fetch.
// Auth headers are handled by API for upload-url flow; direct /upload uses cookie/header if present.


export function getApiBase(): string {
  const full = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/graphql";
  try {
    const u = new URL(full);
    const base = full.endsWith("/graphql") ? full.replace(/\/graphql$/, "") : `${u.origin}${u.pathname.replace(/\/$/, "")}`;
    return base || `${u.origin}`;
  } catch {
    return "http://localhost:8080";
  }
}

export type UploadResponse = {
  success: boolean;
  data?: { url: string; thumbnailUrl?: string; filename: string };
  error?: string;
};

export async function uploadPhotoDirect(formData: FormData): Promise<UploadResponse> {
  const apiBase = getApiBase();
  const url = `${apiBase}/api/photos/upload`;

  const resp = await fetch(url, {
    method: "POST",
    body: formData,
  });

  let json: any = null;
  try {
    json = await resp.json();
  } catch {
    return { success: false, error: `Invalid response (${resp.status})` };
  }

  if (!resp.ok) {
    return { success: false, error: json?.error || `Upload failed (${resp.status})` };
  }

  if (json?.success && json?.data) {
    return { success: true, data: json.data };
  }
  return { success: false, error: json?.error || "Upload failed" };
}

