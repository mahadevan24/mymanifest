import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  getDoc,
  query,
  where,
  Firestore
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  FirebaseStorage
} from "firebase/storage";
import { DBService, Category, VisionImage } from "./db";

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export class FirebaseDBService implements DBService {
  public isFirebase = true;
  private app: FirebaseApp;
  private db: Firestore;
  private storage: FirebaseStorage;

  constructor() {
    const config = getFirebaseConfig();
    this.app = getApps().length === 0 ? initializeApp(config) : getApp();
    this.db = getFirestore(this.app);
    this.storage = getStorage(this.app);
  }

  async getCategories(): Promise<Category[]> {
    const catsCol = collection(this.db, "categories");
    const snapshot = await getDocs(catsCol);
    const categories: Category[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      categories.push({
        id: doc.id,
        name: data.name,
        coverImageUrl: data.coverImageUrl,
        createdAt: data.createdAt,
      });
    });
    // Sort client-side to avoid requiring a Firestore composite index
    return categories.sort((a, b) => b.createdAt - a.createdAt);
  }

  async createCategory(name: string): Promise<Category> {
    const id = "cat_" + Math.random().toString(36).substring(2, 11);
    const category: Category = {
      id,
      name,
      createdAt: Date.now(),
    };
    await setDoc(doc(this.db, "categories", id), category);
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    // 1. Delete all images metadata and storage files
    const images = await this.getImages(id);
    for (const img of images) {
      await this.deleteImage(id, img.id);
    }
    // 2. Delete the category itself
    await deleteDoc(doc(this.db, "categories", id));
  }

  async getImages(categoryId: string): Promise<VisionImage[]> {
    const imgsCol = collection(this.db, "images");
    const q = query(
      imgsCol,
      where("categoryId", "==", categoryId)
    );
    const snapshot = await getDocs(q);
    const images: VisionImage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      images.push({
        id: doc.id,
        categoryId: data.categoryId,
        url: data.url,
        name: data.name,
        createdAt: data.createdAt,
        publicId: data.publicId,
      });
    });
    // Sort client-side to avoid requiring a Firestore composite index
    return images.sort((a, b) => b.createdAt - a.createdAt);
  }

  async uploadImages(
    categoryId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<VisionImage[]> {
    const uploadedImages: VisionImage[] = [];
    let completedCount = 0;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary configuration missing in environment variables.");
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageId = "img_" + Math.random().toString(36).substring(2, 11);
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", `mymanifest/categories/${categoryId}`);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || "Upload failed");
        }

        const data = await response.json();
        const newImage: VisionImage = {
          id: imageId,
          categoryId,
          url: data.secure_url,
          name: file.name,
          createdAt: Date.now() + i,
          publicId: data.public_id,
        };

        // Save image metadata in Firestore
        await setDoc(doc(this.db, "images", imageId), newImage);
        uploadedImages.push(newImage);
      } catch (error) {
        console.error(`Failed to upload ${file.name} to Cloudinary:`, error);
      }

      completedCount++;
      if (onProgress) {
        onProgress(Math.round((completedCount / files.length) * 100));
      }
    }

    // Set first uploaded image as category cover if it doesn't already have one
    if (uploadedImages.length > 0) {
      const catDocRef = doc(this.db, "categories", categoryId);
      const catSnap = await getDoc(catDocRef);
      if (catSnap.exists()) {
        const catData = catSnap.data();
        if (!catData.coverImageUrl) {
          await updateDoc(catDocRef, {
            coverImageUrl: uploadedImages[0].url
          });
        }
      }
    }

    return uploadedImages;
  }

  async deleteImage(categoryId: string, imageId: string): Promise<void> {
    const imgDocRef = doc(this.db, "images", imageId);
    const imgSnap = await getDoc(imgDocRef);
    
    if (imgSnap.exists()) {
      const imgData = imgSnap.data();
      const publicId = imgData.publicId;
      
      // 1. Delete metadata from Firestore
      await deleteDoc(imgDocRef);

      // 2. Delete file from Cloudinary via api endpoint
      if (publicId) {
        try {
          const res = await fetch("/api/cloudinary/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ publicId }),
          });
          if (!res.ok) {
            const errJson = await res.json();
            console.error("Failed to delete image asset from Cloudinary:", errJson);
          }
        } catch (error) {
          console.error("Failed to connect to Cloudinary delete endpoint:", error);
        }
      }
    }

    // 3. Update category cover image if needed
    const catDocRef = doc(this.db, "categories", categoryId);
    const catSnap = await getDoc(catDocRef);
    if (catSnap.exists()) {
      const images = await this.getImages(categoryId);
      if (images.length > 0) {
        await updateDoc(catDocRef, { coverImageUrl: images[0].url });
      } else {
        await updateDoc(catDocRef, { coverImageUrl: null });
      }
    }
  }
}
