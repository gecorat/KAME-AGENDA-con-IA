import {
  getFirestore,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { getApps, initializeApp, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { Appointment, Patient, Service, PracticeSettings, WaitlistEntry } from '../types';

// Ensure Firebase App is initialized
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Export auth utilities
export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
};
export type { FirebaseUser };

let isConnected = false;

// Mandatory initial connection verification according to Firebase skill
export const testConnection = async (): Promise<boolean> => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    isConnected = true;
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Operating with local cache.');
      return false;
    }
    // A permission-denied or non-existent document still confirms connectivity
    isConnected = true;
    return true;
  }
};

// Initial trigger
testConnection();

// Collection Names
export const COLLECTIONS = {
  APPOINTMENTS: 'appointments',
  PATIENTS: 'patients',
  SERVICES: 'services',
  SETTINGS: 'settings',
  WAITLIST: 'waitlist'
};

/**
 * Save or update an appointment in Firestore
 */
export const saveAppointmentToFirestore = async (appointment: Appointment): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.APPOINTMENTS, appointment.id);
    await setDoc(docRef, appointment, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving appointment to Firestore:', error);
    return false;
  }
};

/**
 * Delete an appointment from Firestore
 */
export const deleteAppointmentFromFirestore = async (appointmentId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.APPOINTMENTS, appointmentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting appointment from Firestore:', error);
    return false;
  }
};

/**
 * Save or update a patient in Firestore
 */
export const savePatientToFirestore = async (patient: Patient): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.PATIENTS, patient.id);
    await setDoc(docRef, patient, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving patient to Firestore:', error);
    return false;
  }
};

/**
 * Save practice settings in Firestore
 */
export const saveSettingsToFirestore = async (settings: PracticeSettings): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'practice_config');
    await setDoc(docRef, settings, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving settings to Firestore:', error);
    return false;
  }
};

/**
 * Save waitlist entry to Firestore
 */
export const saveWaitlistToFirestore = async (entry: WaitlistEntry): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.WAITLIST, entry.id);
    await setDoc(docRef, entry, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving waitlist to Firestore:', error);
    return false;
  }
};

/**
 * Subscribe to real-time appointments from Firestore
 */
export const subscribeToAppointments = (
  onData: (appointments: Appointment[]) => void,
  onError?: (err: Error) => void
) => {
  const colRef = collection(db, COLLECTIONS.APPOINTMENTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const items: Appointment[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as Appointment);
        });
        onData(items);
      }
    },
    (err) => {
      console.warn('Firestore appointments listener notice:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Subscribe to real-time practice settings from Firestore
 */
export const subscribeToSettings = (
  onData: (settings: PracticeSettings) => void
) => {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'practice_config');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as PracticeSettings);
      }
    },
    (err) => console.warn('Firestore settings listener notice:', err)
  );
};
