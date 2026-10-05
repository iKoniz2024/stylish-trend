import axiosPublic from "../utils/axiosPublic";
import axiosSecure from "../utils/axiosSecure";

export const getCollections = async (params = {}) => {
  const { data } = await axiosPublic.get("/collections", { params });
  return data;
};

export const getCollectionById = async (id) => {
  const { data } = await axiosPublic.get(`/collections/${id}`);
  return data;
};

export const createCollection = async (payload) => {
  const { data } = await axiosSecure.post("/collections", payload);
  return data;
};

export const updateCollection = async (id, payload) => {
  const { data } = await axiosSecure.patch(`/collections/${id}`, payload);
  return data;
};

export const deleteCollection = async (id) => {
  const { data } = await axiosSecure.delete(`/collections/${id}`);
  return data;
};
