"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../services/settings.api";

import { getApiUrl } from "../utils/getApiUrl";

const useSettings = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const apiUrl = getApiUrl();
  const logo = data?.logo || null;

  useEffect(() => {
    if (typeof document !== "undefined") {
      let iconLinks = document.querySelectorAll("link[rel*='icon']");
      if (logo) {
        const iconUrl = logo.startsWith("data:image/") || logo.startsWith("http")
          ? logo
          : `${apiUrl}/settings/logo`;

        if (iconLinks.length > 0) {
          iconLinks.forEach((link) => {
            if (link && link.href !== iconUrl) link.href = iconUrl;
          });
        } else {
          const link = document.createElement("link");
          link.rel = "icon";
          link.href = iconUrl;
          document.head.appendChild(link);
        }
      } else {
        // Instead of removing the link (which causes React runtime errors since React tracks it),
        // we reset it to the default Next.js favicon if needed, or simply do nothing.
        iconLinks.forEach((link) => {
          if (link && link.href) {
            // Setting a fallback or ignoring, removing breaks React.
            if (!link.href.includes('/favicon.ico')) {
              link.href = '/favicon.ico';
            }
          }
        });
      }
    }
  }, [logo, apiUrl]);

  return {
    siteName: data?.siteName || "",
    logo,
    contactEmail: data?.contactEmail || "",
    contactPhone: data?.contactPhone || "",
    address: data?.address || "",
    googleMapLink: data?.googleMapLink || "",
    facebookUrl: data?.facebookUrl || "",
    instagramUrl: data?.instagramUrl || "",
    tiktokUrl: data?.tiktokUrl || "",
    youtubeUrl: data?.youtubeUrl || "",
    metaPixelName: data?.metaPixelName || "",
    metaPixelId: data?.metaPixelId || "",
    metaAccessToken: data?.metaAccessToken || "",
    metaTestEventCode: data?.metaTestEventCode || "",
    metaPixels: data?.metaPixels || [],
    isLoading,
  };
};

export default useSettings;
