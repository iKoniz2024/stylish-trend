"use client";

import Link from 'next/link';

import { Phone, MapPin, Mail } from "lucide-react";
import useSettings from "@/hooks/useSettings";
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "All Products", to: "/products" },
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
];

const SERVICES_LINKS = [
  { label: "Refund and Returns Policy", to: "/return-policy" },
  { label: "Terms & Conditions", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Delivery Rules", to: "/delivery-rules" },
];

export default function Footer() {
  const {
    siteName,
    logo,
    contactEmail,
    contactPhone,
    address,
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    youtubeUrl,
  } = useSettings();

  const formatExternalUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const socialLinks = [
    { icon: FaFacebookF, href: formatExternalUrl(facebookUrl), label: "Facebook" },
    { icon: FaInstagram, href: formatExternalUrl(instagramUrl), label: "Instagram" },
    { icon: FaTiktok, href: formatExternalUrl(tiktokUrl), label: "TikTok" },
    { icon: FaYoutube, href: formatExternalUrl(youtubeUrl), label: "YouTube" },
  ];

  return (
    <footer className="border-t border-zinc-800 bg-black text-white dark:bg-black dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo & Description */}
          <div className="space-y-4">
            {logo && (
              <Link href="/" className="inline-block">
                <img src={logo} alt={siteName} className="h-20 sm:h-28 w-auto object-contain" />
              </Link>
            )}
            <p suppressHydrationWarning className="text-sm leading-relaxed text-zinc-300 dark:text-zinc-400 font-medium">
              {siteName} — your trusted destination for quality products, fashion, electronics, lifestyle & everyday essentials, delivered conveniently across Bangladesh.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.to}
                    className="text-sm text-zinc-300 font-medium transition-colors duration-200 hover:text-white dark:text-zinc-400 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services & Help */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Services & Help
            </h3>
            <ul className="space-y-2.5">
              {SERVICES_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.to}
                    className="text-sm text-zinc-300 font-medium transition-colors duration-200 hover:text-white dark:text-zinc-400 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Icons & Contact Info Column */}
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                const href = social.href || "#";
                return (
                  <a
                    key={social.label}
                    href={href}
                    target={social.href ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-black shadow-2xs"
                  >
                    <Icon size={14} />
                  </a>
                );
              })}
            </div>
            <div className="space-y-2.5 text-sm text-zinc-300 font-medium dark:text-zinc-400">
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 transition-colors hover:text-white">
                  <Mail className="size-4 shrink-0 text-white" />
                  {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="flex items-center gap-2 transition-colors hover:text-white">
                  <Phone className="size-4 shrink-0 text-white" />
                  {contactPhone}
                </a>
              )}
              {address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-white" />
                  <span>{address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Strip */}
      <div className="border-t border-zinc-800 bg-black dark:bg-black">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
          <p suppressHydrationWarning className="text-xs font-semibold text-zinc-400">
            &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs font-semibold text-zinc-400">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
