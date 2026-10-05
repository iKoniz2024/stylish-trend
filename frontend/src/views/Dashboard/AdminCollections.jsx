"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, X, Pencil, Save, Layers, Sparkles, Image as ImageIcon, Calendar } from "lucide-react";
import { getCollections, createCollection, updateCollection, deleteCollection } from "@/services/collection.api";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Helmet } from "react-helmet-async";
import useSettings from "@/hooks/useSettings";

export default function AdminCollections() {
  const { siteName } = useSettings();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingCol, setEditingCol] = useState(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [banner, setBanner] = useState("");
  const [status, setStatus] = useState("active");
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => getCollections(),
  });

  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      toast.success("Collection created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to create collection");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCollection(id, payload),
    onSuccess: () => {
      toast.success("Collection updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update collection");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      toast.success("Collection deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete collection");
    }
  });

  const openCreateModal = () => {
    setEditingCol(null);
    setName("");
    setSlug("");
    setDescription("");
    setImage("");
    setBanner("");
    setStatus("active");
    setIsFeatured(false);
    setSortOrder(0);
    setShowModal(true);
  };

  const openEditModal = (col) => {
    setEditingCol(col);
    setName(col.name || "");
    setSlug(col.slug || "");
    setDescription(col.description || "");
    setImage(col.image || "");
    setBanner(col.banner || "");
    setStatus(col.status || "active");
    setIsFeatured(Boolean(col.isFeatured));
    setSortOrder(col.sortOrder || 0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCol(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Collection name is required");

    const generatedSlug = slug.trim() ? slug.trim().toLowerCase() : name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const payload = {
      name: name.trim(),
      slug: generatedSlug,
      description: description.trim(),
      image,
      banner,
      status,
      isFeatured,
      sortOrder: Number(sortOrder)
    };

    if (editingCol) {
      updateMutation.mutate({ id: editingCol._id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet>
        <title>Manage Dynamic Collections | {siteName}</title>
      </Helmet>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-orange-500/10 dark:from-amber-950/30 dark:to-orange-950/30 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/40 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-amber-500" /> Dynamic Collection Manager
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create promotional seasonal collections (Summer Sale, Eid Special, Best Sellers, Winter Wear) independent of category hierarchy
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-500/20 gap-2">
          <Plus className="w-4 h-4" /> Add New Collection
        </Button>
      </div>

      {/* Grid of Collections */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Layers className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Promotional Collections Created Yet</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">Add collections like Summer Sale, Eid Special, or New Arrival to group products dynamically.</p>
          <Button onClick={openCreateModal} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
            <Plus className="w-4 h-4 mr-1" /> Create Collection Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((col) => (
            <motion.div
              key={col._id}
              layout
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
            >
              {col.banner || col.image ? (
                <div className="h-28 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  <img src={col.banner || col.image} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <h3 className="font-bold text-base drop-shadow-sm">{col.name}</h3>
                    <p className="text-xs text-slate-200 font-mono">{col.slug}</p>
                  </div>
                </div>
              ) : (
                <div className="p-5 pb-0">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{col.name}</h3>
                  <code className="text-xs text-amber-600 dark:text-amber-400 font-mono">{col.slug}</code>
                </div>
              )}

              <div className="p-5 space-y-3">
                {col.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{col.description}</p>}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full font-semibold">
                    {col.productCount || 0} Products
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(col)} className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(col._id)} className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  {editingCol ? "Edit Collection" : "Create Collection"}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Collection Name *</label>
                    <Input
                      placeholder="e.g. Summer Sale, Eid Special"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!editingCol) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Slug *</label>
                    <Input
                      placeholder="e.g. summer-sale, eid-special"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Collection detail description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Thumbnail Image URL</label>
                    <Input
                      placeholder="https://..."
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Banner Image URL</label>
                    <Input
                      placeholder="https://..."
                      value={banner}
                      onChange={(e) => setBanner(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
                    {editingCol ? "Update Collection" : "Save Collection"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
