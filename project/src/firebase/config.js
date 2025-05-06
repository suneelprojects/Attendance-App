import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence
} from 'firebase/firestore';

const firebaseConfig = {
  
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:  import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Auth persistence error:', error);
});

const db = initializeFirestore(app, {
  cache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabSynchronization: true
  }),
  useFetchStreams: false,
  experimentalAutoDetectLongPolling: true
});

if (typeof window !== 'undefined') {
  try {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        enableIndexedDbPersistence(db, {
          synchronizeTabs: true
        }).catch((error) => {
          console.warn('Single-tab persistence fallback error:', error);
        });
      } else {
        console.error('Persistence initialization error:', err);
      }
    });
  } catch (err) {
    console.error('Firebase persistence setup error:', err);
  }
}

export { auth, db };