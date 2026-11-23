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
  getGatePassPhotos,
  uploadSubmissionPhotos,
  downloadComplete,
  SubmissionPhotoType,
} from "../../backend/hr";
import useAuthCheck from "@/lib/useAuthCheck";

import { createPortal } from "react-dom"; 
import { parseISO, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

function PKTDate({ dateString }: { dateString: any }) {
  try {
    if (!dateString) throw new Error("No date");

    const iso = dateString.endsWith("Z") ? dateString : dateString + "Z";
    const parsed = parseISO(iso);

    const pkt = format(
      toZonedTime(parsed, "Asia/Karachi"),
      "dd/MM/yyyy HH:mm:ss"
    );

    return <span className="text-xs text-gray-700">{pkt}</span>;
  } catch (e) {
    return <span className="text-xs text-gray-700">Not Available</span>;
  }
}


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

function StatusHistoryModal({ history, onClose }: { history?: any[]; onClose: () => void }) {

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
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
                    <PKTDate dateString={h.changed_at} />
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
    </div>,
    document.body
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

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80">
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl max-h-[90vh]
                      -translate-x-1/2 -translate-y-1/2
                      bg-white rounded-2xl shadow-2xl
                      overflow-hidden
                      animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-4 border-b-2 border-green-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-green-50">
          <h3 className="text-lg font-bold text-emerald-800">Image Preview</h3>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border-2 border-gray-200
                       hover:border-red-300 hover:bg-red-50 hover:text-red-600
                       transition-all duration-200 font-medium">
            ✕ Close
          </button>
        </div>

        {/* Body */}
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
    </div>,
    document.body
  );
}

// HR Gatepass Card Component
// Gallery thumbnail
function GalleryPhotoItem({ photo, idx }: { photo: { photo_id: string; type: string }; idx: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    getGatePassPhotoFile(photo.photo_id).then(blob => { if (mounted) setUrl(URL.createObjectURL(blob)); }).catch(() => {});
    return () => { mounted = false; };
  }, [photo.photo_id]);
  return (
    <div className="relative rounded-lg overflow-hidden border-2 border-green-100">
      {url ? <img src={url} alt={`Photo ${idx+1}`} className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-gray-100 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-200 border-t-emerald-600"></div></div>}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 flex justify-between">
        <span>#{idx+1}</span><span className="text-yellow-300">{photo.type.toUpperCase()}</span>
      </div>
    </div>
  );
}

// Webcam Capture Component
function WebcamCapture({ onCaptures, onClose, maxPhotos = 10 }: { onCaptures: (files: File[]) => void; onClose: () => void; maxPhotos?: number; }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [captured, setCaptured] = useState<{ file: File; url: string }[]>([]);
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; streamRef.current = stream; setIsReady(true); }
    } catch { alert("Could not access webcam."); onClose(); }
  };
  const stopCamera = () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } };
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || captured.length >= maxPhotos) return;
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    c.toBlob(blob => { if (!blob) return; const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' }); setCaptured(prev => [...prev, { file, url: URL.createObjectURL(blob) }]); }, 'image/jpeg', 0.92);
  };
  const removePhoto = (idx: number) => setCaptured(prev => { URL.revokeObjectURL(prev[idx].url); return prev.filter((_, i) => i !== idx); });
  const handleDone = () => { if (!captured.length) return; stopCamera(); onCaptures(captured.map(c => c.file)); onClose(); };
  const handleClose = () => { stopCamera(); captured.forEach(c => URL.revokeObjectURL(c.url)); onClose(); };
  useEffect(() => { startCamera(); return () => stopCamera(); }, []);
  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-start p-4 z-[70] overflow-auto">
      <div className="w-full max-w-3xl flex flex-col items-center gap-3">
        <div className="text-center"><h3 className="text-xl font-bold text-white">Webcam Capture</h3><p className="text-gray-300 text-sm">{captured.length}/{maxPhotos} captured</p></div>
        <div className="relative bg-black rounded-xl overflow-hidden border-2 border-emerald-500 w-full">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-[50vh] object-contain" />
          {!isReady && <div className="absolute inset-0 flex items-center justify-center bg-black/80"><div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600"></div></div>}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {captured.length > 0 && <div className="w-full grid grid-cols-5 gap-1">{captured.map((c, idx) => (<div key={idx} className="relative"><img src={c.url} className="w-full h-14 object-cover rounded border border-emerald-400" /><button onClick={() => removePhoto(idx)} className="absolute top-0 right-0 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">✕</button></div>))}</div>}
        <div className="flex gap-2 w-full justify-center flex-wrap">
          <button onClick={capturePhoto} disabled={!isReady || captured.length >= maxPhotos} className={`px-6 py-3 font-semibold rounded-xl ${isReady && captured.length < maxPhotos ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}>📷 Capture</button>
          <button onClick={handleDone} disabled={!captured.length} className={`px-6 py-3 font-semibold rounded-xl ${captured.length ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}>✓ Done ({captured.length})</button>
          <button onClick={handleClose} className="px-6 py-3 font-semibold rounded-xl bg-red-600 text-white">✕ Cancel</button>
        </div>
      </div>
    </div>
  );
}

function HRGatepassCard({
  pass,
  onPrint,
}: {
  pass: GatePassOut;
  onPrint: (pass: GatePassOut) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<{ photo_id: string; type: string }[] | null>(null);
  const [galleryType, setGalleryType] = useState<string | null>(null);
  const [photosLoading, setPhotosLoading] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  const TABS: { key: SubmissionPhotoType; label: string; mandatory: boolean }[] = [
    { key: "inhouse_challan",     label: "Inhouse Challan",     mandatory: true  },
    { key: "weighbridge_challan", label: "Weighbridge Challan", mandatory: true  },
    { key: "vehicle_image",       label: "Vehicle Image",       mandatory: true  },
    { key: "misc",                label: "Misc",                mandatory: false },
  ];

  const [activeTab, setActiveTab] = useState<SubmissionPhotoType>("inhouse_challan");
  const [showUpload, setShowUpload] = useState(false);
  const [tabFiles, setTabFiles] = useState<Record<SubmissionPhotoType, File[]>>({ inhouse_challan: [], weighbridge_challan: [], vehicle_image: [], misc: [] });
  const [tabPreviews, setTabPreviews] = useState<Record<SubmissionPhotoType, string[]>>({ inhouse_challan: [], weighbridge_challan: [], vehicle_image: [], misc: [] });
  const [tabCounts, setTabCounts] = useState<Record<SubmissionPhotoType, number>>({ inhouse_challan: 0, weighbridge_challan: 0, vehicle_image: 0, misc: 0 });
  const [tabUploading, setTabUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);

  useEffect(() => {
    if (pass.status === "pending") {
      getGatePassPhotos(pass.number).then(photos => {
        const counts: Record<string, number> = { inhouse_challan: 0, weighbridge_challan: 0, vehicle_image: 0, misc: 0 };
        photos.forEach(p => { if (p.type in counts) counts[p.type]++; });
        setTabCounts(counts as Record<SubmissionPhotoType, number>);
      }).catch(() => {});
    }
  }, [pass.number, pass.status]);

  async function handleViewPhotos(type: string) {
    setPhotosLoading(type);
    try {
      const all = await getGatePassPhotos(pass.number);
      const filtered = all.filter(p => p.type === type);
      setGalleryPhotos(filtered); setGalleryType(type); setShowGallery(true);
    } catch { setGalleryPhotos([]); setGalleryType(type); setShowGallery(true); }
    finally { setPhotosLoading(null); }
  }

  function addFilesToTab(tab: SubmissionPhotoType, files: FileList | File[]) {
    const arr = Array.from(files);
    const remaining = 10 - tabFiles[tab].length;
    const toAdd = arr.slice(0, remaining);
    if (toAdd.length === 0) { setUploadMessage({ type: "error", text: "Maximum 10 photos per tab." }); return; }
    setTabFiles(prev => ({ ...prev, [tab]: [...prev[tab], ...toAdd].slice(0, 10) }));
    setTabPreviews(prev => ({ ...prev, [tab]: [...prev[tab], ...toAdd.map(f => URL.createObjectURL(f))].slice(0, 10) }));
  }

  function removeFileFromTab(tab: SubmissionPhotoType, idx: number) {
    URL.revokeObjectURL(tabPreviews[tab][idx]);
    setTabFiles(prev => ({ ...prev, [tab]: prev[tab].filter((_, i) => i !== idx) }));
    setTabPreviews(prev => ({ ...prev, [tab]: prev[tab].filter((_, i) => i !== idx) }));
  }

  async function handleUploadTab(tab: SubmissionPhotoType) {
    if (tabFiles[tab].length === 0) { setUploadMessage({ type: "error", text: "Select at least one photo." }); return; }
    setTabUploading(true); setUploadMessage(null);
    try {
      await uploadSubmissionPhotos(pass.number, tab, tabFiles[tab]);
      const count = tabFiles[tab].length;
      setTabCounts(prev => ({ ...prev, [tab]: prev[tab] + count }));
      tabPreviews[tab].forEach(u => URL.revokeObjectURL(u));
      setTabFiles(prev => ({ ...prev, [tab]: [] }));
      setTabPreviews(prev => ({ ...prev, [tab]: [] }));
      setUploadMessage({ type: "success", text: `${count} photo${count > 1 ? "s" : ""} uploaded to ${TABS.find(t => t.key === tab)?.label}.` });
    } catch (e: any) { setUploadMessage({ type: "error", text: e.message || "Upload failed." }); }
    finally { setTabUploading(false); }
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "Not Available";
    if (typeof value === "string" && value.includes("T")) return new Date(value).toLocaleString();
    return value;
  };

  return (
    <>
      <article className="bg-gradient-to-br from-white to-green-50/30 rounded-xl shadow-md border-2 border-green-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Compact Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-green-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold mb-1.5">
                {pass.number}
              </div>
              <h3 className="font-bold text-lg text-gray-800 truncate">{pass.person_name}</h3>
              <p className="text-xs text-gray-600 mt-1">{pass.description}</p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                pass.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : pass.status === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : pass.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {pass.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Compact Body */}
        <div className="p-4 space-y-3">
          {/* Key Info in Compact Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-white border border-green-100">
              <div className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Created</div>
              <p className="text-gray-700 leading-tight"><PKTDate dateString={pass.created_at} /></p>
            </div>

            <div className="p-2 rounded bg-white border border-green-100">
              <div className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Returnable</div>
              <p className="text-gray-700">{pass.is_returnable ? "✓ Yes" : "✗ No"}</p>
            </div>

            {pass.exit_time && (
              <div className="p-2 rounded bg-white border border-green-100">
                <div className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Exit</div>
                <p className="text-gray-700 leading-tight"><PKTDate dateString={pass.exit_time} /></p>
              </div>
            )}

            {pass.return_time && (
              <div className="p-2 rounded bg-white border border-green-100">
                <div className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Return</div>
                <p className="text-gray-700 leading-tight"><PKTDate dateString={pass.return_time} /></p>
              </div>
            )}
          </div>

          {/* 4-Tab Photos Section */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setShowUpload(true); }}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${activeTab === tab.key && showUpload ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"}`}>
                  {tab.label}{tab.mandatory ? "*" : ""}
                  {tabCounts[tab.key] > 0 && <span className="ml-1 bg-green-500 text-white text-[9px] px-1 rounded-full">{tabCounts[tab.key]}</span>}
                </button>
              ))}
            </div>

            {pass.status !== "pending" && (
              <div className="grid grid-cols-2 gap-1">
                {TABS.map(tab => (
                  <button key={tab.key} onClick={() => handleViewPhotos(tab.key)} disabled={photosLoading === tab.key}
                    className="px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-[10px] font-medium hover:shadow-md transition-all disabled:opacity-50">
                    {photosLoading === tab.key ? "Loading..." : `View ${tab.label}`}
                  </button>
                ))}
                <button onClick={() => handleViewPhotos("return")} disabled={photosLoading === "return"}
                  className="px-2 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[10px] font-medium hover:shadow-md transition-all disabled:opacity-50 col-span-2">
                  {photosLoading === "return" ? "Loading..." : "Return Photos"}
                </button>
              </div>
            )}

            {pass.status === "pending" && showUpload && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-800">{TABS.find(t => t.key === activeTab)?.label}{TABS.find(t => t.key === activeTab)?.mandatory && <span className="text-red-500 ml-1">*required</span>}</p>
                  <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
                {tabPreviews[activeTab].length > 0 && (
                  <div className="grid grid-cols-4 gap-1">
                    {tabPreviews[activeTab].map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`${idx+1}`} className="w-full h-14 object-cover rounded border border-emerald-200" />
                        <button onClick={() => removeFileFromTab(activeTab, idx)} className="absolute top-0 right-0 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">✕</button>
                        <span className="absolute bottom-0 left-0 bg-black/50 text-white text-[8px] px-0.5 rounded-br">{idx+1}</span>
                      </div>
                    ))}
                  </div>
                )}
                {uploadMessage && <p className={`text-xs font-medium ${uploadMessage.type === "success" ? "text-green-700" : "text-red-700"}`}>{uploadMessage.text}</p>}
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => { const i = document.createElement("input"); i.type="file"; i.accept="image/*"; i.multiple=true; i.onchange=(e:any)=>addFilesToTab(activeTab, e.target.files); i.click(); }} disabled={tabFiles[activeTab].length >= 10} className="flex-1 px-2 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-[10px] font-medium hover:bg-emerald-50 disabled:opacity-50">🖼️ Gallery {tabFiles[activeTab].length > 0 ? `(${tabFiles[activeTab].length})` : ""}</button>
                  <button onClick={() => setShowWebcam(true)} disabled={tabFiles[activeTab].length >= 10} className="flex-1 px-2 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-[10px] font-medium hover:bg-emerald-50 disabled:opacity-50">📷 Webcam</button>
                  <button onClick={() => handleUploadTab(activeTab)} disabled={tabUploading || tabFiles[activeTab].length === 0} className="flex-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-[10px] font-medium hover:shadow-md disabled:opacity-50">{tabUploading ? "..." : "Upload"}</button>
                  <button onClick={() => handleViewPhotos(activeTab)} className="flex-1 px-2 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-[10px] font-medium hover:bg-emerald-50">👁️ View ({tabCounts[activeTab]})</button>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-1"
          >
            {showDetails ? "▲ Hide Details" : "▼ Show Details"}
          </button>

          {showDetails && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="p-2 rounded bg-white border border-green-100">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Created By</div>
                  <p className="text-gray-700">{formatValue(pass.created_by)}</p>
                </div>

                <div className="p-2 rounded bg-white border border-green-100">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Approved At</div>
                  <p className="text-gray-700"><PKTDate dateString={pass.approved_at} /></p>
                </div>

                <div className="p-2 rounded bg-white border border-green-100">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">QR Code</div>
                  <p className="text-gray-700">{formatValue(pass.qr_code_url)}</p>
                </div>

                <div className="p-2 rounded bg-white border border-green-100">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Gatepass ID</div>
                  <p className="text-gray-700 font-mono text-[10px] break-all">{pass.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Compact */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setShowHistory(true)}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              📋 History
            </button>
            <button
              onClick={() => onPrint(pass)}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              🖨️ Print
            </button>
          </div>
        </div>
      </article>

      {/* Modals */}
      {showHistory && <StatusHistoryModal history={pass.status_history} onClose={() => setShowHistory(false)} />}

      {showGallery && galleryPhotos !== null && createPortal(
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b-2 border-green-100 bg-gradient-to-r from-emerald-50 to-green-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-emerald-800">{galleryType ? (galleryType === "return" ? "Return" : (TABS.find(t => t.key === galleryType)?.label ?? galleryType)) : ""} Photos — {pass.number}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{galleryPhotos.length} photo{galleryPhotos.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setShowGallery(false)} className="px-4 py-2 rounded-lg bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 text-sm font-medium">Close</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {galleryPhotos.length === 0 ? <p className="text-center text-gray-500 py-8">No photos found</p> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryPhotos.map((photo, idx) => <GalleryPhotoItem key={photo.photo_id} photo={photo} idx={idx} />)}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {showWebcam && createPortal(
        <WebcamCapture
          onCaptures={(files) => { addFilesToTab(activeTab, files); setShowWebcam(false); }}
          onClose={() => setShowWebcam(false)}
          maxPhotos={10 - tabFiles[activeTab].length}
        />,
        document.body
      )}
    </>
  );
}

export default function HR() {
  useAuthCheck(["hrdept"]);
  const [mode, setMode] = useState<"choose" | "create" | "view">("choose");

  // Create form state
  const [personName, setPersonName] = useState("");
  const [description, setDescription] = useState("");
  const [isReturnable, setIsReturnable] = useState(false);
  const [creating, setCreating] = useState(false);

  // View state
  const [passes, setPasses] = useState<GatePassOut[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [numberFilter, setNumberFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

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
      fetchAll(statusFilter || undefined);
    } catch (err: any) {
      console.error(err);
      const text = err?.response?.data?.detail || err?.message || "Create failed";
      setMessage({ type: "error", text: String(text) });
    } finally {
      setCreating(false);
    }
  }

  // View state
  const [viewMode, setViewMode] = useState<"all" | "byId" | null>(null);

  async function fetchAll(status?: string) {
    setLoading(true);
    setPasses(null);
    try {
      const res = await listMyGatepasses(status);
      setPasses(res || []);
      setMessage({ type: "success", text: `Loaded ${res?.length || 0} gatepass(es)` });
    } catch (err: any) {
      console.error(err);
      const text = err?.response?.data?.detail || err?.message || "Failed to fetch gatepasses";
      setMessage({ type: "error", text: String(text) });
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
    setPasses(null);
    try {
      const res = await getGatepassDetail(id.trim());
      setPasses([res]);
      setMessage({ type: "success", text: `Found gatepass: ${res.number}` });
    } catch (err: any) {
      console.error(err);
      const text = err?.response?.data?.detail || err?.message || "Failed to fetch gatepass";
      setMessage({ type: "error", text: String(text) });
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint(pass: GatePassOut) {
    const pass_status = getGatepassDetail(pass.number.trim());
    const status = (await pass_status).status;
    if (status === "rejected") {
      setMessage({ type: "error", text: "Rejected gatepass cannot be printed" });
      return;
    }
    if (status === "pending") {
      setMessage({ type: "error", text: "Gatepass cannot be printed until approved by admin" });
      return;
    }
    try {
      setMessage({ type: "info", text: "Preparing download..." });
      const blob = await printGatepass(pass.number);
      const filename = `${pass.number ?? pass.id}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `Downloaded ${filename}` });
      try { await downloadComplete(pass.number); } catch { /* non-critical */ }
    } catch (err: any) {
      setMessage({ type: "error", text: "Gatepass cannot be downloaded without admin approval" });
    }
  }

  // Apply filters
  function applyFilters() {
    if (numberFilter.trim()) {
      fetchById(numberFilter);
    } else {
      fetchAll(statusFilter || undefined);
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
                      fetchAll(statusFilter || undefined);
                    }}
                    className="w-full sm:w-48 px-4 py-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 font-medium text-emerald-800"
                  >
                    📋 View All
                  </button>

                  <div className="w-full sm:w-auto flex gap-2">
                    <input
                      value={numberFilter}
                      onChange={(e) => setNumberFilter(e.target.value)}
                      placeholder="Enter Gatepass ID"
                      className="flex-1 rounded-lg border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 px-4 py-3 text-sm transition-all duration-200 outline-none"
                    />
                    <button
                      onClick={() => {
                        setViewMode("byId");
                        fetchById(numberFilter);
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
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    placeholder="e.g. approved"
                    className="rounded-lg border-2 border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 px-3 py-2 text-sm transition-all duration-200 outline-none"
                  />
                  <button
                    onClick={() => fetchAll(statusFilter || undefined)}
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
                        <HRGatepassCard key={p.id} pass={p} onPrint={handlePrint} />
                      ))}
                    </div>
                  )}

                  {viewMode === "byId" && passes && passes.length > 0 && (
                    <div className="space-y-6">
                      {passes.map((p) => (
                        <HRGatepassCard key={p.id} pass={p} onPrint={handlePrint} />
                      ))}
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