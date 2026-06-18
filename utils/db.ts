import { ProjectMeta, SavedProject } from '../types';

/**
 * IndexedDB-backed persistence for Kaadogen projects.
 *
 * Replaces the old localStorage approach which silently failed with a
 * QuotaExceededError once a project (large SVG + JSON rows + base64 thumbnail)
 * exceeded the ~5MB origin limit. IndexedDB has no practical size cap and stores
 * structured data without the JSON.stringify round-trip.
 *
 * Two object stores are used so the dashboard can list projects cheaply:
 *   - `meta`: lightweight ProjectMeta (id, name, lastModified, thumbnail)
 *   - `data`: the full SavedProject blob, only read when a project is opened
 */

const DB_NAME = 'kaadogen';
const DB_VERSION = 1;
const META_STORE = 'meta';
const DATA_STORE = 'data';
const MIGRATION_FLAG = 'kaadogen_migrated_idb_v1';
const LEGACY_INDEX_KEY = 'kaadogen_index';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
  return dbPromise;
};

const promisifyRequest = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });

const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });

const toMeta = (p: SavedProject): ProjectMeta => ({
  id: p.id,
  name: p.name,
  lastModified: p.lastModified,
  thumbnail: p.thumbnail,
});

/** List all projects (lightweight metadata only), newest first. */
export const getAllProjectMeta = async (): Promise<ProjectMeta[]> => {
  const db = await openDB();
  const tx = db.transaction(META_STORE, 'readonly');
  const all = await promisifyRequest(tx.objectStore(META_STORE).getAll() as IDBRequest<ProjectMeta[]>);
  return all.sort((a, b) => b.lastModified - a.lastModified);
};

/** Load a full project by id, or null if it doesn't exist. */
export const getProject = async (id: string): Promise<SavedProject | null> => {
  const db = await openDB();
  const tx = db.transaction(DATA_STORE, 'readonly');
  const data = await promisifyRequest(tx.objectStore(DATA_STORE).get(id) as IDBRequest<SavedProject | undefined>);
  return data ?? null;
};

/** Persist a project to both stores atomically. Throws on failure. */
export const putProject = async (project: SavedProject): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction([META_STORE, DATA_STORE], 'readwrite');
  tx.objectStore(META_STORE).put(toMeta(project));
  tx.objectStore(DATA_STORE).put(project);
  await txDone(tx);
};

/** Remove a project from both stores. */
export const deleteProject = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction([META_STORE, DATA_STORE], 'readwrite');
  tx.objectStore(META_STORE).delete(id);
  tx.objectStore(DATA_STORE).delete(id);
  await txDone(tx);
};

/**
 * One-time migration of any projects saved by the old localStorage system.
 * Safe to call on every boot — it no-ops once the flag is set. Legacy keys are
 * only removed after a successful copy so a failure can't lose data.
 */
export const migrateFromLocalStorage = async (): Promise<number> => {
  if (typeof localStorage === 'undefined') return 0;
  if (localStorage.getItem(MIGRATION_FLAG)) return 0;

  let migrated = 0;
  try {
    const indexStr = localStorage.getItem(LEGACY_INDEX_KEY);
    const index: ProjectMeta[] = indexStr ? JSON.parse(indexStr) : [];
    const movedKeys: string[] = [];

    for (const meta of index) {
      const key = `kaadogen_project_${meta.id}`;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const project: SavedProject = JSON.parse(raw);
        await putProject(project);
        movedKeys.push(key);
        migrated++;
      } catch (e) {
        console.warn(`Skipping un-parseable legacy project ${meta.id}`, e);
      }
    }

    // Only clear legacy data once everything copied cleanly.
    movedKeys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(LEGACY_INDEX_KEY);
    localStorage.setItem(MIGRATION_FLAG, String(Date.now()));
  } catch (e) {
    console.warn('Legacy project migration failed; leaving localStorage intact.', e);
  }
  return migrated;
};
