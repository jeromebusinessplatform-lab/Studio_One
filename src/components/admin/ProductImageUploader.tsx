import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, Trash2, RefreshCw, AlertCircle } from "lucide-react";

interface ProductImageUploaderProps {
  currentImage?: string;
  onImageChange: (dataUrl: string | undefined) => void;
}

export function ProductImageUploader({
  currentImage,
  onImageChange,
}: ProductImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMessage("");
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    // Limit size to ~4MB to avoid localStorage quota issues
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage("Image file exceeds 4MB limit. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageChange(result);
      }
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read image file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          className="text-neutral-600 uppercase text-xs block font-normal"
          style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
        >
          Product Image <span className="text-red-500">* (Upload Only)</span>
        </label>
        {currentImage && (
          <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1">
            ✓ Image attached
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-1.5">
          <AlertCircle size={13} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {currentImage ? (
        <div className="relative border border-neutral-200 rounded-xl p-3 bg-neutral-50/80 flex items-center gap-3">
          <div className="w-20 h-20 bg-white rounded-lg border border-neutral-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            <img
              src={currentImage}
              alt="Uploaded Product"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-xs font-semibold text-neutral-800 truncate">
              Uploaded Image Ready
            </div>
            <p className="text-[11px] text-neutral-500 font-normal">
              Image is stored and optimized for catalog display.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs border border-neutral-300 bg-white px-2.5 py-1 rounded-lg hover:bg-neutral-100 text-neutral-700 cursor-pointer shadow-2xs font-normal"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                <RefreshCw size={11} /> Replace
              </button>
              <button
                type="button"
                onClick={() => onImageChange(undefined)}
                className="flex items-center gap-1 text-xs border border-red-200 bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100 text-red-600 cursor-pointer font-normal"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-black bg-neutral-100/80"
              : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100/70 hover:border-neutral-400"
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-1.5 text-neutral-500">
            <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-2xs text-neutral-700">
              <UploadCloud size={20} />
            </div>
            <div
              className="text-xs font-semibold text-neutral-900"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              Drag & Drop product photo or <span className="text-black underline">Browse File</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-mono">
              Supports PNG, JPG, WEBP • Direct file upload only
            </p>
          </div>
        </div>
      )}

      {/* Hidden File Input (strictly image file picker, no text url input) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
