export interface Category {
  id: string;
  name: string;
  coverImageUrl?: string;
  createdAt: number;
  type?: "cause" | "effect";
  order?: number;
}

export interface VisionImage {
  id: string;
  categoryId: string;
  url: string;
  name: string;
  createdAt: number;
  publicId?: string;
}

export interface DBService {
  isFirebase: boolean;
  getCategories(): Promise<Category[]>;
  createCategory(name: string, type?: "cause" | "effect"): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getImages(categoryId: string): Promise<VisionImage[]>;
  uploadImages(categoryId: string, files: File[], onProgress?: (progress: number) => void): Promise<VisionImage[]>;
  deleteImage(categoryId: string, imageId: string): Promise<void>;
  updateImageName(categoryId: string, imageId: string, name: string): Promise<void>;
  updateCategoryName(categoryId: string, name: string): Promise<void>;
  updateCategoryOrder(orderedIds: string[]): Promise<void>;
}

// Config checker helper
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
}

// Singleton database instance holder
let dbInstance: DBService | null = null;

export async function getDB(): Promise<DBService> {
  if (dbInstance) return dbInstance;

  // Since we execute in Next.js which can SSR, check if we are in client browser
  if (typeof window === "undefined") {
    // Return a dummy service for server-side rendering
    return {
      isFirebase: false,
      getCategories: async () => [],
      createCategory: async () => ({ id: "", name: "", createdAt: 0 }),
      deleteCategory: async () => {},
      getImages: async () => [],
      uploadImages: async () => [],
      deleteImage: async () => {},
      updateImageName: async () => {},
      updateCategoryName: async () => {},
      updateCategoryOrder: async () => {},
    };
  }

  // Live configuration detection
  // Check if credentials are set in environment variables
  const hasEnvConfig = isFirebaseConfigured();

  if (hasEnvConfig) {
    try {
      const { FirebaseDBService } = await import("./firebase");
      dbInstance = new FirebaseDBService();
      console.log("Database initialized: Firebase Cloud Storage & Firestore");
      return dbInstance;
    } catch (e) {
      console.error("Failed to initialize Firebase, falling back to IndexedDB:", e);
    }
  }

  const { IndexedDBService } = await import("./indexeddb-db");
  dbInstance = new IndexedDBService();
  console.log("Database initialized: Local IndexedDB Browser Storage");
  return dbInstance;
}
