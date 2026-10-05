"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getVendorStats, getVendorOrders } from "@/services/vendor.api";
import { Store, ShoppingBag, TrendingUp, DollarSign, Package, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function VendorDashboard() {
  const { user } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["vendorStats"],
    queryFn: getVendorStats,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["vendorOrders"],
    queryFn: getVendorOrders,
  });

  const stats = statsData?.stats || { totalProducts: 0, totalOrdersCount: 0, totalItemsSold: 0, totalSales: 0 };
  const orders = ordersData?.orders || [];

  return (
    <div className="space-y-8">
      {/* Vendor Header Banner */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FBBF24] via-[#D97706] to-[#B45309] text-white font-black text-xl shadow-md">
              <Store className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground">{user?.vendorInfo?.shopName || user?.name || "Vendor Store"}</h1>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-0.5 text-xs font-black capitalize">
                  {user?.vendorInfo?.status || "Approved"} Seller
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Seller Portal & Real-time Sales Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FBBF24] via-[#D97706] to-[#B45309] px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition-all hover:scale-102"
            >
              <ShoppingBag className="size-4 text-white" />
              <span>+ Manage / Add Products</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Total Sales Revenue</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-foreground">
            ৳{statsLoading ? "..." : stats.totalSales.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Earnings from item sales</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Items Sold</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-foreground">
            {statsLoading ? "..." : stats.totalItemsSold}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Units purchased by buyers</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Assigned Orders</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
              <Package className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-foreground">
            {statsLoading ? "..." : stats.totalOrdersCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Orders containing your products</p>
        </div>

        <Link href="/dashboard/products" className="block rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">My Products</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 group-hover:scale-105 transition-transform">
              <ShoppingBag className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-foreground">
            {statsLoading ? "..." : stats.totalProducts}
          </p>
          <p className="text-[11px] text-primary font-semibold mt-1">Click to view & add products →</p>
        </Link>
      </div>

      {/* Orders Table Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-foreground">Assigned Customer Orders</h2>

        {ordersLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
            No orders found for your shop items yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Order ID / Date</th>
                  <th className="px-4 py-3">Customer Phone</th>
                  <th className="px-4 py-3">Purchased Items</th>
                  <th className="px-4 py-3">Vendor Subtotal</th>
                  <th className="px-4 py-3">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-foreground">#{order._id.slice(-6).toUpperCase()}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{order.guestPhone || order.shippingAddress?.phone || "N/A"}</p>
                      <p className="text-[11px] text-muted-foreground">{order.shippingAddress?.city || "Customer"}</p>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-foreground">{item.quantity}x</span>
                            <span className="text-muted-foreground truncate max-w-xs">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-bold text-foreground">
                      ৳{order.vendorSubtotal || order.subtotal}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 px-2.5 py-1 text-[11px] font-bold capitalize border border-amber-500/20">
                        <Clock className="size-3" />
                        {order.orderStatus || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
