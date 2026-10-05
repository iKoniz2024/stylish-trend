"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSettings from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  ShoppingBag,
  Tags,
  Image as ImageIcon,
  ShoppingCart,
  Settings,
  User,
  Home,
  Store,
  ShieldCheck,
  Package,
  X
} from "lucide-react";

export default function Sidebar({ open, onClose }) {
  const { siteName, logo } = useSettings();
  const { user } = useAuth();
  const pathname = usePathname();

  const isVendor = user?.role === "vendor";

  const vendorMenuItems = [
    {
      name: "Store Dashboard",
      path: "/dashboard/vendor",
      icon: LayoutDashboard,
    },
    {
      name: "My Products",
      path: "/dashboard/products",
      icon: ShoppingBag,
    },
    {
      name: "Shop Profile",
      path: "/dashboard/profile",
      icon: User,
    },
    {
      name: "View Store Front",
      path: "/",
      icon: Home,
    },
  ];

  const adminMenuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Products",
      path: "/dashboard/products",
      icon: ShoppingBag,
    },
    {
      name: "Categories",
      path: "/dashboard/categories",
      icon: Tags,
    },
    {
      name: "Banners",
      path: "/dashboard/banners",
      icon: ImageIcon,
    },
    {
      name: "Customer Orders",
      path: "/dashboard/orders",
      icon: ShoppingCart,
    },
    {
      name: "Sellers & Vendors",
      path: "/dashboard/vendors",
      icon: Store,
    },
    {
      name: "Site Settings",
      path: "/dashboard/settings",
      icon: Settings,
    },
    {
      name: "Profile",
      path: "/dashboard/profile",
      icon: User,
    },
    {
      name: "View Store Front",
      path: "/",
      icon: Home,
    },
  ];

  const menuItems = isVendor ? vendorMenuItems : adminMenuItems;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-100 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-100 w-64 border-r border-border bg-card p-4 transition-transform duration-200 lg:static lg:translate-x-0 flex flex-col justify-between ${open ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div>
          {/* Logo & Close Header */}
          <div className="relative py-3 px-1 mb-4 flex items-center justify-between border-b border-border/60 min-h-[90px]">
            <Link href="/" onClick={onClose} className="flex items-center justify-center flex-1 transition-transform hover:scale-[1.02]">
              {logo ? (
                <img
                  src={logo}
                  alt={siteName || "Logo"}
                  className="h-16 max-h-20 w-auto max-w-[170px] object-contain mx-auto"
                />
              ) : (
                <span suppressHydrationWarning className="text-2xl font-black text-foreground tracking-tight text-center">
                  {siteName || "StylishTrend"}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="flex lg:hidden size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0 ml-1"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Role Header Badge */}
          {isVendor ? (
            <div className="mb-4 rounded-xl bg-secondary border border-border p-2.5 flex items-center gap-2.5 text-primary">
              <Store className="size-4 shrink-0 text-primary" />
              <div className="truncate">
                <p className="text-[11px] font-black uppercase tracking-wider text-primary">Vendor Portal</p>
                <p className="text-xs font-bold text-foreground truncate">{user?.vendorInfo?.shopName || user?.name}</p>
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-xl bg-secondary border border-border p-2.5 flex items-center gap-2.5 text-primary">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <div className="truncate">
                <p className="text-[11px] font-black uppercase tracking-wider text-primary">Admin Panel</p>
                <p className="text-xs font-bold text-foreground truncate">{user?.name || "Administrator"}</p>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                item.path === "/dashboard" || item.path === "/dashboard/vendor"
                  ? pathname === item.path
                  : pathname.startsWith(item.path);

              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className={`size-4.5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-border/60 px-2 text-[11px] text-muted-foreground text-center">
          <p>© {new Date().getFullYear()} {siteName}</p>
        </div>
      </aside>
    </>
  );
}
