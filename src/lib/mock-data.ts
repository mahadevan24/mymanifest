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

const SEED_CAUSES: SeedCategory[] = [
  {
    name: "JOINING A PRODUCT BASED COMPANY WITH 40LPA",
    images: [
      {
        name: "Developer Writing Code",
        url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Modern Workplace Workspace",
        url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Working at Desk Laptop Setup",
        url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    name: "UNDERSTANDING THINGS IN FIRST PRINCIPLES",
    images: [
      {
        name: "Mechanical Blueprint and Gears",
        url: "https://images.unsplash.com/photo-1453733190148-c44698c26588?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Architectural Drafting Workspace",
        url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Logical Reasoning and Analysis",
        url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    name: "FUNDAMENTALS OF PHYSICS, MATH & CS",
    images: [
      {
        name: "Abstract Physics and Light Waves",
        url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Advanced Equations on Chalkboard",
        url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Binary Coding and Circuit Matrix",
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
];

export async function seedDatabaseIfEmpty(db: DBService): Promise<void> {
  const existingCategories = await db.getCategories();
  
  const hasEffects = existingCategories.some((c) => (c.type || "effect") === "effect");
  const hasCauses = existingCategories.some((c) => c.type === "cause");

  const effectsToSeed = !hasEffects ? SEED_DATA : [];
  const causesToSeed = !hasCauses ? SEED_CAUSES : [];

  if (effectsToSeed.length === 0 && causesToSeed.length === 0) {
    return;
  }

  console.log(
    `Seeding database. Effects to seed: ${effectsToSeed.length}, Causes to seed: ${causesToSeed.length}`
  );

  if (db.isFirebase) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      // Grab db ref from the FirebaseDBService
      // @ts-ignore
      const firestore = db.db;

      // Seed effects
      for (let index = 0; index < effectsToSeed.length; index++) {
        const item = effectsToSeed[index];
        const catId = "cat_" + Math.random().toString(36).substring(2, 11);
        const category: Category = {
          id: catId,
          name: item.name,
          coverImageUrl: item.images[0].url,
          createdAt: Date.now() - index * 1000,
          type: "effect",
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
            createdAt: Date.now() + i - index * 10000,
          };
          await setDoc(doc(firestore, "images", imgId), visionImage);
        }
      }

      // Seed causes
      for (let index = 0; index < causesToSeed.length; index++) {
        const item = causesToSeed[index];
        const catId = "cat_" + Math.random().toString(36).substring(2, 11);
        const category: Category = {
          id: catId,
          name: item.name,
          coverImageUrl: item.images[0].url,
          createdAt: Date.now() - index * 1000 - 100000,
          type: "cause",
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
            createdAt: Date.now() + i - index * 10000 - 100000,
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
      
      const seedSet = async (list: SeedCategory[], type: "cause" | "effect") => {
        for (let index = 0; index < list.length; index++) {
          const item = list[index];
          const catId = "cat_" + Math.random().toString(36).substring(2, 11);
          const category: Category = {
            id: catId,
            name: item.name,
            coverImageUrl: item.images[0].url,
            createdAt: Date.now() - index * 1000 - (type === "cause" ? 100000 : 0),
            type,
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
              createdAt: Date.now() + i - index * 10000 - (type === "cause" ? 100000 : 0),
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
      };

      await seedSet(effectsToSeed, "effect");
      await seedSet(causesToSeed, "cause");
    } catch (e) {
      console.error("IndexedDB seeding failed:", e);
    }
  }
}
