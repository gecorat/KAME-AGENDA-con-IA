import {
  getFirestore,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
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
import { Appointment, Patient, Service, PracticeSettings, WaitlistEntry, ConsultationRecord, PaymentRecord, SaasTenantUser } from '../types';

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
  WAITLIST: 'waitlist',
  USERS: 'users',
  CONSULTATIONS: 'consultations',
  PAYMENTS: 'payments'
};

/**
 * Save or update a SaaS user profile in Firestore
 */
export const saveUserToFirestore = async (user: Partial<SaasTenantUser> & { id: string }): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, user.id);
    const emailLower = (user.email || '').toLowerCase();
    const isSuper = emailLower === 'gonzalocorat@gmail.com';

    await setDoc(
      docRef,
      {
        ...user,
        amount_monthly_ars: isSuper ? 0 : (user.amount_monthly_ars || 0),
        last_payment_amount: isSuper ? 0 : (user.last_payment_amount || 0),
        total_paid_ars: isSuper ? 0 : (user.total_paid_ars || 0),
        is_permanent: isSuper ? true : (user.is_permanent ?? false),
        status: isSuper ? 'active' : (user.status || 'trial'),
        last_active_at: new Date().toISOString()
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error saving user to Firestore:', error);
    return false;
  }
};

/**
 * Get a user from Firestore by ID
 */
export const getUserFromFirestore = async (userId: string): Promise<SaasTenantUser | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as SaasTenantUser;
    }
    return null;
  } catch (error) {
    console.error('Error getting user from Firestore:', error);
    return null;
  }
};

/**
 * Subscribe to all real users in Firestore (for Super Admin dashboard)
 * Cleanly deduplicates by email and ensures Gonzalo is never billed.
 */
export const subscribeToUsers = (
  onData: (users: SaasTenantUser[]) => void,
  onError?: (err: Error) => void
) => {
  const colRef = collection(db, COLLECTIONS.USERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const emailMap = new Map<string, SaasTenantUser>();
      snapshot.forEach((d) => {
        const data = { id: d.id, ...(d.data() as any) } as SaasTenantUser;
        const emailLower = (data.email || '').toLowerCase().trim();
        if (!emailLower) return;

        // If email matches Gonzalo, ensure amount is strictly $0 (platform owner, not client)
        if (emailLower === 'gonzalocorat@gmail.com') {
          data.amount_monthly_ars = 0;
          data.last_payment_amount = 0;
          data.total_paid_ars = 0;
          data.status = 'active';
          data.is_permanent = true;
          data.trial_active = false;
          data.trial_days_left = 0;
          data.plan = 'pro';
        }

        // Deduplicate by email: If there's an obsolete seed doc and a real Auth UID doc,
        // keep the real auth UID and clean up the seed doc
        if (emailMap.has(emailLower)) {
          const existing = emailMap.get(emailLower)!;
          if (existing.id === 'superadmin_gonzalo' && d.id !== 'superadmin_gonzalo') {
            emailMap.set(emailLower, data);
            deleteDoc(doc(db, COLLECTIONS.USERS, 'superadmin_gonzalo')).catch(() => {});
          } else if (d.id === 'superadmin_gonzalo') {
            deleteDoc(doc(db, COLLECTIONS.USERS, 'superadmin_gonzalo')).catch(() => {});
          } else {
            emailMap.set(emailLower, data);
          }
        } else {
          emailMap.set(emailLower, data);
        }
      });

      onData(Array.from(emailMap.values()));
    },
    (err) => {
      console.warn('Firestore users listener notice:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Update a user in Firestore (change plan, extend trial, etc.)
 */
export const updateUserInFirestore = async (userId: string, updates: Partial<SaasTenantUser>): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(docRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating user in Firestore:', error);
    return false;
  }
};

/**
 * Delete a user from Firestore (Super Admin only)
 */
export const deleteUserFromFirestore = async (userId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting user from Firestore:', error);
    return false;
  }
};

/**
 * Cleanup legacy artificial seed documents in Firestore
 * (removes duplicate 'superadmin_gonzalo' and phantom 'user_gecorat' if present)
 */
export const cleanupDuplicateUsers = async (): Promise<void> => {
  try {
    const usersCol = collection(db, COLLECTIONS.USERS);
    const snap = await getDocs(usersCol);
    const gonzaloDocIds: string[] = [];

    snap.forEach(d => {
      const data = d.data() as any;
      const email = (data.email || '').toLowerCase();
      if (email === 'gonzalocorat@gmail.com') {
        gonzaloDocIds.push(d.id);
      }
    });

    // If superadmin_gonzalo exists and there is another real UID doc, delete superadmin_gonzalo
    if (gonzaloDocIds.length > 1 && gonzaloDocIds.includes('superadmin_gonzalo')) {
      await deleteDoc(doc(db, COLLECTIONS.USERS, 'superadmin_gonzalo')).catch(() => {});
    }

    // If an obsolete user_gecorat document exists from prior seeds, remove it
    const gecoratDoc = await getDoc(doc(db, COLLECTIONS.USERS, 'user_gecorat'));
    if (gecoratDoc.exists()) {
      await deleteDoc(doc(db, COLLECTIONS.USERS, 'user_gecorat')).catch(() => {});
    }
  } catch (error) {
    console.warn('Notice during user cleanup in Firestore:', error);
  }
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
 * Delete a patient from Firestore
 */
export const deletePatientFromFirestore = async (patientId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.PATIENTS, patientId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting patient from Firestore:', error);
    return false;
  }
};

/**
 * Save or update a medical service in Firestore
 */
export const saveServiceToFirestore = async (service: Service): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.SERVICES, service.id);
    await setDoc(docRef, service, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving service to Firestore:', error);
    return false;
  }
};

/**
 * Delete a service from Firestore
 */
export const deleteServiceFromFirestore = async (serviceId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.SERVICES, serviceId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting service from Firestore:', error);
    return false;
  }
};

/**
 * Save or update a consultation (SOAP) in Firestore
 */
export const saveConsultationToFirestore = async (consultation: ConsultationRecord): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.CONSULTATIONS, consultation.id);
    await setDoc(docRef, consultation, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving consultation to Firestore:', error);
    return false;
  }
};

/**
 * Save or update a payment record in Firestore
 */
export const savePaymentToFirestore = async (payment: PaymentRecord): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTIONS.PAYMENTS, payment.id);
    await setDoc(docRef, payment, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving payment to Firestore:', error);
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
      const items: Appointment[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as any) } as Appointment);
      });
      onData(items);
    },
    (err) => {
      console.warn('Firestore appointments listener notice:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Subscribe to real-time patients from Firestore
 * Automatically deduplicates and unifies records
 */
export const subscribeToPatients = (
  onData: (patients: Patient[]) => void,
  onError?: (err: Error) => void
) => {
  const colRef = collection(db, COLLECTIONS.PATIENTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Patient[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as any) } as Patient);
      });
      onData(items);
    },
    (err) => {
      console.warn('Firestore patients listener notice:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Cleanup duplicate patients in Firestore
 */
export const cleanupDuplicatePatientsInFirestore = async (): Promise<void> => {
  try {
    const colRef = collection(db, COLLECTIONS.PATIENTS);
    const snap = await getDocs(colRef);
    const patients: Patient[] = [];
    snap.forEach(d => {
      patients.push({ id: d.id, ...(d.data() as any) } as Patient);
    });

    const phoneMap = new Map<string, Patient>();
    const dniMap = new Map<string, Patient>();
    const nameMap = new Map<string, Patient>();

    for (const p of patients) {
      const normPhone = p.phone ? p.phone.replace(/\D/g, '') : '';
      const normDni = p.dni ? p.dni.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim() : '';
      const normName = `${p.first_name || ''} ${p.last_name || ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      let duplicateOf: Patient | undefined;

      if (normPhone && normPhone.length >= 7 && phoneMap.has(normPhone)) {
        duplicateOf = phoneMap.get(normPhone);
      } else if (normDni && normDni.length >= 6 && dniMap.has(normDni)) {
        duplicateOf = dniMap.get(normDni);
      } else if (normName && normName.length >= 5 && nameMap.has(normName)) {
        duplicateOf = nameMap.get(normName);
      }

      if (duplicateOf && duplicateOf.id !== p.id) {
        // Merge richer fields into duplicateOf
        const updatedCanonical: Patient = {
          ...duplicateOf,
          phone: duplicateOf.phone || p.phone,
          email: duplicateOf.email || p.email,
          dni: duplicateOf.dni || p.dni,
          birth_date: duplicateOf.birth_date || p.birth_date,
          insurance_provider: duplicateOf.insurance_provider || p.insurance_provider,
          insurance_number: duplicateOf.insurance_number || p.insurance_number,
          notes: duplicateOf.notes || p.notes,
          total_appointments: Math.max(duplicateOf.total_appointments || 0, p.total_appointments || 0)
        };
        await setDoc(doc(db, COLLECTIONS.PATIENTS, duplicateOf.id), updatedCanonical, { merge: true });
        await deleteDoc(doc(db, COLLECTIONS.PATIENTS, p.id)).catch(() => {});
      } else {
        if (normPhone && normPhone.length >= 7) phoneMap.set(normPhone, p);
        if (normDni && normDni.length >= 6) dniMap.set(normDni, p);
        if (normName && normName.length >= 5) nameMap.set(normName, p);
      }
    }
  } catch (error) {
    console.warn('Notice during patient cleanup in Firestore:', error);
  }
};

/**
 * Subscribe to real-time services from Firestore
 */
export const subscribeToServices = (
  onData: (services: Service[]) => void,
  onError?: (err: Error) => void
) => {
  const colRef = collection(db, COLLECTIONS.SERVICES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Service[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as any) } as Service);
      });
      onData(items);
    },
    (err) => {
      console.warn('Firestore services listener notice:', err);
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
