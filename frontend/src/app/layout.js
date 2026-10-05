import "./globals.css";

const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

import { getApiUrl } from "@/utils/getApiUrl";

export async function generateMetadata() {
  const apiUrl = getApiUrl();
  const defaultMetadata = {
    title: {
      default: "StylishTrend | Multi-Category E-Commerce Store",
      template: "%s | StylishTrend",
    },
    description: "Your trusted destination for quality products at great value. Discover everyday essentials, lifestyle products & more, delivered conveniently across Bangladesh.",
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://stylishtrend.com"),
    alternates: {
      canonical: "/",
    },
  };

  try {
    const res = await fetch(`${apiUrl}/settings`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data?.siteName) {
        defaultMetadata.title = {
          default: `${data.siteName} | E-Commerce Store`,
          template: `%s | ${data.siteName}`,
        };
      }
      if (data?.logo) {
        const iconSource = data.logo.startsWith("data:image/") ? data.logo : `${apiUrl}/settings/logo`;
        defaultMetadata.icons = {
          icon: iconSource,
          shortcut: iconSource,
          apple: iconSource,
        };
      }
    }
  } catch {
    // Quiet fallback if backend is unreachable during SSR
  }

  return defaultMetadata;
}

import Providers from "@/components/Providers";
import MainLayout from "@/layouts/MainLayout";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
