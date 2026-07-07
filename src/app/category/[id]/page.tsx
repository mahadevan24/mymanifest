"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { getDB, Category, VisionImage, DBService } from "@/lib/db";
import UploadModal from "@/components/ui/upload-modal";
import Lightbox from "@/components/ui/lightbox";
import CustomDialog from "@/components/ui/custom-dialog";

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [db, setDb] = useState<DBService | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [images, setImages] = useState<VisionImage[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFilesCount, setUploadFilesCount] = useState(0);
  const [uploadCompletedCount, setUploadCompletedCount] = useState(0);
  const [isUploadDone, setIsUploadDone] = useState(false);

  const [isDragActive, setIsDragActive] = useState(false);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: "alert" | "confirm";
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: "info" | "warning" | "danger";
  }>({
    isOpen: false,
    type: "alert",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, variant: "info" | "warning" | "danger" = "info") => {
    return new Promise<void>((resolve) => {
      setDialogConfig({
        isOpen: true,
        type: "alert",
        title,
        message,
        confirmLabel: "UNDERSTOOD",
        variant,
        onConfirm: () => {
          setDialogConfig((prev) => ({ ...prev, isOpen: false }));
          resolve();
        },
      });
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    variant: "info" | "warning" | "danger" = "info",
    confirmLabel = "CONTINUE",
    cancelLabel = "CANCEL"
  ) => {
    return new Promise<boolean>((resolve) => {
      setDialogConfig({
        isOpen: true,
        type: "confirm",
        title,
        message,
        confirmLabel,
        cancelLabel,
        variant,
        onConfirm: () => {
          setDialogConfig((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogConfig((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  useEffect(() => {
    async function loadBoardData() {
      if (!categoryId) return;
      try {
        const dbInstance = await getDB();
        setDb(dbInstance);

        const cats = await dbInstance.getCategories();
        const currentCat = cats.find((c) => c.id === categoryId);

        if (!currentCat) {
          router.push("/");
          return;
        }

        setCategory(currentCat);

        const boardImages = await dbInstance.getImages(categoryId);
        setImages(boardImages);
      } catch (error) {
        console.error("Failed to load board details:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadBoardData();
  }, [categoryId, router]);

  const handleUploadImages = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0 || !db || !category) return;

    const filesArray = Array.from(filesList).filter((file) =>
      file.type.startsWith("image/")
    );

    if (filesArray.length === 0) {
      await showAlert("Invalid Files", "Please select valid image files!", "warning");
      return;
    }

    setUploadFilesCount(filesArray.length);
    setUploadCompletedCount(0);
    setUploadProgress(0);
    setIsUploadDone(false);
    setIsUploading(true);

    try {
      const uploaded = await db.uploadImages(category.id, filesArray, (prog) => {
        setUploadProgress(prog);
        const completed = Math.floor((prog / 100) * filesArray.length);
        setUploadCompletedCount(Math.min(completed, filesArray.length));
      });

      setUploadCompletedCount(filesArray.length);
      setUploadProgress(100);
      setIsUploadDone(true);

      const refreshedImages = await db.getImages(category.id);
      setImages(refreshedImages);

      if (!category.coverImageUrl && uploaded.length > 0) {
        setCategory({
          ...category,
          coverImageUrl: uploaded[0].url,
        });
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      await showAlert("Upload Failed", "Something went wrong during image upload. Please try again.", "danger");
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUploadImages(e.target.files);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadImages(e.dataTransfer.files);
    }
  };

  const handleDeleteImage = async (imageId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!db || !category) return;
    const confirmed = await showConfirm(
      "Remove Image",
      "Are you sure you want to remove this image from your vision board?",
      "warning",
      "REMOVE",
      "CANCEL"
    );
    if (!confirmed) return;

    try {
      const previousImages = [...images];
      setImages(images.filter((img) => img.id !== imageId));

      await db.deleteImage(category.id, imageId);

      const currentCover = category.coverImageUrl;
      const deletedWasCover = previousImages.find((img) => img.id === imageId)?.url === currentCover;
      
      if (deletedWasCover) {
        const remainingImages = previousImages.filter((img) => img.id !== imageId);
        setCategory({
          ...category,
          coverImageUrl: remainingImages.length > 0 ? remainingImages[0].url : undefined,
        });
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
      await showAlert("Action Failed", "Failed to delete the image. Please try again.", "danger");
      const refreshedImages = await db.getImages(category.id);
      setImages(refreshedImages);
    }
  };

  const handleDeleteBoard = async () => {
    if (!db || !category) return;
    const confirmed = await showConfirm(
      "Delete Vision Board",
      `CAUTION: Are you sure you want to delete the "${category.name}" vision board? This will permanently delete the board and all ${images.length} images stored within it!`,
      "danger",
      "DELETE BOARD",
      "CANCEL"
    );
    if (!confirmed) return;

    setIsDeletingBoard(true);
    try {
      await db.deleteCategory(category.id);
      router.push("/");
    } catch (error) {
      console.error("Failed to delete category:", error);
      await showAlert("Delete Failed", "Failed to delete the board. Please try again.", "danger");
      setIsDeletingBoard(false);
    }
  };

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          <span className="text-xs font-semibold tracking-wider text-neutral-500 font-display">LOADING BOARD ASSETS...</span>
        </div>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col justify-start relative"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Drag & Drop Visual overlay portal - Monochrome */}
      {isDragActive && (
        <div className="fixed inset-0 z-45 flex items-center justify-center p-8 bg-black/95 border-4 border-dashed border-white/20 backdrop-blur-sm pointer-events-none transition-all duration-300">
          <div className="text-center max-w-sm space-y-4">
            <div className="w-16 h-16 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto animate-bounce">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="font-display font-extrabold text-2xl tracking-widest text-white uppercase">
              DROP TO UPLOAD
            </h2>
            <p className="text-sm text-neutral-400">
              Release to upload all image files into the <strong className="text-white">{category.name}</strong> board.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-neutral-900">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            aria-label="Back to boards"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-black text-2xl sm:text-4xl tracking-widest text-white uppercase text-glow-mono">
              {category.name}
            </h1>
            <p className="text-[10px] text-neutral-500 font-bold mt-1 tracking-widest uppercase">
              {images.length} IMAGE{images.length !== 1 ? "S" : ""} MANIFESTED
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDeleteBoard}
            disabled={isDeletingBoard}
            className="px-4 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 hover:border-neutral-700 font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isDeletingBoard ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>DELETE BOARD</span>
          </button>
          
          <button
            onClick={triggerFileInput}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-black" />
            <span>UPLOAD</span>
          </button>
        </div>
      </div>

      {/* Main Images Display Grid */}
      {images.length === 0 ? (
        <div 
          onClick={triggerFileInput}
          className="flex-grow flex flex-col items-center justify-center border border-dashed border-neutral-800 hover:border-neutral-500 bg-neutral-950/20 hover:bg-neutral-900/30 rounded-xl p-16 text-center transition-all cursor-pointer select-none"
        >
          <div className="w-16 h-16 rounded-lg bg-neutral-900 border border-neutral-850 flex items-center justify-center text-neutral-400 mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-neutral-300 font-display uppercase tracking-widest mb-1">
            This Board is Vacant
          </h3>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
            Drag and drop your visual aspirations here, or click to upload multiple image files simultaneously.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              onClick={() => handleOpenLightbox(index)}
              className="group relative aspect-square rounded-xl overflow-hidden glass-panel border border-neutral-900 hover:border-white/20 cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.04)] transition-all duration-300"
            >
              <img
                src={image.url}
                alt={image.name || "Manifest Image"}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 pointer-events-none">
                <span className="text-[10px] font-bold text-white tracking-widest truncate max-w-full uppercase">
                  {image.name}
                </span>
              </div>

              {/* Delete button — always visible on mobile, hover-only on desktop */}
              <button
                onClick={(e) => handleDeleteImage(image.id, e)}
                className="absolute top-2 right-2 p-1.5 sm:p-2 rounded-lg bg-black/80 border border-neutral-800 text-neutral-400 hover:bg-white hover:text-black hover:border-white transition-all sm:opacity-0 sm:group-hover:opacity-100 opacity-100 z-20 focus:opacity-100 cursor-pointer"
                title="Remove Image"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <UploadModal
        isOpen={isUploading}
        progress={uploadProgress}
        filesCount={uploadFilesCount}
        completedCount={uploadCompletedCount}
        isDone={isUploadDone}
        onClose={() => setIsUploading(false)}
      />

      <Lightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={images}
        currentIndex={lightboxIndex}
        setCurrentIndex={setLightboxIndex}
      />

      <CustomDialog {...dialogConfig} />
    </div>
  );
}
