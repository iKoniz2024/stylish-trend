"use client";

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { Search, ShoppingCart, Sun, Moon, Menu, X, Phone, Package, House, Store, TrendingUp, Zap, Sparkles, LayoutGrid, ChevronDown, User, LogOut, LayoutDashboard, LogIn } from "lucide-react";
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
    }, [pathname]);

    return (
        <>
            <header className="sticky top-0 z-100 bg-black text-white border-b border-zinc-800 shadow-xs dark:bg-black dark:text-white dark:border-zinc-800">
            {/* Top Header */}
            <div className="bg-black dark:bg-black">
                <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-3 sm:px-4 gap-2 sm:gap-4">
                    {/* Left: Menu Icon (Mobile & Tablet) & Logo */}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="flex lg:hidden size-9 sm:size-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 cursor-pointer"
                            title="Open Menu"
                            aria-label="Open Menu"
                        >
                            <Menu className="size-5 sm:size-6 text-white" />
                        </button>

                        <Link href="/" className="flex items-center shrink-0">
                            {logo ? (
                                <img src={logo} alt={siteName || "Logo"} className="h-8 sm:h-12 w-auto object-contain" />
                            ) : siteName ? (
                                <span suppressHydrationWarning className="text-lg sm:text-2xl font-black text-white dark:text-accent tracking-tight truncate max-w-[150px] sm:max-w-none">
                                    {siteName}
                                </span>
                            ) : null}
                        </Link>
                    </div>

                    {/* Desktop & Tablet Search Bar */}
                    <div className="hidden flex-1 max-w-2xl sm:block mx-2 sm:mx-4">
                        <form onSubmit={handleSearchSubmit} className="flex items-center w-full rounded-full border border-white/20 bg-white/10 p-1 focus-within:border-white focus-within:bg-white/20 transition-all shadow-2xs">
                            <input
                                type="text"
                                placeholder="Search products, fashion, electronics..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-7 bg-transparent pl-4 pr-2 text-xs sm:text-sm text-white placeholder:text-white/70 outline-none"
                            />
                            <button
                                type="submit"
                                className="flex h-8 px-5 shrink-0 items-center gap-1.5 justify-center rounded-full btn-action-gold text-xs font-bold shadow-xs transition-all hover:scale-105 cursor-pointer"
                                title="Search"
                            >
                                <Search className="size-3.5 text-black dark:text-black" />
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
                            className="flex sm:hidden size-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 cursor-pointer"
                            title="Search"
                            aria-label="Toggle Search"
                        >
                            <Search className="size-4.5 text-white" />
                        </button>

                        <Link
                            href="/orders"
                            className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/20 md:flex shrink-0 shadow-2xs group"
                        >
                            <Package className="size-4 shrink-0 text-white" />
                            <span>Track Order</span>
                        </Link>

                        {mounted && contactPhone && (
                            <a
                                href={`tel:${contactPhone}`}
                                className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/20 md:flex shrink-0 shadow-2xs"
                            >
                                <Phone className="size-4 shrink-0 text-white" />
                                <span>{contactPhone}</span>
                            </a>
                        )}

                        <div className="hidden h-6 w-px bg-white/20 md:block" />

                        <button
                            onClick={toggleTheme}
                            className="hidden sm:flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 cursor-pointer"
                            title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {mounted && theme === "dark" ? <Sun className="size-4 text-white" /> : <Moon className="size-4 text-white" />}
                        </button>

                        {(!user || (user.role !== "admin" && user.role !== "vendor")) && (
                            <Link
                                href="/cart"
                                className="relative flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105"
                            >
                                <ShoppingCart className="size-4.5 text-white" />
                                {mounted && cartCount > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-white text-black dark:bg-white dark:text-black text-[10px] font-black shadow-md">
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
                                        className="flex size-9 items-center justify-center rounded-full bg-white text-black dark:bg-white dark:text-black text-sm font-black shadow-md ring-2 ring-white/30 transition-all duration-200 hover:scale-105 cursor-pointer"
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
                                    className="inline-flex rounded-full bg-white hover:bg-zinc-200 text-black px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-black transition-all duration-200 hover:scale-105 shadow-xs"
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
                <div className="sm:hidden border-t border-zinc-800 bg-zinc-950 dark:bg-black px-3 py-2.5 transition-all">
                    <form onSubmit={handleSearchSubmit} className="flex items-center w-full rounded-full border border-white/20 bg-white/10 p-1">
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="w-full h-7 bg-transparent pl-3 pr-2 text-xs text-white placeholder:text-white/70 outline-none"
                        />
                        <button
                            type="submit"
                            className="flex h-7 px-4 shrink-0 items-center gap-1 justify-center rounded-full bg-white text-black text-xs font-bold shadow-xs cursor-pointer hover:bg-zinc-200"
                        >
                            <Search className="size-3.5 text-black" />
                            <span>Search</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Second Navigation Bar (Desktop Only) */}
            <nav className="hidden border-t border-zinc-800 lg:block bg-black dark:bg-black dark:border-zinc-800">
                <div className="relative mx-auto max-w-7xl px-4">
                    <div className="flex h-12 sm:h-13 items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Link href="/" className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${pathname === "/" ? "bg-white text-black shadow-2xs" : "text-white hover:bg-white/10"}`}>
                                <House className={`size-4 ${pathname === "/" ? "text-black" : "text-white"}`} />
                                <span>Home</span>
                            </Link>

                            {/* Categories Mega Dropdown */}
                            <div className="group/cat">
                                <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-white/10 transition-all cursor-pointer">
                                    <LayoutGrid className="size-4 text-white" />
                                    <span>Categories</span>
                                    <ChevronDown className="size-3.5 text-white/70 group-hover/cat:rotate-180 transition-transform duration-200" />
                                </button>

                                {/* Mega Dropdown Menu */}
                                <div className="invisible opacity-0 group-hover/cat:visible group-hover/cat:opacity-100 transition-all duration-200 absolute left-4 right-4 top-full z-100 mt-1 rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 max-h-[420px] overflow-y-auto pr-1">
                                        {categoriesList && categoriesList.length > 0 ? (
                                            categoriesList.map((cat, idx) => (
                                                <div key={cat._id || `${cat.slug || 'cat'}-${idx}`} className="space-y-2">
                                                    <Link
                                                        href={`/products?category=${cat.slug}`}
                                                        className="block text-sm sm:text-base font-extrabold text-foreground hover:text-primary transition-colors truncate"
                                                    >
                                                        {cat.name}
                                                    </Link>
                                                    {cat.children && cat.children.length > 0 && (
                                                        <ul className="space-y-1.5 text-xs sm:text-sm text-muted-foreground font-medium">
                                                            {cat.children.map((child, cIdx) => (
                                                                <li key={child._id || `${child.slug || 'child'}-${cIdx}`}>
                                                                    <Link
                                                                        href={`/products?category=${child.slug}`}
                                                                        className="hover:text-primary hover:underline block truncate transition-colors"
                                                                    >
                                                                        {child.name}
                                                                    </Link>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground col-span-full">Loading categories...</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Link href="/products" className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${pathname === "/products" ? "bg-white text-black shadow-2xs" : "text-white hover:bg-white/10"}`}>
                                <Store className={`size-4 ${pathname === "/products" ? "text-black" : "text-white"}`} />
                                <span>Shop Products</span>
                            </Link>

                            <Link
                                href="/best-selling"
                                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${pathname === "/best-selling" ? "bg-white text-black shadow-2xs" : "text-white hover:bg-white/10"}`}
                            >
                                <TrendingUp className={`size-4 ${pathname === "/best-selling" ? "text-black" : "text-white"}`} />
                                <span>Best Selling</span>
                            </Link>

                            <Link
                                href="/flash-sale"
                                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${pathname === "/flash-sale" ? "bg-white text-black shadow-2xs" : "text-white hover:bg-white/10"}`}
                            >
                                <Zap className={`size-4 ${pathname === "/flash-sale" ? "text-black" : "text-white"}`} />
                                <span>Flash Deals</span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link
                                href="/become-seller"
                                className="flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-zinc-200 px-4 py-1.5 text-xs font-bold transition-all hover:scale-105 shadow-2xs"
                            >
                                <Sparkles className="size-3.5 text-black" />
                                <span>Become a Seller</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile & Tablet Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-100 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-card text-card-foreground shadow-2xl overflow-y-auto border-r border-border flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                                <Link href="/" onClick={() => setMobileOpen(false)}>
                                    {logo ? (
                                        <img src={logo} alt={siteName || "Logo"} className="h-9 w-auto object-contain" />
                                    ) : siteName ? (
                                        <span suppressHydrationWarning className="text-lg font-black text-primary dark:text-accent">{siteName}</span>
                                    ) : null}
                                </Link>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>

                            <div className="px-5 py-4">
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
                            </div>

                            <nav className="border-t border-border px-5 py-3 space-y-1">
                                <Link
                                    href="/"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition-all"
                                >
                                    <House className="size-4 text-primary" /> Home
                                </Link>

                                <Link
                                    href="/products"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition-all"
                                >
                                    <Store className="size-4 text-primary" /> Shop Products
                                </Link>

                                <Link
                                    href="/best-selling"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition-all"
                                >
                                    <TrendingUp className="size-4 text-primary" /> Best Selling
                                </Link>

                                <Link
                                    href="/flash-sale"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition-all"
                                >
                                    <Zap className="size-4 text-primary fill-primary/20" /> Flash Deals
                                </Link>

                                <Link
                                    href="/orders"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition-all"
                                >
                                    <Package className="size-4 text-primary" /> Track Order
                                </Link>

                                <Link
                                    href="/become-seller"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted hover:text-primary transition-all"
                                >
                                    <Sparkles className="size-4 text-primary" /> Become a Seller
                                </Link>
                            </nav>
                        </div>

                        {/* Mobile Drawer Profile / Account Footer */}
                        {mounted && (
                            user ? (
                                <div className="border-t border-border px-5 py-4 mt-auto space-y-3 bg-muted/30">
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
                                <div className="border-t border-border px-5 py-4 mt-auto">
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileOpen(false)}
                                        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/90 py-2.5 text-xs font-black text-primary-foreground shadow-md"
                                    >
                                        <LogIn className="size-4" />
                                        <span>Login / Register</span>
                                    </Link>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </header>

        <BottomNav onOpenMenu={() => setMobileOpen(true)} />
    </>
    );
};

export default Navbar;
