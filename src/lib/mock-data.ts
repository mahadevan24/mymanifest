import { DBService, Category, VisionImage } from "./db";

interface SeedCategory {
  name: string;
  images: { name: string; url: string }[];
}

const SEED_DATA: SeedCategory[] = [
  {
    name: "APARTMENT",
    images: [
      {
        name: "Modern Living Space",
        url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Sleek Kitchen Interior",
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Minimalist Master Bedroom",
        url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Penthouse Balcony View",
        url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    name: "CARS",
    images: [
      {
        name: "Electric Sports Car",
        url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Vintage Roadster",
        url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Modern Supercar",
        url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "German Performance Coupe",
        url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    name: "BIKES",
    images: [
      {
        name: "Custom Cafe Racer",
        url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Street Fighter Motorcycle",
        url: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Vintage Cruiser",
        url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Adventure Offroad Bike",
        url: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
];

export async function seedDatabaseIfEmpty(db: DBService): Promise<void> {
  // Only seed if empty
  const existingCategories = await db.getCategories();
  if (existingCategories.length > 0) {
    return;
  }

  console.log("Seeding empty database with sample vision boards...");

  // We are bypassing the standard uploadImages File-based API to write raw URL structures 
  // into the IndexedDB database directly or write them to Firestore.
  // We can write seed helpers matching the backend.
  if (db.isFirebase) {
    // For firebase we can initialize via firestore setDoc
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      // Grab db ref from the FirebaseDBService
      // @ts-ignore
      const firestore = db.db;

      for (const item of SEED_DATA) {
        const catId = "cat_" + Math.random().toString(36).substring(2, 11);
        const category: Category = {
          id: catId,
          name: item.name,
          coverImageUrl: item.images[0].url,
          createdAt: Date.now() - SEED_DATA.indexOf(item) * 1000,
        };
        await setDoc(doc(firestore, "categories", catId), category);

        for (let i = 0; i < item.images.length; i++) {
          const img = item.images[i];
          const imgId = "img_" + Math.random().toString(36).substring(2, 11);
          const visionImage: VisionImage = {
            id: imgId,
            categoryId: catId,
            url: img.url,
            name: img.name,
            createdAt: Date.now() + i - SEED_DATA.indexOf(item) * 10000,
          };
          await setDoc(doc(firestore, "images", imgId), visionImage);
        }
      }
    } catch (e) {
      console.error("Firebase seeding failed:", e);
    }
  } else {
    // For IndexedDB
    try {
      // @ts-ignore
      const openDbRequest = db.openDB();
      const rawDb: IDBDatabase = await openDbRequest;
      
      for (const item of SEED_DATA) {
        const catId = "cat_" + Math.random().toString(36).substring(2, 11);
        const category: Category = {
          id: catId,
          name: item.name,
          coverImageUrl: item.images[0].url,
          createdAt: Date.now() - SEED_DATA.indexOf(item) * 1000,
        };

        // Write Category
        await new Promise<void>((resolve, reject) => {
          const trans = rawDb.transaction("categories", "readwrite");
          const store = trans.objectStore("categories");
          const req = store.add(category);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });

        // Write Images
        for (let i = 0; i < item.images.length; i++) {
          const img = item.images[i];
          const imgId = "img_" + Math.random().toString(36).substring(2, 11);
          const visionImage: VisionImage = {
            id: imgId,
            categoryId: catId,
            url: img.url,
            name: img.name,
            createdAt: Date.now() + i - SEED_DATA.indexOf(item) * 10000,
          };

          await new Promise<void>((resolve, reject) => {
            const trans = rawDb.transaction("images", "readwrite");
            const store = trans.objectStore("images");
            const req = store.add(visionImage);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }
    } catch (e) {
      console.error("IndexedDB seeding failed:", e);
    }
  }
}
