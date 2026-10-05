// export function getApiUrl() {
//   let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
//   url = url.trim().replace(/\/+$/, "");
//   if (!url.endsWith("/api")) {
//     url += "/api";
//   }
//   return url;
// }


export function getApiUrl() {
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:5000/api";
  }

  let url = process.env.NEXT_PUBLIC_API_URL || process.env.INTERNAL_API_URL;

  if (!url) {
    url = typeof window !== "undefined" || process.env.NODE_ENV === "production"
      ? "https://stylishtrend-multi-backend.vercel.app/api"
      : "http://localhost:5000/api";
  }

  url = url.trim().replace(/\/+$/, "");

  if (!url.endsWith("/api")) {
    url += "/api";
  }

  return url;
}