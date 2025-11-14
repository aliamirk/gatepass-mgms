"use client";

import React, { useState, useEffect } from "react";
import {
  createGatepass,
  listMyGatepasses,
  getGatepassDetail,
  printGatepass,
  GatePassCreate,
  GatePassOut,
  getGatePassPhotoFile,
} from "../../backend/hr";

// Simple small status/toast component 
function Message({ type, text }: { type: "error" | "success" | "info"; text: string | null }) {
  if (!text) return null;
  const base = "px-4 py-3 rounded-lg text-sm max-w-full shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300";
  const cls =
    type === "error"
      ? "bg-red-50/90 text-red-800 border border-red-200"
      : type === "success"
      ? "bg-emerald-50/90 text-emerald-800 border border-emerald-200"
      : "bg-green-50/90 text-green-800 border border-green-200";
  return <div className={`${base} ${cls}`}>{text}</div>;
}

// Status History Modal 
function StatusHistoryModal({ history, onClose }: { history?: any[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b-2 border-green-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-green-50">
          <h3 className="text-xl font-bold text-emerald-800">Status History</h3>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-200 font-medium"
          >
            ✕ Close
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((h, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-gradient-to-br from-white to-green-50/30 border-2 border-green-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                      {h.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(h.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Changed by: <span className="font-medium">{h.changed_by}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No history available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ImagePreviewModal({
  imageId,
  onClose,
}: {
  imageId: string;
  onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchImage() {
      try {
        const blob = await getGatePassPhotoFile(imageId);

        if (!isMounted) return;

        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } catch (error) {
        console.error("Failed to load image:", error);
        setImageUrl(null);
      }
    }

    fetchImage();

    return () => {
      isMounted = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageId]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b-2 border-green-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-green-50">
          <h3 className="text-lg font-bold text-emerald-800">Image Preview</h3>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-200 font-medium"
          >
            ✕ Close
          </button>
        </div>

        <div className="p-6 flex items-center justify-center bg-gray-50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Gatepass photo"
              className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
            />
          ) : (
            <div className="text-gray-500 text-center">
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%239ca3af' font-size='16'%3EImage not available%3C/text%3E%3C/svg%3E"
                alt="Fallback"
                className="rounded-md"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Gatepass Card Component
function GatepassCard({ pass, onPrint }: { pass: GatePassOut; onPrint: (pass: GatePassOut) => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showExitPhoto, setShowExitPhoto] = useState(false);
  const [showReturnPhoto, setShowReturnPhoto] = useState(false);

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "Not Available";
    if (typeof value === "string" && value.includes("T")) {
      return new Date(value).toLocaleString();
    }
    return value;
  };

  return (
    <>
      <article className="bg-gradient-to-br from-white to-green-50/30 rounded-xl shadow-md border-2 border-green-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-50 to-green-50 border-b-2 border-green-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white text-sm font-bold mb-2">
                {pass.number}
              </div>
              <h3 className="font-bold text-2xl text-gray-800">{pass.person_name}</h3>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              pass.status === "approved" ? "bg-green-100 text-green-700" :
              pass.status === "pending" ? "bg-yellow-100 text-yellow-700" :
              pass.status === "rejected" ? "bg-red-100 text-red-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {pass.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Description */}
          <div className="p-3 rounded-lg bg-white border border-green-100">
            <div className="text-xs font-semibold text-gray-500 mb-1">DESCRIPTION</div>
            <p className="text-sm text-gray-700 leading-relaxed">{pass.description}</p>
          </div>

          {/* Grid Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">CREATED BY</div>
              <p className="text-sm text-gray-700">{formatValue(pass.created_by)}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">RETURNABLE</div>
              <p className="text-sm text-gray-700">{pass.is_returnable ? "✓ Yes" : "✗ No"}</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">CREATED AT</div>
              <p className="text-sm text-gray-700">{formatValue(pass.created_at)}</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">APPROVED AT</div>
              <p className="text-sm text-gray-700">{formatValue(pass.approved_at)}</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">EXIT TIME</div>
              <p className="text-sm text-gray-700">{formatValue(pass.exit_time)}</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">RETURN TIME</div>
              <p className="text-sm text-gray-700">{formatValue(pass.return_time)}</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">QR CODE</div>
              <p className="text-sm text-gray-700">{formatValue(pass.qr_code_url)}</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-1">GATEPASS ID</div>
              <p className="text-sm text-gray-700 font-mono break-all">{pass.id}</p>
            </div>
          </div>

          {/* Photo Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-2">EXIT PHOTO</div>
              {pass.exit_photo_id ? (
                <button
                  onClick={() => setShowExitPhoto(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  View
                </button>
              ) : (
                <p className="text-sm text-gray-500 italic">Not Available</p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-white border border-green-100">
              <div className="text-xs font-semibold text-gray-500 mb-2">RETURN PHOTO</div>
              {pass.return_photo_id ? (
                <button
                  onClick={() => setShowReturnPhoto(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  View
                </button>
              ) : (
                <p className="text-sm text-gray-500 italic">Not Available</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              📋 Status History
            </button>
            <button
              onClick={() => onPrint(pass)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              🖨️ Print
            </button>
          </div>
        </div>
      </article>

      {/* Modals */}
      {showHistory && (
        <StatusHistoryModal
          history={pass.status_history}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showExitPhoto && pass.exit_photo_id && (
        <ImagePreviewModal
          imageId={pass.exit_photo_id}
          onClose={() => setShowExitPhoto(false)}
        />
      )}
      {showReturnPhoto && pass.return_photo_id && (
        <ImagePreviewModal
          imageId={pass.return_photo_id}
          onClose={() => setShowReturnPhoto(false)}
        />
      )}
    </>
  );
}

export default function HR() {
  const [mode, setMode] = useState<"choose" | "create" | "view">("choose");

  // Create form state
  const [personName, setPersonName] = useState("");
  const [description, setDescription] = useState("");
  const [isReturnable, setIsReturnable] = useState(false);
  const [creating, setCreating] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<"all" | "byId" | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [passes, setPasses] = useState<GatePassOut[] | null>(null);
  const [singlePass, setSinglePass] = useState<GatePassOut | null>(null);
  const [queryId, setQueryId] = useState("");
  const [loading, setLoading] = useState(false);

  // messages
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  // helpers: client-side validation to avoid 422
  function validateCreate(): { ok: boolean; reason?: string } {
    if (!personName || personName.trim().length < 2) return { ok: false, reason: "Provide a valid name (min 2 chars)." };
    if (!description || description.trim().length < 3) return { ok: false, reason: "Provide a short description (min 3 chars)." };
    return { ok: true };
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    const v = validateCreate();
    if (!v.ok) {
      setMessage({ type: "error", text: v.reason || "Validation failed" });
      return;
    }
    setCreating(true);
    try {
      const payload: GatePassCreate = {
        person_name: personName.trim(),
        description: description.trim(),
        is_returnable: isReturnable,
      };
      const res = await createGatepass(payload);
      setMessage({ type: "success", text: `Gatepass created: ${res.number}` });
      // reset form
      setPersonName("");
      setDescription("");
      setIsReturnable(false);
      // optionally switch to view all
      setMode("view");
      setViewMode("all");
      fetchAll(statusFilter);
    } catch (err: any) {
      console.error(err);
      const text = err?.response?.data?.detail || err?.message || "Create failed";
      setMessage({ type: "error", text: String(text) });
    } finally {
      setCreating(false);
    }
  }

  async function fetchAll(status?: string) {
    setLoading(true);
    setPasses(null);
    setSinglePass(null);
    try {
      const res = await listMyGatepasses(status);
      setPasses(res || []);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: String(err?.response?.data || err?.message || "Failed to fetch") });
    } finally {
      setLoading(false);
    }
  }

  async function fetchById(id: string) {
    if (!id || id.trim().length === 0) {
      setMessage({ type: "error", text: "Please provide a gatepass ID." });
      return;
    }
    setLoading(true);
    setSinglePass(null);
    setPasses(null);
    try {
      const res = await getGatepassDetail(id.trim());
      setSinglePass(res);
    } catch (err: any) {
      console.error(err);
      const text = err?.response?.data?.detail || err?.message || "Failed to fetch";
      setMessage({ type: "error", text: String(text) });
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint(pass: GatePassOut) {
    try {
      setMessage({ type: "info", text: "Preparing download..." });
      const blob = await printGatepass(pass.number);
      // try to infer filename
      const filename = `${pass.number ?? pass.id}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `Downloaded ${filename}` });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: String(err?.response?.data || err?.message || "Print failed") });
    }
  }

  // UI pieces
  const ChooseView = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
      <button
        onClick={() => setMode("create")}
        className="group w-full sm:w-64 px-6 py-4 rounded-xl shadow-md border-2 border-emerald-100 bg-gradient-to-br from-white to-emerald-50 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-medium text-emerald-900"
      >
        <span className="mr-2 text-xl">+</span> Create Gatepass
      </button>

      <button
        onClick={() => {
          setMode("view");
          setViewMode(null);
        }}
        className="group w-full sm:w-64 px-6 py-4 rounded-xl shadow-md border-2 border-green-100 bg-gradient-to-br from-white to-green-50 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-medium text-green-900"
      >
        <span className="mr-2 text-xl">📋</span> View Gatepasses
      </button>
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 mb-4">
            <span className="text-emerald-800 font-semibold text-sm">HR PORTAL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
            Gatepass Management
          </h1>
          <p className="text-base text-gray-600 mt-3">Create, view and print gatepasses with ease</p>
        </header>

        <section className="mb-6 flex justify-center">
          <Message type={message?.type ?? "info"} text={message?.text ?? null} />
        </section>

        <main className="space-y-6">
          {/* Choose / Create / View */}
          <section className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl border border-green-100">
            {mode === "choose" && (
              <div>
                <div className="mb-6">{ChooseView}</div>
                <p className="text-sm text-gray-500 text-center">Choose an action to continue</p>
              </div>
            )}

            {mode === "create" && (
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-green-100">
                  <h2 className="text-2xl font-bold text-emerald-800">Create New Gatepass</h2>
                  <button
                    onClick={() => setMode("choose")}
                    className="px-4 py-2 rounded-lg text-sm border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 font-medium"
                  >
                    ← Back
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Person Name *</label>
                    <input
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 px-4 py-3 text-sm transition-all duration-200 outline-none"
                      placeholder="e.g. Ali Khan"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Description *</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 px-4 py-3 text-sm transition-all duration-200 outline-none"
                      rows={4}
                      placeholder="Short reason for gatepass"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-100">
                    <input
                      id="isReturnable"
                      type="checkbox"
                      checked={isReturnable}
                      onChange={(e) => setIsReturnable(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="isReturnable" className="text-sm font-medium text-gray-700">
                      Mark as returnable item
                    </label>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      onClick={() => {
                        setPersonName("");
                        setDescription("");
                        setIsReturnable(false);
                        setMode("choose");
                      }}
                      className="px-6 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold disabled:opacity-60 hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:hover:scale-100"
                    >
                      {creating ? "Creating..." : "✓ Create Gatepass"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === "view" && (
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-green-100">
                  <h2 className="text-2xl font-bold text-emerald-800">View Gatepasses</h2>
                  <button 
                    onClick={() => setMode("choose")} 
                    className="px-4 py-2 rounded-lg text-sm border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 font-medium"
                  >
                    ← Back
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-3 mb-5">
                  <button
                    onClick={() => {
                      setViewMode("all");
                      fetchAll(statusFilter);
                    }}
                    className="w-full sm:w-48 px-4 py-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 font-medium text-emerald-800"
                  >
                    📋 View All
                  </button>

                  <div className="w-full sm:w-auto flex gap-2">
                    <input
                      value={queryId}
                      onChange={(e) => setQueryId(e.target.value)}
                      placeholder="Enter Gatepass ID"
                      className="flex-1 rounded-lg border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 px-4 py-3 text-sm transition-all duration-200 outline-none"
                    />
                    <button
                      onClick={() => {
                        setViewMode("byId");
                        fetchById(queryId);
                      }}
                      className="px-4 py-3 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all duration-200 font-medium text-green-800"
                    >
                      🔍 Search
                    </button>
                  </div>
                </div>

                {/* optional status filter for listing */}
                <div className="mb-5 flex flex-wrap gap-3 items-center p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <label className="text-sm font-medium text-gray-700">Filter by status:</label>
                  <input
                    value={statusFilter ?? ""}
                    onChange={(e) => setStatusFilter(e.target.value || undefined)}
                    placeholder="e.g. approved"
                    className="rounded-lg border-2 border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 px-3 py-2 text-sm transition-all duration-200 outline-none"
                  />
                  <button
                    onClick={() => fetchAll(statusFilter)}
                    className="px-4 py-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 text-sm font-medium text-emerald-800"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {/* Results area */}
                <div>
                  {loading && (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600"></div>
                      <p className="text-sm text-gray-500 mt-3">Loading...</p>
                    </div>
                  )}

                  {viewMode === "all" && passes && (
                    <div className="space-y-6">
                      {passes.length === 0 && (
                        <div className="text-center py-12">
                          <div className="text-5xl mb-3">📭</div>
                          <p className="text-gray-500">No gatepasses found</p>
                        </div>
                      )}
                      {passes.map((p) => (
                        <GatepassCard key={p.id} pass={p} onPrint={handlePrint} />
                      ))}
                    </div>
                  )}

                  {viewMode === "byId" && singlePass && (
                    <div className="space-y-6">
                      <GatepassCard pass={singlePass} onPrint={handlePrint} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <footer className="text-xs text-gray-500 text-center py-4">
            Built for HR workflows — Modern, responsive & efficient
          </footer>
        </main>
      </div>
    </div>
  );
}