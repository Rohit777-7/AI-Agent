// The widget opens these paths on the customer's site, so only allow pages
// ("/pricing"), sections ("#contact") and http(s) links: never "javascript:",
// "data:" or protocol-relative "//other-site.com".
export const isSafePagePath = (path) => {
  if (typeof path !== "string" || !path) return false;
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  if (path.startsWith("#")) return true;
  if (path.startsWith("/")) return !path.startsWith("//") && !path.startsWith("/\\");

  try {
    const url = new URL(path);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};
