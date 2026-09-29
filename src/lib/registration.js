export function validateLumaEventUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      !["luma.com", "lu.ma"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port ||
      !url.pathname.split("/").some(Boolean)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export const lumaEventUrl = validateLumaEventUrl(
  import.meta.env?.VITE_LUMA_EVENT_URL,
);
