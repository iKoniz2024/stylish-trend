"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllVendors, updateVendorStatus } from "@/services/vendor.api";
import { CheckCircle2, XCircle, Clock, Ban, Store, Phone, Mail, MapPin } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminVendors() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["adminVendors"],
    queryFn: getAllVendors,
  });

  const mutation = useMutation({
    mutationFn: ({ vendorId, status }) => updateVendorStatus(vendorId, status),
    onSuccess: (data) => {
      toast.success(data.message || "Vendor status updated!");
      queryClient.invalidateQueries(["adminVendors"]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update vendor status");
    },
  });

  const handleStatusChange = (vendorId, status) => {
    mutation.mutate({ vendorId, status });
  };

  const vendors = data?.vendors || [];
  const filteredVendors = vendors.filter((v) => {
    if (filterStatus === "all") return true;
    return v.vendorInfo?.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Sellers & Vendors Management</h1>
          <p className="text-sm text-muted-foreground">Approve, suspend, or reject vendor applications and manage registered sellers.</p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1">
          {["all", "pending", "approved", "suspended", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                filterStatus === status
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading vendor list...</div>
      ) : filteredVendors.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Store className="mx-auto size-10 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground">No vendors found</p>
          <p className="text-xs text-muted-foreground">No sellers match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => {
            const status = vendor.vendorInfo?.status || "pending";
            return (
              <div
                key={vendor._id}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-black">
                        <Store className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground line-clamp-1">{vendor.vendorInfo?.shopName || vendor.name}</h3>
                        <p className="text-xs text-muted-foreground">{vendor.name}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black capitalize ${
                        status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : status === "suspended"
                          ? "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                          : status === "rejected"
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {status === "approved" && <CheckCircle2 className="size-3" />}
                      {status === "suspended" && <Ban className="size-3" />}
                      {status === "rejected" && <XCircle className="size-3" />}
                      {status === "pending" && <Clock className="size-3" />}
                      {status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                    {vendor.vendorInfo?.shopPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>{vendor.vendorInfo.shopPhone}</span>
                      </div>
                    )}
                    {vendor.vendorInfo?.shopAddress && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{vendor.vendorInfo.shopAddress}</span>
                      </div>
                    )}
                    {vendor.vendorInfo?.description && (
                      <p className="text-xs italic text-muted-foreground pt-1 border-t border-dashed border-border/60">
                        "{vendor.vendorInfo.description}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/60 flex flex-wrap items-center justify-end gap-1.5">
                  {status !== "approved" && (
                    <button
                      onClick={() => handleStatusChange(vendor._id, "approved")}
                      disabled={mutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                    >
                      Approve
                    </button>
                  )}

                  {status !== "suspended" && (
                    <button
                      onClick={() => handleStatusChange(vendor._id, "suspended")}
                      disabled={mutation.isPending}
                      className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-orange-700 transition-colors"
                    >
                      Suspend
                    </button>
                  )}

                  {status !== "rejected" && (
                    <button
                      onClick={() => handleStatusChange(vendor._id, "rejected")}
                      disabled={mutation.isPending}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
