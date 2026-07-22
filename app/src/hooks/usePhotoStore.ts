import { useEffect, useState } from "react";

export interface StoredPhoto {
  id: number;
  dataUrl: string;
  caption: string;
  takenAt: string;
}

const DB_NAME = "rj2025-photos";
const STORE   = "photos";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGetAll(): Promise<StoredPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbAdd(photo: Omit<StoredPhoto, "id">): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(photo);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror   = () => reject(req.error);
  });
}

async function dbDelete(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export function usePhotoStore() {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);

  useEffect(() => {
    dbGetAll().then(setPhotos).catch(console.error);
  }, []);

  async function addPhoto(dataUrl: string, caption: string) {
    const takenAt = new Date().toLocaleString("pt-BR");
    const id = await dbAdd({ dataUrl, caption, takenAt });
    setPhotos((prev) => [...prev, { id, dataUrl, caption, takenAt }]);
  }

  async function deletePhoto(id: number) {
    await dbDelete(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return { photos, addPhoto, deletePhoto };
}
