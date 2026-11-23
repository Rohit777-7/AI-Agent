// "https://www.Example.com/shop" -> "example.com". Returns "" when unparseable.
export const hostnameOf = (value = "") => {
  const text = String(value).trim();
  if (!text) return "";

  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

// True when `host` is `domain` itself or one of its subdomains.
export const hostMatchesDomain = (host, domain) =>
  Boolean(host && domain) && (host === domain || host.endsWith(`.${domain}`));
