import { openDB } from 'idb';

const DB_NAME = 'primecommerce-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'uid' });
      }
    },
  });
};

export const saveProducts = async (products: any[]) => {
  const db = await initDB();
  const tx = db.transaction('products', 'readwrite');
  for (const product of products) {
    await tx.store.put(product);
  }
  await tx.done;
};

export const getProducts = async () => {
  const db = await initDB();
  return db.getAll('products');
};

export const saveUser = async (user: any) => {
  const db = await initDB();
  await db.put('users', user);
};

export const getUser = async (uid: string) => {
  const db = await initDB();
  return db.get('users', uid);
};
