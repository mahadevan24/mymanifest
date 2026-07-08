import { IndexedDBService } from "./indexeddb-db";
import { FirebaseDBService } from "./firebase";
import { Category, VisionImage } from "./db";

/**
 * Clears all local IndexedDB boards/images without uploading anything to the cloud.
 * Use this when data has already been manually uploaded to avoid duplicates.
 */
export async function clearLocalData(): Promise<void> {
  const localDb = new IndexedDBService();
  const localCategories = await localDb.getCategories();
  for (const cat of localCategories) {
    await localDb.deleteCategory(cat.id);
  }
}

// Convert base64 data URL to standard File object
async function base64ToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

export interface MigrationStatus {
  step: string;
  progress: number; // percentage (0 to 100)
}

export async function runLocalToCloudMigration(
  onProgress?: (status: MigrationStatus) => void
): Promise<void> {
  const localDb = new IndexedDBService();
  const cloudDb = new FirebaseDBService();

  // 1. Scan local database
  if (onProgress) onProgress({ step: "Scanning local database...", progress: 5 });
  const localCategories = await localDb.getCategories();
  
  if (localCategories.length === 0) {
    if (onProgress) onProgress({ step: "No local data found.", progress: 100 });
    return;
  }

  // 2. Fetch all local images to figure out total count
  const itemsToMigrate: { category: Category; images: VisionImage[] }[] = [];
  let totalImagesCount = 0;
  for (const cat of localCategories) {
    const images = await localDb.getImages(cat.id);
    itemsToMigrate.push({ category: cat, images });
    totalImagesCount += images.length;
  }

  if (onProgress) {
    onProgress({
      step: `Found ${localCategories.length} boards and ${totalImagesCount} images. Starting migration...`,
      progress: 10
    });
  }

  let imagesMigrated = 0;

  for (let i = 0; i < itemsToMigrate.length; i++) {
    const { category, images } = itemsToMigrate[i];
    
    // Create/match Category in Firestore
    if (onProgress) {
      onProgress({
        step: `Syncing board "${category.name}" to Cloud...`,
        progress: Math.round(10 + (i / itemsToMigrate.length) * 20)
      });
    }

    // Check if category already exists in Firestore (match by uppercase name)
    const cloudCategories = await cloudDb.getCategories();
    let cloudCategory = cloudCategories.find(
      (c) => c.name.toUpperCase() === category.name.toUpperCase()
    );

    if (!cloudCategory) {
      cloudCategory = await cloudDb.createCategory(category.name, category.type);
    }

    // Fetch existing cloud images for this category to deduplicate by name
    const existingCloudImages = await cloudDb.getImages(cloudCategory.id);
    const existingNames = new Set(
      existingCloudImages.map((img) => img.name?.toLowerCase())
    );

    // Upload all images belonging to this category to Cloudinary + Firestore
    for (let j = 0; j < images.length; j++) {
      const img = images[j];
      
      imagesMigrated++;
      const currentProgress = Math.round(
        30 + (imagesMigrated / Math.max(totalImagesCount, 1)) * 60
      );

      // Skip images already uploaded (matched by filename, case-insensitive)
      if (existingNames.has(img.name?.toLowerCase())) {
        if (onProgress) {
          onProgress({
            step: `Skipping "${img.name}" — already in cloud (${imagesMigrated}/${totalImagesCount})`,
            progress: currentProgress
          });
        }
        continue;
      }

      if (onProgress) {
        onProgress({
          step: `Uploading "${img.name}" to Cloudinary (${imagesMigrated}/${totalImagesCount})...`,
          progress: currentProgress
        });
      }

      try {
        // Convert base64 data url back to a File
        const fileObj = await base64ToFile(img.url, img.name || "image.jpg");
        // Upload via Cloud DB
        await cloudDb.uploadImages(cloudCategory.id, [fileObj]);
      } catch (e) {
        console.error(`Migration failed for image ${img.name}:`, e);
      }
    }
  }

  // 3. Clear local storage once successfully migrated
  if (onProgress) {
    onProgress({
      step: "Cleaning up local browser database...",
      progress: 95
    });
  }

  // Delete category metadata and images in IndexedDB to avoid double-migration
  for (const cat of localCategories) {
    await localDb.deleteCategory(cat.id);
  }

  if (onProgress) {
    onProgress({
      step: "Migration complete!",
      progress: 100
    });
  }
}
