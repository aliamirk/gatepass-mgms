"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

// API call functions
async function scanExit(pass_number: string, file: File) {
  const formData = new FormData();
  formData.append("pass_number", pass_number);
  formData.append("file", file);

  const res = await fetch("http://13.235.111.187:8000/gate/scan-exit", {
    method: "POST",
    body: formData,
  });
  return res.json();
}

async function scanReturn(pass_number: string, file: File) {
  const formData = new FormData();
  formData.append("pass_number", pass_number);
  formData.append("file", file);

  const res = await fetch("http://13.235.111.187:8000/gate/scan-return", {
    method: "POST",
    body: formData,
  });
  return res.json();
}

// Message Component
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

export default function GatepassPage() {
  const searchParams = useSearchParams();
  const queryGid = searchParams.get("gid") || "";

  const [gid, setGid] = useState(queryGid);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"exit" | "return" | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [pendingType, setPendingType] = useState<"exit" | "return" | null>(null);

  useEffect(() => {
    if (queryGid) setGid(queryGid);
  }, [queryGid]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const handleFileSelection = (file: File, type: "exit" | "return") => {
    setSelectedFile(file);
    setUploadType(type);
    setPreviewUrl(URL.createObjectURL(file));
    setModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedFile || !uploadType || !gid) return;

    setModalOpen(false);
    setUploading(true);

    try {
      let response;
      if (uploadType === "exit") {
        response = await scanExit(gid, selectedFile);
      } else {
        response = await scanReturn(gid, selectedFile);
      }

      if (response?.id || response?.number) {
        setMessage({ type: "success", text: `Success! Status: ${response.status}` });
      } else if (response?.detail) {
        setMessage({ type: "error", text: `Error: ${response.detail}` });
      } else {
        setMessage({ type: "error", text: "Unknown response from server" });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Upload failed. Check console for details." });
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadType(null);
    }
  };

  const handleCancel = () => {
    setModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadType(null);
  };

  const triggerFileInput = (type: "exit" | "return") => {
    if (!gid) {
      setMessage({ type: "error", text: "Please enter a Gatepass Number first!" });
      return;
    }

    setPendingType(type);
    setShowSourceModal(true);
  };

  const openCamera = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e: any) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0], pendingType!);
      }
    };
    input.click();
    setShowSourceModal(false);
  };

  const openGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0], pendingType!);
      }
    };
    input.click();
    setShowSourceModal(false);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 mb-4">
            <span className="text-emerald-800 font-semibold text-sm">GATE PORTAL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
            Gatepass Scanner
          </h1>
          <p className="text-base text-gray-600 mt-3">Scan exit and return images for gatepasses</p>
        </header>

        {/* Message Section */}
        <section className="mb-6 flex justify-center">
          <Message type={message?.type ?? "info"} text={message?.text ?? null} />
        </section>

        {/* Main Card */}
        <section className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl border border-green-100">
          <div className="space-y-6">
            {/* Gatepass Number Input */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Gatepass Number *
              </label>
              <input
                type="text"
                value={gid}
                onChange={(e) => setGid(e.target.value)}
                readOnly={!!queryGid}
                placeholder="Enter Gatepass Number (e.g. GP-2025-0001)"
                className={`w-full rounded-lg border-2 px-4 py-3 text-sm transition-all duration-200 outline-none ${
                  queryGid
                    ? "bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600"
                    : "bg-white border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                }`}
              />
              {queryGid && (
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <span className="mr-1">🔒</span> This field is auto-filled from QR code
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => triggerFileInput("exit")}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-emerald-100 bg-gradient-to-br from-emerald-600 to-green-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold text-base"
              >
                Scan Exit Image
              </button>

              <button
                onClick={() => triggerFileInput("return")}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-green-100 bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold text-base"
              >
                Scan Return Image
              </button>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">Instructions</h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Enter the gatepass number or scan QR code</li>
                    <li>• Click "Scan Exit Image" when person is leaving</li>
                    <li>• Click "Scan Return Image" when person returns</li>
                    <li>• Ensure images are clear and well-lit</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-xs text-gray-500 text-center py-6 mt-6">
          Gate Portal — Secure entry and exit management
        </footer>
      </div>

      {/* Image Preview Modal */}
      {modalOpen && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b-2 border-green-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="text-xl font-bold text-emerald-800">
                {uploadType === "exit" ? "📸 Exit Image Preview" : "📷 Return Image Preview"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Review the image before uploading
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col items-center justify-center bg-gray-50 max-h-[calc(90vh-200px)] overflow-auto">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[60vh] rounded-lg shadow-lg border-2 border-green-100"
              />
              
              <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 w-full max-w-md">
                <p className="text-xs text-gray-700 text-center">
                  <span className="font-semibold">Gatepass:</span> {gid}
                  <br />
                  <span className="font-semibold">Type:</span> {uploadType === "exit" ? "Exit" : "Return"}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t-2 border-gray-100 bg-white flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                ✓ Confirm Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Selection Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b-2 border-green-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="text-xl font-bold text-emerald-800">Choose Image Source</h3>
              <p className="text-sm text-gray-600 mt-1">Select where to get the image from</p>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={openCamera}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-emerald-100 bg-gradient-to-br from-emerald-600 to-green-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold"
              >
                <span className="mr-2 text-xl">📸</span> Use Camera
              </button>
              <button
                onClick={openGallery}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-green-100 bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold"
              >
                <span className="mr-2 text-xl">🖼️</span> Choose from Gallery
              </button>
              <button
                onClick={() => setShowSourceModal(false)}
                className="w-full px-6 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {uploading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">📤</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">Uploading Image</p>
              <p className="text-sm text-gray-600 mt-1">Please wait while we process your request...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}