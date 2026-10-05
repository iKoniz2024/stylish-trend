"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, X, Pencil, Save, Sliders, CheckCircle2, Tag, Layers, Sparkles } from "lucide-react";
import { getAttributes, createAttribute, updateAttribute, deleteAttribute } from "@/services/attribute.api";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Helmet } from "react-helmet-async";
import useSettings from "@/hooks/useSettings";

export default function AdminAttributes() {
  const { siteName } = useSettings();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingAttr, setEditingAttr] = useState(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("select");
  const [optionsInput, setOptionsInput] = useState("");
  const [options, setOptions] = useState([]);
  const [unit, setUnit] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isFilterable, setIsFilterable] = useState(true);
  const [isSearchable, setIsSearchable] = useState(false);
  const [useAsVariant, setUseAsVariant] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["admin-attributes"],
    queryFn: getAttributes,
  });

  const createMutation = useMutation({
    mutationFn: createAttribute,
    onSuccess: () => {
      toast.success("Attribute created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-attributes"] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to create attribute");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAttribute(id, payload),
    onSuccess: () => {
      toast.success("Attribute updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-attributes"] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update attribute");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttribute,
    onSuccess: () => {
      toast.success("Attribute deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-attributes"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete attribute");
    }
  });

  const openCreateModal = () => {
    setEditingAttr(null);
    setName("");
    setCode("");
    setType("select");
    setOptions([]);
    setOptionsInput("");
    setUnit("");
    setIsRequired(false);
    setIsFilterable(true);
    setIsSearchable(false);
    setUseAsVariant(false);
    setSortOrder(0);
    setShowModal(true);
  };

  const openEditModal = (attr) => {
    setEditingAttr(attr);
    setName(attr.name || "");
    setCode(attr.code || "");
    setType(attr.type || "select");
    setOptions(Array.isArray(attr.options) ? attr.options : []);
    setOptionsInput("");
    setUnit(attr.unit || "");
    setIsRequired(Boolean(attr.isRequired));
    setIsFilterable(attr.isFilterable !== undefined ? Boolean(attr.isFilterable) : true);
    setIsSearchable(Boolean(attr.isSearchable));
    setUseAsVariant(Boolean(attr.useAsVariant));
    setSortOrder(attr.sortOrder || 0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAttr(null);
  };

  const handleAddOption = () => {
    const trimmed = optionsInput.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setOptionsInput("");
    }
  };

  const handleRemoveOption = (optToRemove) => {
    setOptions(options.filter((o) => o !== optToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Attribute name is required");

    const generatedCode = code.trim() ? code.trim().toLowerCase() : name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const payload = {
      name: name.trim(),
      code: generatedCode,
      type,
      options,
      unit: unit.trim(),
      isRequired,
      isFilterable,
      isSearchable,
      useAsVariant,
      sortOrder: Number(sortOrder)
    };

    if (editingAttr) {
      updateMutation.mutate({ id: editingAttr._id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet>
        <title>Manage Dynamic Attributes | {siteName}</title>
      </Helmet>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 dark:from-sky-950/30 dark:to-purple-950/30 p-6 rounded-2xl border border-sky-100 dark:border-sky-900/40 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-7 h-7 text-sky-500" /> Dynamic Attribute Manager
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure product attributes (Age Group, Clothing Size, Shoe Size, Color, Brand, etc.)
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-500/20 gap-2">
          <Plus className="w-4 h-4" /> Add New Attribute
        </Button>
      </div>

      {/* Grid of Attributes */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : attributes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Sliders className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Dynamic Attributes Created Yet</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">Add attributes like Size, Color, Age Group, Brand, Material to dynamically use in products.</p>
          <Button onClick={openCreateModal} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl">
            <Plus className="w-4 h-4 mr-1" /> Add Attribute Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {attributes.map((attr) => (
            <motion.div
              key={attr._id}
              layout
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{attr.name}</h3>
                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sky-600 dark:text-sky-400 font-mono font-medium">
                      {attr.code}
                    </code>
                  </div>
                  <span className="inline-block text-xs text-slate-500 dark:text-slate-400 font-medium capitalize mt-1">
                    Type: <span className="text-slate-700 dark:text-slate-300 font-semibold">{attr.type}</span> {attr.unit ? `(${attr.unit})` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                  <button onClick={() => openEditModal(attr)} className="p-1.5 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(attr._id)} className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {attr.useAsVariant && (
                  <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Variant
                  </span>
                )}
                {attr.isFilterable && (
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    Filterable
                  </span>
                )}
                {attr.isRequired && (
                  <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    Required
                  </span>
                )}
              </div>

              {/* Options Chips */}
              {Array.isArray(attr.options) && attr.options.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-medium mb-1.5">Preset Values ({attr.options.length}):</p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {attr.options.map((opt, i) => (
                      <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                  <Sliders className="w-5 h-5 text-sky-500" />
                  {editingAttr ? "Edit Dynamic Attribute" : "Create Dynamic Attribute"}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Attribute Name *</label>
                    <Input
                      placeholder="e.g. Size, Color, Age"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!editingAttr) setCode(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Attribute Code (Key) *</label>
                    <Input
                      placeholder="e.g. size, color, age"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Input Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="select">Dropdown Select</option>
                      <option value="multi-select">Multi-Select</option>
                      <option value="text">Text Input</option>
                      <option value="number">Number Input</option>
                      <option value="color">Color Swatch</option>
                      <option value="boolean">Yes / No Toggle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit (Optional)</label>
                    <Input
                      placeholder="e.g. Yrs, cm, kg"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                </div>

                {/* Options Input */}
                {["select", "multi-select", "color"].includes(type) && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Preset Value Options</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add option (e.g. Red, XL, 2-4Y)"
                        value={optionsInput}
                        onChange={(e) => setOptionsInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddOption} className="bg-slate-800 text-white rounded-xl px-4">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {options.map((opt, i) => (
                        <span key={i} className="text-xs bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium">
                          {opt}
                          <button type="button" onClick={() => handleRemoveOption(opt)} className="hover:text-rose-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Switches */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <input type="checkbox" checked={useAsVariant} onChange={(e) => setUseAsVariant(e.target.checked)} className="rounded text-sky-500 focus:ring-sky-500" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Use for Variant Matrix</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <input type="checkbox" checked={isFilterable} onChange={(e) => setIsFilterable(e.target.checked)} className="rounded text-sky-500 focus:ring-sky-500" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-medium">Enable as Catalog Filter</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl">
                    {editingAttr ? "Update Attribute" : "Save Attribute"}
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
