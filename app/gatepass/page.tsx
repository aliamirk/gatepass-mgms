"use client";

import { GatePassOut, getGatepassDetail, printGatepass } from "@/backend/hr";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef } from "react";

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 1920;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Failed to get canvas context')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Failed to compress image')); return; }
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg', lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function scanExit(pass_number: string, files: File[]) {
  let lastResponse;
  for (const f of files) {
    const formData = new FormData();
    formData.append("pass_number", pass_number);
    formData.append("file", f);
    const res = await fetch("https://gatepass-api.pakeezah.net/gate/scan-exit", {
      method: "POST",
      body: formData,
    });
    lastResponse = await res.json();
  }
  return lastResponse;
}

async function scanReturn(pass_number: string, files: File[]) {
  let lastResponse;
  for (const f of files) {
    const formData = new FormData();
    formData.append("pass_number", pass_number);
    formData.append("file", f);
    const res = await fetch("https://gatepass-api.pakeezah.net/gate/scan-return", {
      method: "POST",
      body: formData,
    });
    lastResponse = await res.json();
  }
  return lastResponse;
}

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

function WebcamCapture({ onCaptures, onClose, maxPhotos = 10 }: {
  onCaptures: (files: File[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [captured, setCaptured] = useState<{ file: File; url: string }[]>([]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; streamRef.current = stream; setIsReady(true); }
    } catch (err) {
      alert("Could not access webcam. Please check permissions.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (captured.length >= maxPhotos) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setCaptured(prev => [...prev, { file, url }]);
    }, 'image/jpeg', 0.92);
  };

  const removePhoto = (idx: number) => {
    setCaptured(prev => { URL.revokeObjectURL(prev[idx].url); return prev.filter((_, i) => i !== idx); });
  };

  const handleDone = () => {
    if (captured.length === 0) return;
    stopCamera();
    onCaptures(captured.map(c => c.file));
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    captured.forEach(c => URL.revokeObjectURL(c.url));
    onClose();
  };

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-start p-4 z-[70] overflow-auto animate-in fade-in duration-200">
      <div className="w-full max-w-4xl flex flex-col items-center gap-4">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white">Webcam Capture</h3>
          <p className="text-gray-300 text-sm mt-1">
            {captured.length}/{maxPhotos} photos captured — click Capture then Done when finished
          </p>
        </div>
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-500 w-full">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-[50vh] object-contain" />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-3"></div>
                <p className="text-white font-medium">Starting camera...</p>
              </div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {captured.length > 0 && (
          <div className="w-full grid grid-cols-4 sm:grid-cols-6 gap-2">
            {captured.map((c, idx) => (
              <div key={idx} className="relative">
                <img src={c.url} alt={`${idx + 1}`} className="w-full h-16 object-cover rounded-lg border-2 border-emerald-400" />
                <span className="absolute top-0.5 left-0.5 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded">{idx + 1}</span>
                <button onClick={() => removePhoto(idx)} className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-600">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 w-full justify-center flex-wrap">
          <button
            onClick={capturePhoto}
            disabled={!isReady || captured.length >= maxPhotos}
            className={`px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              isReady && captured.length < maxPhotos
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-xl hover:scale-105'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >📷 Capture</button>
          <button
            onClick={handleDone}
            disabled={captured.length === 0}
            className={`px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              captured.length > 0
                ? 'bg-green-600 text-white hover:bg-green-500 hover:shadow-xl hover:scale-105'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >✓ Done ({captured.length})</button>
          <button onClick={handleClose} className="px-8 py-4 text-lg font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 hover:shadow-xl hover:scale-105 transition-all duration-300">✕ Cancel</button>
        </div>
      </div>
    </div>
  );
}

function GatepassContent() {
  const searchParams = useSearchParams();
  const queryGid = searchParams.get("gid") || "";

  const [gid, setGid] = useState(queryGid);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"exit" | "return" | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [pendingType, setPendingType] = useState<"exit" | "return" | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);

  useEffect(() => { if (queryGid) setGid(queryGid); }, [queryGid]);
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(null), 5000); return () => clearTimeout(t); }, [message]);

  const handleFileSelection = async (file: File, type: "exit" | "return") => {
    try {
      setCompressing(true);
      const compressedFile = await compressImage(file);
      setSelectedFiles(prev => [...prev, compressedFile].slice(0, 10));
      setUploadType(type);
      setPreviewUrls(prev => [...prev, URL.createObjectURL(compressedFile)].slice(0, 10));
      setModalOpen(true);
      setCompressing(false);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to process image. Please try again." });
      setCompressing(false);
    }
  };

  const handleConfirmPreview = async () => {
    setModalOpen(false);
    setUploading(true);
    if (!selectedFiles.length || !uploadType || !gid) {
      setMessage({ type: "error", text: "Missing required data" });
      setUploading(false);
      return;
    }
    try {
      let response;
      if (uploadType === "exit") {
        response = await scanExit(gid, selectedFiles);
      } else {
        response = await scanReturn(gid, selectedFiles);
      }
      if (response?.id || response?.number) {
        setMessage({ type: "success", text: `Success! Status: ${response.status || "Uploaded"}` });
      } else if (response?.detail) {
        setMessage({ type: "error", text: `Error: ${response.detail}` });
      } else {
        setMessage({ type: "success", text: "File uploaded successfully!" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: `Upload failed: ${err.message || "Unknown error"}` });
    } finally {
      setUploading(false);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadType(null);
    }
  };

  const handleCancelPreview = () => {
    setModalOpen(false);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadType(null);
  };

  const triggerFileInput = (type: "exit" | "return") => {
    if (!gid) { setMessage({ type: "error", text: "Please enter a Gatepass Number first!" }); return; }
    setPendingType(type);
    setShowSourceModal(true);
  };

  const openCamera = () => {
    if (isMobileDevice()) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/jpg,image/png";
      input.capture = "environment";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) await handleFileSelection(file, pendingType!);
        else setMessage({ type: "error", text: "No image captured" });
      };
      input.click();
      setShowSourceModal(false);
    } else {
      setShowWebcamModal(true);
      setShowSourceModal(false);
    }
  };

  const openGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/jpg,image/png";
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (files.length === 0) { setMessage({ type: "error", text: "No image selected" }); return; }
      const remaining = 10 - selectedFiles.length;
      const toProcess = files.slice(0, remaining);
      if (toProcess.length === 0) { setMessage({ type: "error", text: "Maximum 10 photos reached." }); return; }
      setShowSourceModal(false);
      setCompressing(true);
      try { for (const f of toProcess) await handleFileSelection(f, pendingType!); }
      finally { setCompressing(false); }
    };
    input.click();
    setShowSourceModal(false);
  };

  async function handlePrint(pass: string) {
    if (!gid) { setMessage({ type: "error", text: "Please enter a Gatepass Number first!" }); return; }
    try {
      const pass_status = getGatepassDetail(pass.trim());
      if ((await pass_status).status == "rejected") { setMessage({ type: "error", text: "Rejected gatepass cannot be printed" }); return; }
    } catch (error) { setMessage({ type: "error", text: `Gatepass ${pass} Not Found` }); return; }
    try {
      setMessage({ type: "info", text: "Preparing download..." });
      const blob = await printGatepass(pass);
      const filename = `${pass}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `Downloaded ${filename}` });
    } catch { setMessage({ type: "error", text: "Gatepass cannot be downloaded without admin approval" }); }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 mb-4">
            <span className="text-emerald-800 font-semibold text-sm">GATE PORTAL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
            Gatepass Scanner
          </h1>
          <p className="text-base text-gray-600 mt-3">Scan exit and return images for gatepasses</p>
        </header>

        <section className="mb-6 flex justify-center">
          <Message type={message?.type ?? "info"} text={message?.text ?? null} />
        </section>

        <section className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl border border-green-100">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Gatepass Number *</label>
              <input
                type="text" value={gid} onChange={(e) => setGid(e.target.value)} readOnly={!!queryGid}
                placeholder="Enter Gatepass Number (e.g. GP-2025-0001)"
                className={`w-full rounded-lg border-2 px-4 py-3 text-sm transition-all duration-200 outline-none ${
                  queryGid ? "bg-gray-50 border-gray-200 cursor-not-allowed text-gray-600"
                  : "bg-white border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                }`}
              />
              {queryGid && <p className="text-xs text-gray-500 mt-2">🔒 Auto-filled from QR code</p>}
            </div>

            {selectedFiles.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-xs text-emerald-800 font-medium text-center">
                  {selectedFiles.length}/10 photo{selectedFiles.length > 1 ? "s" : ""} selected
                  {selectedFiles.length < 10 && " — you can add more"}
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button onClick={() => triggerFileInput("exit")}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-emerald-100 bg-gradient-to-br from-emerald-600 to-green-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold text-base">
                Scan Exit Image {selectedFiles.length > 0 && uploadType === "exit" ? `(${selectedFiles.length})` : ""}
              </button>
              <button onClick={() => triggerFileInput("return")}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-green-100 bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold text-base">
                Scan Return Image {selectedFiles.length > 0 && uploadType === "return" ? `(${selectedFiles.length})` : ""}
              </button>
              <button onClick={() => handlePrint(gid)}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-green-100 bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold text-base">
                🖨️ Print Gatepass
              </button>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">Instructions</h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Enter the gatepass number or scan QR code</li>
                    <li>• Select up to 10 photos per scan</li>
                    <li>• Click "Scan Exit Image" when person is leaving</li>
                    <li>• Click "Scan Return Image" when person returns</li>
                    <li>• Use camera or select from gallery</li>
                    <li>• Images are automatically compressed for faster upload</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-xs text-gray-500 text-center py-6 mt-6">
          Gate Portal — Secure entry and exit management
        </footer>
      </div>

      {/* Image Preview Modal */}
      {modalOpen && previewUrls.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="text-lg sm:text-xl font-bold text-emerald-800">
                {uploadType === "exit" ? "📸 Exit Image Preview" : "📷 Return Image Preview"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {previewUrls.length} photo{previewUrls.length > 1 ? "s" : ""} selected — review before uploading
              </p>
            </div>
            <div className="p-4 sm:p-6 bg-gray-50 max-h-[calc(90vh-200px)] overflow-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-32 object-cover rounded-lg shadow border-2 border-emerald-100" />
                    <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{idx + 1}</span>
                    <button
                      onClick={() => { setPreviewUrls(prev => prev.filter((_, i) => i !== idx)); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                      className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600"
                    >✕</button>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-xs text-gray-700 text-center">
                  <span className="font-semibold">Gatepass:</span> {gid} &nbsp;|&nbsp;
                  <span className="font-semibold">Type:</span> {uploadType === "exit" ? "Exit" : "Return"} &nbsp;|&nbsp;
                  <span className="text-gray-500">{selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""}</span>
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5 border-t-2 border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button onClick={handleCancelPreview}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium order-2 sm:order-1">
                ✕ Cancel
              </button>
              <button onClick={handleConfirmPreview}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 order-1 sm:order-2">
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
            <div className="p-5 border-b-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="text-xl font-bold text-emerald-800">Choose Image Source</h3>
              <p className="text-sm text-gray-600 mt-1">Select where to get the image from</p>
            </div>
            <div className="p-6 space-y-3">
              <button onClick={openCamera}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-emerald-100 bg-gradient-to-br from-emerald-600 to-green-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold">
                {isMobileDevice() ? '📸 Use Camera' : '🎥 Use Webcam'}
              </button>
              <button onClick={openGallery}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-green-100 bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold">
                🖼️ Choose from Gallery
              </button>
              <button onClick={() => setShowSourceModal(false)}
                className="w-full px-6 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webcam Modal */}
      {showWebcamModal && (
        <WebcamCapture
          onCaptures={async (files) => {
            setShowWebcamModal(false);
            setCompressing(true);
            try { for (const f of files) await handleFileSelection(f, pendingType!); }
            finally { setCompressing(false); }
          }}
          onClose={() => setShowWebcamModal(false)}
          maxPhotos={10 - selectedFiles.length}
        />
      )}

      {/* Compression Loader */}
      {compressing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
            <p className="text-lg font-semibold text-gray-800">Processing Image</p>
            <p className="text-sm text-gray-600">Compressing for faster upload...</p>
          </div>
        </div>
      )}

      {/* Upload Loader */}
      {uploading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
            <p className="text-lg font-semibold text-gray-800">Uploading Images</p>
            <p className="text-sm text-gray-600">Please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GatepassPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <GatepassContent />
    </Suspense>
  );
}
