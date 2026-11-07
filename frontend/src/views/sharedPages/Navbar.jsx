"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import { Search, ShoppingCart, Sun, Moon, Menu, X, Phone, Package, House, Store, TrendingUp, Zap, Sparkles, LayoutGrid, ChevronDown, User, LogOut, LayoutDashboard, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import useCart from "@/hooks/useCart";
import useTheme from "@/hooks/useTheme";
import { getCategoriesWithCounts } from "@/services/category.api";
import { buildCategoryTree } from "@/utils/categoryTree";
import useSettings from "@/hooks/useSettings";
import { getLocalCartCount } from "@/utils/localCart";
import { useAuth } from "@/hooks/useAuth";

import { getProducts } from "@/services/product.api";
import { formatBDT } from "@/utils/currency";

import BottomNav from "@/components/shared/BottomNav";

const Navbar = () => {
    const { cartCount, refetchCartCount } = useCart();
    const { theme, toggleTheme } = useTheme();
    const { siteName, logo, contactPhone } = useSettings();
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [search, setSearch] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [mobileCatOpen, setMobileCatOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const { data: categoriesData } = useQuery({
        queryKey: ["categories-with-counts"],
        queryFn: getCategoriesWithCounts,
        staleTime: 1000 * 60 * 1, // 1 minute cache
        gcTime: 1000 * 60 * 30,
    });

    const categoriesList = useMemo(() => {
        const raw = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.categories || []);
        return buildCategoryTree(raw);
    }, [categoriesData]);

    const [isPending, startTransition] = useTransition();

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        const query = search.trim();
        startTransition(() => {
            if (query) {
                router.push(`/products?search=${encodeURIComponent(query)}`);
            } else {
                router.push(`/products`);
            }
        });
        setMobileOpen(false);
    };

    useEffect(() => {
        refetchCartCount(getLocalCartCount());
        setMounted(true);
    }, [refetchCartCount]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlSearch = new URLSearchParams(window.location.search).get("search") || "";
            setSearch(urlSearch);
        }
        setMobileOpen(false);
        setMobileSearchOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (mobileOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [mobileOpen]);

    return (
        <>
            <header className="sticky top-0 z-100 bg-[#0a0a0d] text-white border-b border-white/[0.08] shadow-md dark:bg-[#0a0a0d] dark:text-white dark:border-white/[0.08] backdrop-blur-md">
            {/* Top Header */}
            <div className="bg-[#0a0a0d]/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-3 sm:px-4 gap-2 sm:gap-4">
                    {/* Left: Menu Icon (Mobile & Tablet) & Logo */}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="flex lg:hidden size-9 sm:size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white transition-all hover:bg-white/[0.12] active:scale-95 cursor-pointer"
                            title="Open Menu"
                            aria-label="Open Menu"
                        >
                            <Menu className="size-5 sm:size-6 text-white" />
                        </button>

                        <Link href="/" className="flex items-center shrink-0">
                            {logo ? (
                                <img src={logo} alt={siteName || "Logo"} className="h-8 sm:h-12 w-auto object-contain" />
                            ) : siteName ? (
                                <span suppressHydrationWarning className="text-lg sm:text-2xl font-black text-white tracking-tight truncate max-w-[150px] sm:max-w-none">
                                    {siteName}
                                </span>
                            ) : null}
                        </Link>
                    </div>

                    {/* Desktop & Tablet Search Bar */}
                    <div className="hidden flex-1 max-w-2xl sm:block mx-2 sm:mx-4">
                        <form onSubmit={handleSearchSubmit} className="flex items-center w-full rounded-full border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.09] p-1 focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-400/20 focus-within:bg-white/[0.09] transition-all shadow-inner">
                            <input
                                type="text"
                                placeholder="Search products, fashion, electronics..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-8 bg-transparent pl-4 pr-2 text-xs sm:text-sm text-white placeholder:text-zinc-400 outline-none font-medium"
                            />
                            <button
                                type="submit"
                                className="flex h-8 px-5 shrink-0 items-center gap-1.5 justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                title="Search"
                            >
                                <Search className="size-3.5 text-black" />
                                <span>Search</span>
                            </button>
                        </form>
                    </div>

                    {/* Right Utilities */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Mobile & Tablet Search Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((prev) => !prev)}
                            className="flex sm:hidden size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white transition-all hover:bg-white/[0.12] active:scale-95 cursor-pointer"
                            title="Search"
                            aria-label="Toggle Search"
                        >
                            <Search className="size-4.5 text-white" />
                        </button>

                        <Link
                            href="/orders"
                            className="hidden items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 text-xs font-semibold text-zinc-200 hover:text-white transition-all md:flex shrink-0 shadow-xs hover:border-white/20 group"
                        >
                            <Package className="size-4 shrink-0 text-amber-400" />
                            <span>Track Order</span>
                        </Link>

                        {mounted && contactPhone && (
                            <a
                                href={`tel:${contactPhone}`}
                                className="hidden items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 text-xs font-semibold text-zinc-200 hover:text-white transition-all md:flex shrink-0 shadow-xs hover:border-white/20"
                            >
                                <Phone className="size-4 shrink-0 text-zinc-400" />
                                <span>{contactPhone}</span>
                            </a>
                        )}

                        <div className="hidden h-5 w-px bg-white/10 md:block" />

                        <button
                            onClick={toggleTheme}
                            className="hidden sm:flex size-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white transition-all hover:scale-105 cursor-pointer"
                            title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {mounted && theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-zinc-300" />}
                        </button>

                        {(!user || (user.role !== "admin" && user.role !== "vendor")) && (
                            <Link
                                href="/cart"
                                className="relative flex size-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white transition-all hover:scale-105"
                            >
                                <ShoppingCart className="size-4.5 text-white" />
                                {mounted && cartCount > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-[10px] shadow-md ring-2 ring-black">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        {mounted && (
                            user ? (
                                <div ref={profileRef} className="relative group/profile">
                                    <button
                                        onClick={() => setProfileOpen((prev) => !prev)}
                                        className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 text-black text-sm font-black shadow-md ring-2 ring-white/20 transition-all duration-200 hover:scale-105 cursor-pointer"
                                        title="Account Menu"
                                    >
                                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                    </button>
                                    <div
                                        className={`transition-all duration-200 absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-border bg-card p-2.5 shadow-2xl text-foreground ${profileOpen
                                            ? "visible opacity-100 scale-100"
                                            : "invisible opacity-0 scale-95 group-hover/profile:visible group-hover/profile:opacity-100 group-hover/profile:scale-100"
                                            }`}
                                    >
                                        <div className="px-3 py-2.5 border-b border-border mb-1.5">
                                            <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                        </div>
                                        <Link
                                            href={user?.role === "vendor" ? "/dashboard/vendor" : "/dashboard"}
                                            onClick={() => setProfileOpen(false)}
                                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-primary transition-colors"
                                        >
                                            <LayoutDashboard className="size-4 text-primary" />
                                            <span>Dashboard</span>
                                        </Link>
                                        <Link
                                            href="/dashboard/profile"
                                            onClick={() => setProfileOpen(false)}
                                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-primary transition-colors"
                                        >
                                            <User className="size-4 text-primary" />
                                            <span>Profile</span>
                                        </Link>
                                        <button
                                            onClick={async () => {
                                                setProfileOpen(false);
                                                await logout();
                                                router.push("/");
                                            }}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer mt-1"
                                        >
                                            <LogOut className="size-4 text-destructive" />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="inline-flex rounded-full bg-white hover:bg-amber-400 text-black px-4.5 sm:px-5 py-1.5 sm:py-2 text-xs font-black transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    Login
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Expandable Search Bar */}
            {mobileSearchOpen && (
                <div className="sm:hidden border-t border-white/[0.08] bg-[#0a0a0d] px-3 py-2.5 transition-all">
                    <form onSubmit={handleSearchSubmit} className="flex items-center w-full rounded-full border border-white/10 bg-white/[0.06] p-1">
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="w-full h-7 bg-transparent pl-3 pr-2 text-xs text-white placeholder:text-zinc-400 outline-none"
                        />
                        <button
                            type="submit"
                            className="flex h-7 px-4 shrink-0 items-center gap-1 justify-center rounded-full bg-amber-400 text-black text-xs font-bold shadow-xs cursor-pointer hover:bg-amber-300"
                        >
                            <Search className="size-3.5 text-black" />
                            <span>Search</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Second Navigation Bar (Desktop Only - Luxury Obsidian & Clean Pill Accents) */}
            <nav className="hidden lg:block bg-[#08080a] border-t border-white/[0.05] border-b border-white/[0.07] shadow-xs">
                <div className="relative mx-auto max-w-7xl px-4">
                    <div className="flex h-11 sm:h-12 items-center justify-between">
                        {/* Left: Refined Pill Navigation Links */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Link
                                href="/"
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    pathname === "/"
                                        ? "bg-white/10 text-white font-bold border border-white/15 shadow-inner"
                                        : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                                }`}
                            >
                                <House className="size-3.5" />
                                <span>Home</span>
                            </Link>

                            <Link
                                href="/products"
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    pathname === "/products"
                                        ? "bg-white/10 text-white font-bold border border-white/15 shadow-inner"
                                        : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                                }`}
                            >
                                <Store className="size-3.5" />
                                <span>Shop Products</span>
                            </Link>

                            <Link
                                href="/best-selling"
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    pathname === "/best-selling"
                                        ? "bg-white/10 text-white font-bold border border-white/15 shadow-inner"
                                        : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                                }`}
                            >
                                <TrendingUp className="size-3.5" />
                                <span>Best Selling</span>
                            </Link>

                            <Link
                                href="/flash-sale"
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    pathname === "/flash-sale"
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-inner"
                                        : "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                }`}
                            >
                                <Zap className="size-3.5 fill-rose-500 text-rose-500 animate-pulse" />
                                <span>Flash Deals</span>
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white uppercase tracking-wider shadow-xs">
                                    HOT
                                </span>
                            </Link>
                        </div>

                        {/* Right: Luxury Gold Accent Become a Seller Button */}
                        <div className="flex items-center gap-2.5">
                            <Link
                                href="/become-seller"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border border-amber-400/40 text-amber-300 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.25)] text-xs font-bold transition-all hover:scale-105 cursor-pointer shadow-xs group/seller"
                            >
                                <Sparkles className="size-3.5 text-amber-400 group-hover/seller:rotate-12 transition-transform" />
                                <span>Become a Seller</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
        </header>

        {/* Mobile & Tablet Drawer */}
        {mounted && mobileOpen && createPortal(
            <div className="fixed inset-0 z-[200] lg:hidden">
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                />
                <div className="fixed inset-y-0 left-0 flex flex-col w-[310px] sm:w-80 max-w-[85vw] h-full h-dvh max-h-dvh bg-card text-card-foreground shadow-2xl border-r border-border z-10 animate-in slide-in-from-left duration-250 ease-out overflow-hidden">
                    {/* 1. Header (Fixed at top) */}
                    <div className="shrink-0 flex items-center justify-between border-b border-border px-5 py-4 bg-card">
                        <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center">
                            {logo ? (
                                <img src={logo} alt={siteName || "Logo"} className="h-8 w-auto object-contain" />
                            ) : siteName ? (
                                <span suppressHydrationWarning className="text-lg font-black text-primary dark:text-accent">
                                    {siteName}
                                </span>
                            ) : null}
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileOpen(false)}
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                            aria-label="Close menu"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* 2. Middle Scrollable Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
                        {/* Search */}
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary shadow-2xs"
                            />
                        </form>

                        {/* Nav Links */}
                        <nav className="space-y-1 border-t border-border pt-3">
                            <Link
                                href="/"
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                                    pathname === "/"
                                        ? "bg-primary/10 text-primary font-black"
                                        : "text-foreground hover:bg-muted hover:text-primary"
                                }`}
                            >
                                <House className="size-4 text-primary" /> Home
                            </Link>

                            <Link
                                href="/products"
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                                    pathname === "/products"
                                        ? "bg-primary/10 text-primary font-black"
                                        : "text-foreground hover:bg-muted hover:text-primary"
                                }`}
                            >
                                <Store className="size-4 text-primary" /> Shop Products
                            </Link>

                            <Link
                                href="/best-selling"
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                                    pathname === "/best-selling"
                                        ? "bg-primary/10 text-primary font-black"
                                        : "text-foreground hover:bg-muted hover:text-primary"
                                }`}
                            >
                                <TrendingUp className="size-4 text-primary" /> Best Selling
                            </Link>

                            <Link
                                href="/flash-sale"
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                                    pathname === "/flash-sale"
                                        ? "bg-primary/10 text-primary font-black"
                                        : "text-foreground hover:bg-muted hover:text-primary"
                                }`}
                            >
                                <Zap className="size-4 text-primary fill-primary/20" /> Flash Deals
                            </Link>

                            <Link
                                href="/orders"
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                                    pathname === "/orders"
                                        ? "bg-primary/10 text-primary font-black"
                                        : "text-foreground hover:bg-muted hover:text-primary"
                                }`}
                            >
                                <Package className="size-4 text-primary" /> Track Order
                            </Link>

                            <Link
                                href="/become-seller"
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                                    pathname === "/become-seller"
                                        ? "bg-primary/10 text-primary font-black"
                                        : "text-foreground hover:bg-muted hover:text-primary"
                                }`}
                            >
                                <Sparkles className="size-4 text-primary" /> Become a Seller
                            </Link>
                        </nav>

                        {/* Categories Section */}
                        {categoriesList && categoriesList.length > 0 && (
                            <div className="border-t border-border pt-3">
                                <button
                                    type="button"
                                    onClick={() => setMobileCatOpen((prev) => !prev)}
                                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <LayoutGrid className="size-4 text-primary" />
                                        <span>Categories</span>
                                    </div>
                                    <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${mobileCatOpen ? "rotate-180" : ""}`} />
                                </button>

                                {mobileCatOpen && (
                                    <div className="mt-1 ml-4 space-y-1 border-l-2 border-border pl-3 animate-in fade-in duration-150">
                                        {categoriesList.slice(0, 10).map((cat) => (
                                            <Link
                                                key={cat._id}
                                                href={`/products?category=${cat.slug || cat._id}`}
                                                onClick={() => setMobileOpen(false)}
                                                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                            >
                                                <span className="truncate">{cat.name}</span>
                                                {cat.totalProducts > 0 && (
                                                    <span className="text-[10px] text-muted-foreground/70">
                                                        {cat.totalProducts}
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                        <Link
                                            href="/products"
                                            onClick={() => setMobileOpen(false)}
                                            className="block px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:underline"
                                        >
                                            View All Categories →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. Footer (Fixed at bottom with safe-area spacing) */}
                    <div className="shrink-0 border-t border-border bg-card p-4 pb-8 sm:pb-5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                        {user ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground shadow-md shrink-0">
                                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                    </div>
                                    <div className="truncate flex-1 min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <Link
                                        href={user?.role === "vendor" ? "/dashboard/vendor" : "/dashboard"}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted/80 transition-all"
                                    >
                                        <LayoutDashboard className="size-3.5 text-primary" />
                                        <span>Dashboard</span>
                                    </Link>
                                    <Link
                                        href="/dashboard/profile"
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted/80 transition-all"
                                    >
                                        <User className="size-3.5 text-primary" />
                                        <span>Profile</span>
                                    </Link>
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setMobileOpen(false);
                                        await logout();
                                        router.push("/");
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
                                >
                                    <LogOut className="size-3.5 text-destructive" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setMobileOpen(false)}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/90 py-2.5 text-xs sm:text-sm font-black text-primary-foreground shadow-md transition-all active:scale-[0.98]"
                            >
                                <LogIn className="size-4" />
                                <span>Login / Register</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>,
            document.body
        )}

        <BottomNav onOpenMenu={() => setMobileOpen(true)} />
    </>
    );
};

export default Navbar;
