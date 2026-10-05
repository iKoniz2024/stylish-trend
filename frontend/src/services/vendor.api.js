import axiosPublic from "../utils/axiosPublic";
import axiosSecure from "../utils/axiosSecure";

// Public APIs
export const getFeaturedVendor = async () => {
  const { data } = await axiosPublic.get("/vendors/public/featured");
  return data;
};

// Admin APIs
export const getAllVendors = async () => {
  const { data } = await axiosSecure.get("/vendors/admin/all");
  return data;
};

export const updateVendorStatus = async (vendorId, status) => {
  const { data } = await axiosSecure.patch(`/vendors/admin/${vendorId}/status`, { status });
  return data;
};

// Vendor APIs
export const getVendorStats = async () => {
  const { data } = await axiosSecure.get("/vendors/dashboard/stats");
  return data;
};

export const getVendorOrders = async () => {
  const { data } = await axiosSecure.get("/vendors/orders");
  return data;
};
