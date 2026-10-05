import axiosPublic from "../utils/axiosPublic";
import axiosSecure from "../utils/axiosSecure";

export const getAttributes = async () => {
  const { data } = await axiosPublic.get("/attributes");
  return data;
};

export const getAttributeById = async (id) => {
  const { data } = await axiosPublic.get(`/attributes/${id}`);
  return data;
};

export const createAttribute = async (payload) => {
  const { data } = await axiosSecure.post("/attributes", payload);
  return data;
};

export const updateAttribute = async (id, payload) => {
  const { data } = await axiosSecure.patch(`/attributes/${id}`, payload);
  return data;
};

export const deleteAttribute = async (id) => {
  const { data } = await axiosSecure.delete(`/attributes/${id}`);
  return data;
};
