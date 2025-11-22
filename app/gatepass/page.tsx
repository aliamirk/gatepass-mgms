"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef } from "react";

const CORRECT_PASSWORD = "gate2025";

// Utility function to detect if device is mobile
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
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with 0.85 quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            console.log(`Image compressed: ${(file.size / (1024 * 1024)).toFixed(2)}MB → ${(blob.size / (1024 * 1024)).toFixed(2)}MB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// API call functions
async function scanExit(pass_number: string, file: File) {
  const formData = new FormData();
  formData.append("pass_number", pass_number);
  formData.append("file", file);

  const res = await fetch("https://gatepass-api.cushtello.shop/gate/scan-exit", {
    method: "POST",
    body: formData,
  });
  
  return res.json();
}

async function scanReturn(pass_number: string, file: File) {
  const formData = new FormData();
  formData.append("pass_number", pass_number);
  formData.append("file", file);

  const res = await fetch("https://gatepass-api.cushtello.shop/gate/scan-return", {
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

// Webcam Capture Component for Desktop
function WebcamCapture({ onCapture, onClose }: { 
  onCapture: (file: File) => void; 
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsReady(true);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      alert("Could not access webcam. Please check permissions.");
      onClose();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `webcam-${Date.now()}.jpg`, { 
            type: 'image/jpeg' 
          });
          stopCamera();
          onCapture(file);
          onClose();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
      <div className="w-full max-w-4xl flex flex-col items-center">
        <div className="mb-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">📷 Webcam Capture</h3>
          <p className="text-gray-300 text-sm">Position yourself and click capture</p>
        </div>
        
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-500">
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-[60vh] object-contain"
          />
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
        
        <div className="mt-6 flex gap-4">
          <button
            onClick={capturePhoto}
            disabled={!isReady}
            className={`px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              isReady
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-xl hover:scale-105'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            📸 Capture Photo
          </button>
          <button
            onClick={handleClose}
            className="px-8 py-4 text-lg font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Main content component
function GatepassContent() {
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
  const [compressing, setCompressing] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  
  // Password modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (queryGid) setGid(queryGid);
  }, [queryGid]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const handleFileSelection = async (file: File, type: "exit" | "return") => {
    console.log("File selected:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    try {
      // Compress image before preview
      setCompressing(true);
      const compressedFile = await compressImage(file);
      
      setSelectedFile(compressedFile);
      setUploadType(type);
      setPreviewUrl(URL.createObjectURL(compressedFile));
      setModalOpen(true);
      setCompressing(false);
    } catch (error) {
      console.error("Compression error:", error);
      setMessage({ type: "error", text: "Failed to process image. Please try again." });
      setCompressing(false);
    }
  };

  const handleConfirmPreview = () => {
    // Keep preview modal open and show password modal
    setShowPasswordModal(true);
    setPasswordInput("");
    setPasswordError("");
  };

  const handlePasswordSubmit = async () => {
    if (passwordInput !== CORRECT_PASSWORD) {
      setPasswordError("Incorrect password. Please try again.");
      setPasswordInput("");
      return;
    }

    // Password correct, close both modals and proceed with upload
    setShowPasswordModal(false);
    setModalOpen(false);
    setPasswordInput("");
    setPasswordError("");
    setUploading(true);

    if (!selectedFile || !uploadType || !gid) {
      setMessage({ type: "error", text: "Missing required data" });
      setUploading(false);
      return;
    }

    console.log("Starting upload:", {
      gid,
      uploadType,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type
    });

    try {
      let response;
      if (uploadType === "exit") {
        response = await scanExit(gid, selectedFile);
      } else {
        response = await scanReturn(gid, selectedFile);
      }

      console.log("Upload response:", response);

      if (response?.id || response?.number) {
        setMessage({ type: "success", text: `Success! Status: ${response.status || "Uploaded"}` });
      } else if (response?.detail) {
        setMessage({ type: "error", text: `Error: ${response.detail}` });
      } else {
        setMessage({ type: "success", text: "File uploaded successfully!" });
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      const errorMsg = err.message || "Upload failed";
      setMessage({ type: "error", text: `Upload failed: ${errorMsg}` });
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadType(null);
    }
  };

  const handleCancelPreview = () => {
    setModalOpen(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setUploadType(null);
  };

  const handleCancelPassword = () => {
    setShowPasswordModal(false);
    setPasswordInput("");
    setPasswordError("");
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
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      // Mobile: Use file input with capture attribute
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/jpg,image/png";
      input.capture = "environment";
      
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          console.log("Camera file selected:", {
            name: file.name,
            size: file.size,
            type: file.type
          });
          await handleFileSelection(file, pendingType!);
        } else {
          console.error("No file selected from camera");
          setMessage({ type: "error", text: "No image captured" });
        }
      };
      
      input.onerror = (err) => {
        console.error("Camera input error:", err);
        setMessage({ type: "error", text: "Failed to open camera" });
      };
      
      input.click();
      setShowSourceModal(false);
    } else {
      // Desktop: Open webcam capture modal
      setShowWebcamModal(true);
      setShowSourceModal(false);
    }
  };

  const openGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/jpg,image/png";
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        console.log("Gallery file selected:", {
          name: file.name,
          size: file.size,
          type: file.type
        });
        await handleFileSelection(file, pendingType!);
      } else {
        console.error("No file selected from gallery");
        setMessage({ type: "error", text: "No image selected" });
      }
    };
    
    input.onerror = (err) => {
      console.error("Gallery input error:", err);
      setMessage({ type: "error", text: "Failed to open gallery" });
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
                    <li>• Use camera or select from gallery</li>
                    <li>• Images are automatically compressed for faster upload</li>
                    <li>• Password required for upload confirmation</li>
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
            <div className="p-4 sm:p-5 border-b-2 border-green-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="text-lg sm:text-xl font-bold text-emerald-800">
                {uploadType === "exit" ? "📸 Exit Image Preview" : "📷 Return Image Preview"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Review the image before uploading
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-gray-50 max-h-[calc(90vh-200px)] overflow-auto">
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
                  <br />
                  {selectedFile && (
                    <span className="text-gray-500">Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  )}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t-2 border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={handleCancelPreview}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium order-2 sm:order-1"
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleConfirmPreview}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 order-1 sm:order-2"
              >
                ✓ Confirm Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b-2 border-green-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                🔐 Authentication Required
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Enter password to confirm upload
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError("");
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handlePasswordSubmit();
                        }
                      }}
                      placeholder="Enter password"
                      className={`w-full rounded-lg border-2 px-4 py-3 pr-12 text-sm transition-all duration-200 outline-none ${
                        passwordError
                          ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                          : "border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      }`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <span>⚠️</span> {passwordError}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <span>This password protects unauthorized uploads. Contact admin if you don't have access.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t-2 border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={handleCancelPassword}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium order-2 sm:order-1"
              >
                ✕ Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!passwordInput}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 order-1 sm:order-2 ${
                  passwordInput
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg hover:scale-105"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                🔓 Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Selection Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b-2 border-green-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="text-xl font-bold text-emerald-800">Choose Image Source</h3>
              <p className="text-sm text-gray-600 mt-1">Select where to get the image from</p>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={openCamera}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-emerald-100 bg-gradient-to-br from-emerald-600 to-green-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold"
              >
                {isMobileDevice() ? '📸 Use Camera' : '🎥 Use Webcam'}
              </button>
              <button
                onClick={openGallery}
                className="w-full px-6 py-4 rounded-xl shadow-md border-2 border-green-100 bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center font-semibold"
              >
                🖼️ Choose from Gallery
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

      {/* Webcam Capture Modal */}
      {showWebcamModal && (
        <WebcamCapture
          onCapture={async (file) => {
            await handleFileSelection(file, pendingType!);
          }}
          onClose={() => setShowWebcamModal(false)}
        />
      )}

      {/* Compression Loader */}
      {compressing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🖼️</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">Processing Image</p>
              <p className="text-sm text-gray-600 mt-1">Compressing for faster upload...</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Loader */}
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

// Main page component with Suspense wrapper
export default function GatepassPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <GatepassContent />
    </Suspense>
  );
}