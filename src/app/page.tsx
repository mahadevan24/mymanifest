"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Loader2, CloudUpload } from "lucide-react";
import { getDB, Category, DBService } from "@/lib/db";
import { seedDatabaseIfEmpty } from "@/lib/mock-data";
import { IndexedDBService } from "@/lib/indexeddb-db";
import { runLocalToCloudMigration, clearLocalData, MigrationStatus } from "@/lib/migration";
import CategoryCard from "@/components/category-card";
import Modal from "@/components/ui/modal";
import confetti from "canvas-confetti";
import CustomDialog from "@/components/ui/custom-dialog";

export default function LandingPage() {
  const [db, setDb] = useState<DBService | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"effect" | "cause">("effect");

  const filteredCategories = categories.filter(
    (cat) => (cat.type || "effect") === activeTab
  );

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<EventTarget | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    dragNodeRef.current = e.target;
    // Use setTimeout so the browser captures the element before we style it
    setTimeout(() => {
      setDragIndex(index);
    }, 0);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    setOverIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }

    // Reorder the filtered list
    const reordered = [...filteredCategories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(overIndex, 0, moved);

    // Build new full categories array preserving the other tab's categories
    const otherCategories = categories.filter(
      (cat) => (cat.type || "effect") !== activeTab
    );
    const updatedReordered = reordered.map((cat, i) => ({ ...cat, order: i }));
    setCategories([...otherCategories, ...updatedReordered]);

    // Persist order to DB
    if (db) {
      try {
        await db.updateCategoryOrder(reordered.map((cat) => cat.id));
      } catch (error) {
        console.error("Failed to save category order:", error);
      }
    }

    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, filteredCategories, categories, activeTab, db]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  const [hasLocalData, setHasLocalData] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    step: "",
    progress: 0,
  });

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
    async function initDB() {
      try {
        const dbInstance = await getDB();
        setDb(dbInstance);
        await seedDatabaseIfEmpty(dbInstance);
        const cats = await dbInstance.getCategories();
        setCategories(cats);

        if (dbInstance.isFirebase) {
          const localDb = new IndexedDBService();
          const localCats = await localDb.getCategories();
          if (localCats.length > 0) {
            setHasLocalData(true);
          }
        }
      } catch (error) {
        console.error("Database initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initDB();
  }, []);

  const handleStartMigration = async () => {
    setIsMigrating(true);
    try {
      await runLocalToCloudMigration((status) => {
        setMigrationStatus(status);
      });
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#d97706", "#f59e0b", "#ffffff", "#171717"],
      });
      setHasLocalData(false);
      
      if (db) {
        const cats = await db.getCategories();
        setCategories(cats);
      }
    } catch (error) {
      console.error("Migration failed:", error);
      await showAlert("Migration Failed", "Something went wrong while migrating your data. Please try again.", "danger");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearLocalData = async () => {
    const confirmed = await showConfirm(
      "Discard Local Data?",
      "This will permanently discard all local browser data without uploading anything. Continue?",
      "danger",
      "DISCARD DATA",
      "KEEP DATA"
    );
    if (!confirmed) return;
    try {
      await clearLocalData();
      setHasLocalData(false);
    } catch (error) {
      console.error("Failed to clear local data:", error);
      await showAlert("Action Failed", "Failed to clear local data. Please try again.", "danger");
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim() || !db) return;

    setIsSubmitting(true);
    try {
      const newCat = await db.createCategory(newBoardName.trim().toUpperCase(), activeTab);
      
      // Monochrome elegant confetti burst
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#ffffff", "#a3a3a3", "#525252", "#171717"],
      });

      setNewBoardName("");
      setIsModalOpen(false);
      
      const updatedCats = await db.getCategories();
      setCategories(updatedCats);
    } catch (error) {
      console.error("Failed to create vision board:", error);
      await showAlert("Initialization Failed", "Failed to create board. Please try again.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col relative" style={{ height: '100vh' }}>
      
      {/* Hover-reveal tab bar at top */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center group/tabs"
      >
        {/* Invisible hover trigger zone */}
        <div className="w-full h-6" />
        {/* Tab pill — slides down on hover */}
        <div className="opacity-0 -translate-y-4 group-hover/tabs:opacity-100 group-hover/tabs:translate-y-0 transition-all duration-300 ease-out pointer-events-none group-hover/tabs:pointer-events-auto mt-1">
          <div className="flex bg-black/80 backdrop-blur-xl p-1 rounded-xl border border-neutral-800 shadow-2xl shadow-black/50">
            <button
              onClick={() => setActiveTab("effect")}
              className={`px-6 py-2 rounded-lg font-display text-[10px] font-bold tracking-widest transition-all duration-300 cursor-pointer ${
                activeTab === "effect"
                  ? "bg-white text-black shadow-md"
                  : "text-neutral-500 hover:text-neutral-300 bg-transparent"
              }`}
            >
              EFFECTS
            </button>
            <button
              onClick={() => setActiveTab("cause")}
              className={`px-6 py-2 rounded-lg font-display text-[10px] font-bold tracking-widest transition-all duration-300 cursor-pointer ${
                activeTab === "cause"
                  ? "bg-white text-black shadow-md"
                  : "text-neutral-500 hover:text-neutral-300 bg-transparent"
              }`}
            >
              CAUSES
            </button>
          </div>
        </div>
      </div>

      {/* Grid Display Section */}
      {isLoading ? (
        <div className="flex-grow flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
            <span className="text-xs font-semibold tracking-wider text-neutral-500 font-display">LOADING MANIFESTS...</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 h-full" style={{ gridTemplateRows: '1fr 1fr' }}>
            {filteredCategories.map((category, index) => (
              <div
                key={category.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className="relative h-full"
                style={{ cursor: "grab" }}
              >
                <CategoryCard
                  category={category}
                  isDragging={dragIndex === index}
                  isOver={overIndex === index && dragIndex !== index}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewBoardName("");
        }}
        title={activeTab === "effect" ? "Create Vision Board" : "Create Cause Manifestation"}
      >
        <form onSubmit={handleCreateBoard} autoComplete="off" className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="board-name" className="text-xs font-semibold text-neutral-400 tracking-wider">
              {activeTab === "effect" ? "BOARD NAME" : "CAUSE NAME"}
            </label>
            <input
              id="board-name"
              type="text"
              required
              autoComplete="off"
              placeholder={
                activeTab === "effect"
                  ? "e.g. APARTMENT, CARS, TRAVEL, DREAMS"
                  : "e.g. JOINING A COMPANY, UNDERSTANDING FIRST PRINCIPLES"
              }
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:border-white focus:outline-none transition-colors"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newBoardName.trim()}
            className="w-full py-3 mt-2 rounded-lg bg-white text-black font-bold tracking-wider hover:bg-neutral-200 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Plus className="w-4 h-4 text-black" />
            )}
            <span>{activeTab === "effect" ? "INITIALIZE BOARD" : "INITIALIZE CAUSE"}</span>
          </button>
        </form>
      </Modal>

      {/* Migration Progress Modal */}
      <Modal
        isOpen={isMigrating}
        onClose={() => {}}
        title="Syncing Local Data to Cloud"
      >
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin absolute" />
            <CloudUpload className="w-6 h-6 text-amber-200" />
          </div>
          
          <div className="space-y-2 w-full">
            <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">
              <span>SYNC IN PROGRESS</span>
              <span>{migrationStatus.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-850">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${migrationStatus.progress}%` }}
              />
            </div>
            <p className="text-xs text-neutral-400 font-semibold tracking-wider italic pt-2">
              {migrationStatus.step}
            </p>
          </div>
        </div>
      </Modal>

      <CustomDialog {...dialogConfig} />
    </div>
  );
}
