import { DBService, Category, VisionImage } from "./db";

export class IndexedDBService implements DBService {
  public isFirebase = false;
  private dbName = "VisionBoardDB";
  private dbVersion = 1;

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("images")) {
          const imageStore = db.createObjectStore("images", { keyPath: "id" });
          imageStore.createIndex("categoryId", "categoryId", { unique: false });
        }
      };
    });
  }

  async getCategories(): Promise<Category[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("categories", "readonly");
      const store = transaction.objectStore("categories");
      const request = store.getAll();

      request.onsuccess = () => {
        const categories = request.result as Category[];
        // Sort by createdAt descending
        resolve(categories.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createCategory(name: string): Promise<Category> {
    const db = await this.openDB();
    const id = "cat_" + Math.random().toString(36).substring(2, 11);
    const category: Category = {
      id,
      name,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("categories", "readwrite");
      const store = transaction.objectStore("categories");
      const request = store.add(category);

      request.onsuccess = () => resolve(category);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await this.openDB();
    // 1. Delete category metadata
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("categories", "readwrite");
      const store = transaction.objectStore("categories");
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 2. Delete all images belonging to this category
    const images = await this.getImages(id);
    const transaction = db.transaction("images", "readwrite");
    const store = transaction.objectStore("images");
    for (const img of images) {
      store.delete(img.id);
    }
  }

  async getImages(categoryId: string): Promise<VisionImage[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("images", "readonly");
      const store = transaction.objectStore("images");
      const index = store.index("categoryId");
      const request = index.getAll(categoryId);

      request.onsuccess = () => {
        const images = request.result as VisionImage[];
        // Sort by createdAt descending
        resolve(images.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async uploadImages(
    categoryId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<VisionImage[]> {
    const uploadedImages: VisionImage[] = [];
    let completedCount = 0;

    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64Url = await fileToBase64(file);
        const imageId = "img_" + Math.random().toString(36).substring(2, 11);
        const newImage: VisionImage = {
          id: imageId,
          categoryId,
          url: base64Url,
          name: file.name,
          createdAt: Date.now() + i, // slight offset to maintain order
        };

        const db = await this.openDB();
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction("images", "readwrite");
          const store = transaction.objectStore("images");
          const request = store.add(newImage);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        uploadedImages.push(newImage);
      } catch (error) {
        console.error(`Failed to convert/upload file ${file.name}:`, error);
      }

      completedCount++;
      if (onProgress) {
        onProgress(Math.round((completedCount / files.length) * 100));
      }
    }

    // Update category cover image if it doesn't have one
    if (uploadedImages.length > 0) {
      const db = await this.openDB();
      const category = await new Promise<Category | null>((resolve, reject) => {
        const transaction = db.transaction("categories", "readonly");
        const store = transaction.objectStore("categories");
        const request = store.get(categoryId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

      if (category && !category.coverImageUrl) {
        category.coverImageUrl = uploadedImages[0].url;
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction("categories", "readwrite");
          const store = transaction.objectStore("categories");
          const request = store.put(category);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    return uploadedImages;
  }

  async deleteImage(categoryId: string, imageId: string): Promise<void> {
    const db = await this.openDB();
    // 1. Delete image
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("images", "readwrite");
      const store = transaction.objectStore("images");
      const request = store.delete(imageId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 2. Adjust category cover image if this was the cover image
    const category = await new Promise<Category | null>((resolve, reject) => {
      const transaction = db.transaction("categories", "readonly");
      const store = transaction.objectStore("categories");
      const request = store.get(categoryId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (category) {
      const images = await this.getImages(categoryId);
      if (images.length > 0) {
        category.coverImageUrl = images[0].url;
      } else {
        delete category.coverImageUrl;
      }

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("categories", "readwrite");
        const store = transaction.objectStore("categories");
        const request = store.put(category);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}
