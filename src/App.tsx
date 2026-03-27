import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Stethoscope, 
  Pill, 
  Activity, 
  Microscope, 
  UserRound, 
  ChevronRight, 
  Menu, 
  X,
  CheckCircle2,
  Calendar,
  MessageCircle,
  HeartPulse,
  Baby,
  UserCheck,
  Bone,
  Thermometer,
  Droplets,
  Zap,
  LogIn,
  LogOut,
  LayoutDashboard,
  User,
  Plus,
  Trash2,
  AlertCircle,
  Search,
  Filter,
  Check,
  Clock3,
  FileUp,
  Image as ImageIcon,
  Eye,
  Info,
  Heart,
  Star,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CLINIC_INFO, SERVICES, DISEASES_TREATED } from './constants';
import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const IconMap: Record<string, any> = {
  Stethoscope,
  Pill,
  Activity,
  Microscope,
  UserRound,
};

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Firestore Error')) {
        setHasError(true);
        try {
          const info = JSON.parse(event.error.message);
          setErrorMessage(`Database Error: ${info.error}`);
        } catch {
          setErrorMessage('A database error occurred.');
        }
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 medical-gradient text-white font-bold rounded-xl"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [view, setView] = useState<'public' | 'user' | 'admin'>('public');
  
  // Appointment Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    service: SERVICES[0].title,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          // Create new patient profile
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: firebaseUser.email === 'drshailesh36@gmail.com' ? 'admin' : 'patient',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
        setView('public');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Appointments Listener
  useEffect(() => {
    if (!userProfile) return;

    let q;
    if (userProfile.role === 'admin') {
      q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'appointments'), 
        where('patientUid', '==', userProfile.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Medicines Listener
  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') {
      // Patients can also see medicines if we want, but let's keep it admin-focused for now
      // Actually, let's allow everyone to read for availability
    }

    const q = query(collection(db, 'medicines'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMedicines(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'medicines');
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Prescriptions Listener
  useEffect(() => {
    if (!userProfile) return;

    let q;
    if (userProfile.role === 'admin') {
      q = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'prescriptions'), 
        where('patientUid', '==', userProfile.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrescriptions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'prescriptions');
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    setAuthError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      await updateProfile(userCredential.user, { displayName: authName });
      
      // Create profile in Firestore
      const newProfile = {
        uid: userCredential.user.uid,
        email: authEmail,
        displayName: authName,
        photoURL: null,
        role: authEmail === 'drshailesh36@gmail.com' ? 'admin' : 'patient',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
      setUserProfile(newProfile);
      setShowAuthModal(false);
      resetAuthForm();
    } catch (error: any) {
      setAuthError(error.message || 'Error creating account');
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setShowAuthModal(false);
      resetAuthForm();
    } catch (error: any) {
      setAuthError('Invalid email or password');
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const resetAuthForm = () => {
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setAuthError('');
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const appointmentData = {
        patientUid: user.uid,
        patientName: formData.name || user.displayName,
        patientPhone: formData.phone,
        date: formData.date,
        service: formData.service,
        message: formData.message,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'appointments'), appointmentData);
      setFormData({ name: '', phone: '', date: '', service: SERVICES[0].title, message: '' });
      alert('Appointment booked successfully!');
      if (userProfile?.role === 'patient') setView('user');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appointments/${id}`);
    }
  };

  const addMedicine = async (medicineData: any) => {
    try {
      await addDoc(collection(db, 'medicines'), {
        ...medicineData,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'medicines');
    }
  };

  const updateMedicine = async (id: string, medicineData: any) => {
    try {
      await updateDoc(doc(db, 'medicines', id), {
        ...medicineData,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `medicines/${id}`);
    }
  };

  const deleteMedicine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    try {
      await deleteDoc(doc(db, 'medicines', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `medicines/${id}`);
    }
  };

  const uploadPrescription = async (imageData: string, notes: string) => {
    if (!user) return;
    try {
      const prescriptionData = {
        patientUid: user.uid,
        patientName: userProfile?.displayName || user.displayName,
        patientPhone: userProfile?.phone || formData.phone || '',
        imageData,
        notes,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'prescriptions'), prescriptionData);
      alert('Prescription uploaded successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prescriptions');
    }
  };

  const updatePrescriptionStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'prescriptions', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `prescriptions/${id}`);
    }
  };

  const deletePrescription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prescription?')) return;
    try {
      await deleteDoc(doc(db, 'prescriptions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `prescriptions/${id}`);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center medical-gradient">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white"
        >
          <HeartPulse size={64} />
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {/* Auth Modal */}
        <AnimatePresence>
          {showAuthModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <button 
                  onClick={() => { setShowAuthModal(false); resetAuthForm(); }}
                  className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="p-8 sm:p-10">
                  <div className="text-center mb-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl medical-gradient text-white mb-4">
                      <HeartPulse size={28} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-slate-500 mt-2">
                      {authMode === 'login' ? 'Login to manage your appointments' : 'Join us for better healthcare services'}
                    </p>
                  </div>

                  <form onSubmit={authMode === 'login' ? handleEmailLogin : handleEmailSignUp} className="space-y-4">
                    {authMode === 'signup' && (
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            required
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary transition-all outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="email"
                          required
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                      <div className="relative">
                        <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="password"
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary transition-all outline-none"
                        />
                      </div>
                    </div>

                    {authError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                        <AlertCircle size={16} />
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthProcessing}
                      className="w-full py-4 medical-gradient text-white font-bold rounded-xl shadow-lg shadow-medical-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100"
                    >
                      {isAuthProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        authMode === 'login' ? 'Sign In' : 'Create Account'
                      )}
                    </button>
                  </form>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 text-slate-400 font-medium tracking-wider">Or continue with</span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" alt="Google" />
                    Google
                  </button>

                  <p className="text-center text-slate-500 mt-8 text-sm">
                    {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                    <button 
                      onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                      className="ml-2 text-medical-primary font-bold hover:underline"
                    >
                      {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('public')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl medical-gradient text-white">
                  <HeartPulse size={24} />
                </div>
                <span className="text-xl font-bold tracking-tight text-medical-dark hidden sm:block">
                  SHILPA HEALTH CARE
                </span>
              </div>
              
              <div className="hidden md:block">
                <div className="flex items-center gap-8">
                  {view === 'public' && ['Home', 'Services', 'Pharmacy', 'Diseases', 'Doctor', 'Contact'].map((item) => (
                    <button
                      key={item}
                      onClick={() => scrollToSection(item.toLowerCase())}
                      className="text-sm font-medium text-slate-600 hover:text-medical-primary transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                  
                  {user ? (
                    <div className="flex items-center gap-4">
                      {userProfile?.role === 'admin' && (
                        <button 
                          onClick={() => setView(view === 'admin' ? 'public' : 'admin')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === 'admin' ? 'bg-medical-primary text-white' : 'text-medical-primary hover:bg-medical-primary/10'}`}
                        >
                          <LayoutDashboard size={18} />
                          Admin Panel
                        </button>
                      )}
                      {userProfile?.role === 'patient' && (
                        <button 
                          onClick={() => setView(view === 'user' ? 'public' : 'user')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === 'user' ? 'bg-medical-primary text-white' : 'text-medical-primary hover:bg-medical-primary/10'}`}
                        >
                          <User size={18} />
                          My Appointments
                        </button>
                      )}
                      <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <LogOut size={20} />
                      </button>
                      <div className="h-8 w-8 rounded-full border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                        {user.photoURL ? (
                          <img src={user.photoURL} className="h-full w-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                        ) : (
                          <User size={16} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowAuthModal(true)}
                      className="flex items-center gap-2 rounded-full medical-gradient px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-medical-primary/20 hover:scale-105 transition-transform"
                    >
                      <LogIn size={18} />
                      Login
                    </button>
                  )}
                </div>
              </div>

              <div className="md:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-600">
                  {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
              >
                <div className="px-4 py-6 space-y-4">
                  {view === 'public' && ['Home', 'Services', 'Pharmacy', 'Diseases', 'Doctor', 'Contact'].map((item) => (
                    <button
                      key={item}
                      onClick={() => scrollToSection(item.toLowerCase())}
                      className="block w-full text-left text-lg font-medium text-slate-600 hover:text-medical-primary"
                    >
                      {item}
                    </button>
                  ))}
                  
                  <div className="pt-4 border-t border-slate-100">
                    {user ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                          {user.photoURL ? (
                            <img src={user.photoURL} className="h-full w-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={20} className="text-slate-400" />
                          )}
                        </div>
                          <div>
                            <div className="font-bold text-slate-900">{user.displayName}</div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                        {userProfile?.role === 'admin' && (
                          <button 
                            onClick={() => { setView(view === 'admin' ? 'public' : 'admin'); setIsMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-medical-primary text-white font-bold"
                          >
                            <LayoutDashboard size={20} />
                            Admin Panel
                          </button>
                        )}
                        {userProfile?.role === 'patient' && (
                          <button 
                            onClick={() => { setView(view === 'user' ? 'public' : 'user'); setIsMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-medical-primary text-white font-bold"
                          >
                            <User size={20} />
                            My Appointments
                          </button>
                        )}
                        <button 
                          onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-red-500 font-bold"
                        >
                          <LogOut size={20} />
                          Logout
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setShowAuthModal(true); setIsMenuOpen(false); }}
                        className="flex items-center justify-center gap-2 w-full rounded-xl medical-gradient py-4 text-white font-bold"
                      >
                        <LogIn size={20} />
                        Login / Sign Up
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Views */}
        <main className="pt-16">
          {view === 'public' && <PublicHome handleBookAppointment={handleBookAppointment} formData={formData} setFormData={setFormData} isSubmitting={isSubmitting} medicines={medicines} />}
          {view === 'user' && <UserPanel appointments={appointments} prescriptions={prescriptions} medicines={medicines} uploadPrescription={uploadPrescription} />}
          {view === 'admin' && (
            <AdminPanel 
              appointments={appointments} 
              updateStatus={updateAppointmentStatus} 
              deleteApp={deleteAppointment}
              medicines={medicines}
              addMed={addMedicine}
              updateMed={updateMedicine}
              deleteMed={deleteMedicine}
              prescriptions={prescriptions}
              updatePrescriptionStatus={updatePrescriptionStatus}
              deletePrescription={deletePrescription}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 pt-24 pb-12 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl medical-gradient text-white">
                    <HeartPulse size={24} />
                  </div>
                  <span className="text-xl font-bold tracking-tight">SHILPA HEALTH CARE</span>
                </div>
                <p className="text-slate-400 max-w-md leading-relaxed mb-8">
                  Providing multi-specialty healthcare services including pharmacy, diagnostics, and pathology lab. Dedicated to serving the community with excellence and care.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold text-lg mb-6">Quick Links</h4>
                <ul className="space-y-4 text-slate-400">
                  {['Home', 'Services', 'Pharmacy', 'Diseases', 'Doctor', 'Contact'].map(item => (
                    <li key={item}>
                      <button onClick={() => { setView('public'); setTimeout(() => scrollToSection(item.toLowerCase()), 100); }} className="hover:text-medical-primary transition-colors">
                        {item}
                      </button>
                    </li>
                  ))}
                  <li>
                    <a href="https://github.com/drshailesh3/Shilpahealthcare" target="_blank" rel="noopener noreferrer" className="hover:text-medical-primary transition-colors">
                      GitHub Repository
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-lg mb-6">Our Services</h4>
                <ul className="space-y-4 text-slate-400">
                  {SERVICES.slice(0, 4).map(s => (
                    <li key={s.title}>{s.title}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
              <p>© {new Date().getFullYear()} {CLINIC_INFO.name}. All rights reserved.</p>
            </div>
          </div>
        </footer>
        
        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-40">
          <a 
            href={`https://wa.me/91${CLINIC_INFO.phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-14 w-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
          >
            <MessageCircle size={28} />
          </a>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// --- Sub-Components ---

function PublicHome({ handleBookAppointment, formData, setFormData, isSubmitting, medicines }: any) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMedicines = useMemo(() => {
    return medicines.slice(0, 8).filter((m: any) => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [medicines, searchQuery]);

  return (
    <>
      {/* Hero Section */}
      <section id="home" className="relative pt-12 pb-16 lg:pt-32 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-medical-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-medical-secondary rounded-full blur-3xl" />
        </div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-medical-primary/10 px-4 py-1.5 text-sm font-semibold text-medical-primary mb-6">
                <Zap size={16} />
                <span>Trusted Healthcare in Ambedkar Nagar | अम्बेडकर नगर में विश्वसनीय स्वास्थ्य सेवा</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                {CLINIC_INFO.name}
              </h1>
              <p className="text-xl text-slate-600 mb-8 max-w-lg">
                {CLINIC_INFO.tagline}
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => document.getElementById('appointment')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 rounded-full medical-gradient px-8 py-4 text-lg font-bold text-white shadow-xl shadow-medical-primary/25 hover:scale-105 transition-transform"
                >
                  <Calendar size={20} />
                  Book Appointment
                </button>
                <a 
                  href={`tel:${CLINIC_INFO.phone}`}
                  className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-8 py-4 text-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Phone size={20} />
                  Call Now
                </a>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000" 
                  alt="Modern Clinic" 
                  className="w-full h-[500px] object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base font-semibold text-medical-primary uppercase tracking-wide mb-2">Our Services</h2>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900">सुविधाएँ (Services)</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((service, index) => {
              const Icon = IconMap[service.icon];
              return (
                <div key={service.title} className="p-8 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-medical-primary mb-6">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{service.title}</h3>
                  <p className="text-sm font-medium text-medical-secondary mb-4">{service.titleHindi}</p>
                  <p className="text-slate-600 leading-relaxed">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pharmacy Section */}
      <section id="pharmacy" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold text-medical-primary uppercase tracking-wide mb-2">Our Pharmacy | हमारी फार्मेसी</h2>
              <p className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">दवाइयां (Pharmacy Inventory)</p>
              <p className="text-slate-600">Browse our available medicines. Login to upload your prescription and order online. | हमारी उपलब्ध दवाएं देखें। अपना नुस्खा अपलोड करने और ऑनलाइन ऑर्डर करने के लिए लॉगिन करें।</p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search medicines... | दवाएं खोजें..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-medical-primary bg-white"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMedicines.map((med: any) => (
              <div key={med.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-medical-primary/10 rounded-2xl text-medical-primary group-hover:bg-medical-primary group-hover:text-white transition-colors">
                    <Pill size={24} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                    med.stock > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {med.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">{med.name}</h4>
                <p className="text-xs text-slate-500 mb-4">{med.category}</p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <span className="text-xl font-bold text-medical-primary">₹{med.price}</span>
                  <div className="flex gap-2">
                    <button 
                      className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget;
                        btn.classList.toggle('text-red-500');
                        btn.classList.toggle('text-slate-400');
                      }}
                    >
                      <Heart size={20} fill="currentColor" className="fill-transparent hover:fill-red-500" />
                    </button>
                    <button 
                      onClick={() => document.getElementById('appointment')?.scrollIntoView({ behavior: 'smooth' })}
                      className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-medical-primary hover:text-white transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMedicines.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-500">No medicines found matching your search.</p>
            </div>
          )}

          <div className="mt-12 text-center">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl medical-gradient text-white font-bold shadow-xl shadow-medical-primary/20 hover:scale-105 transition-transform"
            >
              <LogIn size={20} />
              Login to Order / Upload Prescription
            </button>
          </div>
        </div>
      </section>

      {/* Diseases Treated Section */}
      <section id="diseases" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base font-semibold text-medical-primary uppercase tracking-wide mb-2">Specialties</h2>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900">सभी प्रकार की बीमारियाँ (Diseases Treated)</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {DISEASES_TREATED.map((disease) => (
              <div key={disease.name} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-8 w-8 rounded-full bg-medical-primary/10 flex items-center justify-center text-medical-primary">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{disease.name}</div>
                  <div className="text-xs text-slate-500">{disease.hindi}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctor Profile Section */}
      <section id="doctor" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-base font-semibold text-medical-primary uppercase tracking-wide mb-2">Our Specialist | हमारे विशेषज्ञ</h2>
              <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">{CLINIC_INFO.doctor}</h3>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                With years of experience in multi-specialty healthcare, {CLINIC_INFO.doctor} is dedicated to providing the highest quality medical care to the people of Ambedkar Nagar. Our clinic focuses on patient-centric treatment and advanced diagnostics.
                <br /><br />
                बहु-विशेषज्ञता स्वास्थ्य सेवा में वर्षों के अनुभव के साथ, {CLINIC_INFO.doctor} अंबेडकर नगर के लोगों को उच्चतम गुणवत्ता वाली चिकित्सा सेवा प्रदान करने के लिए समर्पित हैं। हमारा क्लिनिक रोगी-केंद्रित उपचार और उन्नत डायग्नोस्टिक्स पर केंद्रित है।
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-12 w-12 rounded-xl medical-gradient flex items-center justify-center text-white">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Expert Consultation | विशेषज्ञ परामर्श</div>
                    <div className="text-sm text-slate-500">Personalized care for every patient</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="h-12 w-12 rounded-xl medical-gradient flex items-center justify-center text-white">
                    <Activity size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Advanced Diagnostics | उन्नत डायग्नोस्टिक्स</div>
                    <div className="text-sm text-slate-500">Accurate results for better treatment</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="absolute -top-4 -right-4 w-full h-full border-2 border-medical-primary rounded-3xl -z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=1000" 
                  alt="Doctor" 
                  className="rounded-3xl shadow-2xl w-full h-[500px] object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-slate-50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base font-semibold text-medical-primary uppercase tracking-wide mb-2">Testimonials | प्रशंसापत्र</h2>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900">What Our Patients Say | हमारे मरीज क्या कहते हैं</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Rahul Kumar", text: "Dr. Shailesh is very professional and caring. The treatment I received was excellent.", role: "Patient" },
              { name: "Priya Singh", text: "The pharmacy services are very convenient. I got all my medicines in one place.", role: "Patient" },
              { name: "Amit Verma", text: "Best clinic in Ambedkar Nagar. Highly recommended for general checkups.", role: "Patient" }
            ].map((t, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative"
              >
                <Quote className="absolute top-6 right-8 text-medical-primary/10" size={48} />
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-slate-600 mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full medical-gradient flex items-center justify-center text-white font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Appointment Section */}
      <section id="appointment" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Book Your Appointment</h2>
            <p className="text-slate-600">Schedule your visit today and take the first step towards better health.</p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
              <form onSubmit={handleBookAppointment} className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-medical-primary outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                  <input 
                    required
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="8218385936" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-medical-primary outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Preferred Date</label>
                  <input 
                    required
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-medical-primary outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Service Required</label>
                  <select 
                    value={formData.service}
                    onChange={(e) => setFormData({...formData, service: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-medical-primary outline-none"
                  >
                    {SERVICES.map(s => <option key={s.title}>{s.title}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Message / Symptoms</label>
                  <textarea 
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    rows={4} 
                    placeholder="Briefly describe your health concern..." 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-medical-primary outline-none" 
                  />
                </div>
                <button 
                  disabled={isSubmitting}
                  type="submit" 
                  className="sm:col-span-2 rounded-xl medical-gradient py-4 text-white font-bold shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </form>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Clock className="text-medical-primary" size={20} />
                  Working Hours
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Mon - Sat</span>
                    <span className="font-semibold text-slate-900">9:00 AM - 8:00 PM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Sunday</span>
                    <span className="font-semibold text-red-500">Emergency Only</span>
                  </div>
                </div>
              </div>
              <div className="medical-gradient p-8 rounded-3xl text-white shadow-xl">
                <h4 className="font-bold text-lg mb-4">Emergency Contact</h4>
                <a href={`tel:${CLINIC_INFO.phone}`} className="flex items-center gap-3 text-2xl font-bold">
                  <Phone size={28} />
                  {CLINIC_INFO.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function UserPanel({ appointments, prescriptions, medicines, uploadPrescription }: { appointments: any[], prescriptions: any[], medicines: any[], uploadPrescription: (data: string, notes: string) => void }) {
  const [activeTab, setActiveTab] = useState<'appointments' | 'pharmacy'>('appointments');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMedicines = useMemo(() => {
    return medicines.filter((m: any) => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [medicines, searchQuery]);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h2 className="text-3xl font-bold text-slate-900">Patient Dashboard</h2>
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'appointments' ? 'medical-gradient text-white shadow-lg shadow-medical-primary/20' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            My Appointments
          </button>
          <button 
            onClick={() => setActiveTab('pharmacy')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'pharmacy' ? 'medical-gradient text-white shadow-lg shadow-medical-primary/20' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Pharmacy & Prescriptions
          </button>
        </div>
      </div>
      
      {activeTab === 'appointments' ? (
        appointments.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
            <Calendar className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-500">No appointments found. Book one from the home page!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appointments.map((app) => (
              <div key={app.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    app.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                    app.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    app.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {app.status}
                  </div>
                  <div className="text-xs text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</div>
                </div>
                <h4 className="font-bold text-lg text-slate-900 mb-2">{app.service}</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-medical-primary" />
                    <span>{new Date(app.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-medical-primary" />
                    <span>{app.patientPhone}</span>
                  </div>
                </div>
                {app.message && <p className="mt-4 text-sm text-slate-500 italic">"{app.message}"</p>}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <PrescriptionUpload onUpload={uploadPrescription} />
            
            <div className="bg-medical-primary/5 p-8 rounded-3xl border border-medical-primary/10">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Info size={20} className="text-medical-primary" />
                Pharmacy Information | फार्मेसी जानकारी
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                You can view our available medicine inventory here. If you have a prescription, please upload it using the form above. Our pharmacist will review it and notify you when your medicines are ready for pickup.
                <br /><br />
                आप यहाँ हमारी उपलब्ध दवा सूची देख सकते हैं। यदि आपके पास कोई नुस्खा है, तो कृपया ऊपर दिए गए फॉर्म का उपयोग करके उसे अपलोड करें। हमारे फार्मासिस्ट इसकी समीक्षा करेंगे और आपके नुस्खे तैयार होने पर आपको सूचित करेंगे।
              </p>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-slate-900">Available Medicines | उपलब्ध दवाएं</h3>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search medicines... | दवाएं खोजें..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-medical-primary"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {filteredMedicines.map((med: any) => {
                const isOutOfStock = med.stock <= 0;
                return (
                  <div key={med.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <Pill className="text-medical-primary" size={20} />
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">{med.name}</h4>
                    <p className="text-xs text-slate-500 mb-3">{med.category}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                      <span className="font-bold text-medical-primary">₹{med.price}</span>
                      <div className="flex items-center gap-3">
                        <button 
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          onClick={(e) => {
                            const btn = e.currentTarget;
                            btn.classList.toggle('text-red-500');
                            btn.classList.toggle('text-slate-300');
                          }}
                        >
                          <Heart size={18} fill="currentColor" className="fill-transparent hover:fill-red-500" />
                        </button>
                        <span className="text-xs text-slate-400">{med.stock} units left</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredMedicines.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
                  No medicines found matching your search. | आपकी खोज से मेल खाने वाली कोई दवा नहीं मिली।
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6">My Uploaded Prescriptions | मेरे अपलोड किए गए नुस्खे</h3>
              {prescriptions.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
                  <FileUp className="mx-auto text-slate-200 mb-4" size={64} />
                  <p className="text-slate-500">No prescriptions uploaded yet. Use the form to upload one! | अभी तक कोई नुस्खा अपलोड नहीं किया गया है। अपलोड करने के लिए फॉर्म का उपयोग करें!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {prescriptions.map((p) => (
                    <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          p.status === 'ready' ? 'bg-green-100 text-green-600' :
                          p.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          p.status === 'reviewed' ? 'bg-blue-100 text-blue-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {p.status}
                        </div>
                        <div className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="aspect-video bg-slate-100 rounded-xl mb-4 overflow-hidden">
                        <img src={p.imageData} alt="Prescription" className="w-full h-full object-cover" />
                      </div>
                      {p.notes && <p className="text-sm text-slate-600 italic">"{p.notes}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrescriptionUpload({ onUpload }: { onUpload: (data: string, notes: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 800000) {
        alert('File size too large. Please upload an image smaller than 800KB.');
        return;
      }
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    setIsUploading(true);
    await onUpload(preview, notes);
    setIsUploading(false);
    setFile(null);
    setPreview(null);
    setNotes('');
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <FileUp className="text-medical-primary" size={24} />
        Upload Prescription
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative group">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="hidden" 
            id="prescription-upload"
          />
          <label 
            htmlFor="prescription-upload"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-medical-primary hover:bg-slate-50 transition-all overflow-hidden"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <ImageIcon size={48} className="mb-4" />
                <span className="font-semibold">Click to upload</span>
                <span className="text-xs mt-2">PNG, JPG up to 800KB</span>
              </div>
            )}
          </label>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific instructions..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-medical-primary outline-none"
            rows={3}
          />
        </div>
        <button 
          disabled={!file || isUploading}
          type="submit"
          className="w-full py-4 medical-gradient text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Submit Prescription'}
        </button>
      </form>
    </div>
  );
}

function AdminPanel({ appointments, updateStatus, deleteApp, medicines, addMed, updateMed, deleteMed, prescriptions, updatePrescriptionStatus, deletePrescription }: any) {
  const [activeTab, setActiveTab] = useState<'appointments' | 'pharmacy' | 'prescriptions'>('appointments');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredAppointments = useMemo(() => {
    return appointments.filter((app: any) => {
      const matchesFilter = filter === 'all' || app.status === filter;
      const matchesSearch = app.patientName.toLowerCase().includes(search.toLowerCase()) || 
                            app.patientPhone.includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [appointments, filter, search]);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Admin Dashboard</h2>
          <div className="flex flex-wrap gap-4 mt-4">
            <button 
              onClick={() => setActiveTab('appointments')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'appointments' ? 'medical-gradient text-white shadow-lg shadow-medical-primary/20' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              Appointments
            </button>
            <button 
              onClick={() => setActiveTab('pharmacy')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'pharmacy' ? 'medical-gradient text-white shadow-lg shadow-medical-primary/20' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              Pharmacy Inventory
            </button>
            <button 
              onClick={() => setActiveTab('prescriptions')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'prescriptions' ? 'medical-gradient text-white shadow-lg shadow-medical-primary/20' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              Prescriptions
            </button>
          </div>
        </div>
        
        {activeTab === 'appointments' && (
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search patients..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-medical-primary"
              />
            </div>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {activeTab === 'appointments' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Patient</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Service</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Date</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Status</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAppointments.map((app: any) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{app.patientName}</div>
                      <div className="text-xs text-slate-500">{app.patientPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{app.service}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(app.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1 rounded-full border-none outline-none cursor-pointer ${
                          app.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                          app.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          app.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                          'bg-red-100 text-red-600'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => deleteApp(app.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAppointments.length === 0 && (
            <div className="p-12 text-center text-slate-500">No appointments found matching your criteria.</div>
          )}
        </div>
      ) : activeTab === 'pharmacy' ? (
        <PharmacyManager medicines={medicines} addMed={addMed} updateMed={updateMed} deleteMed={deleteMed} />
      ) : (
        <PrescriptionList prescriptions={prescriptions} updateStatus={updatePrescriptionStatus} deletePrescription={deletePrescription} />
      )}
    </div>
  );
}

function PrescriptionList({ prescriptions, updateStatus, deletePrescription }: any) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Patient Prescriptions</h3>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prescriptions.map((p: any) => (
          <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                p.status === 'ready' ? 'bg-green-100 text-green-600' :
                p.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                p.status === 'reviewed' ? 'bg-blue-100 text-blue-600' :
                'bg-red-100 text-red-600'
              }`}>
                {p.status}
              </div>
              <div className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
            
            <div 
              className="aspect-video bg-slate-100 rounded-xl mb-4 overflow-hidden cursor-pointer group relative"
              onClick={() => setSelectedImage(p.imageData)}
            >
              <img src={p.imageData} alt="Prescription" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Search size={24} />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="font-bold text-slate-900">{p.patientName}</div>
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <Phone size={14} /> {p.patientPhone}
              </div>
              {p.notes && <p className="text-sm text-slate-600 italic">"{p.notes}"</p>}
            </div>

            <div className="flex gap-2">
              <select 
                value={p.status}
                onChange={(e) => updateStatus(p.id, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-medical-primary"
              >
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="ready">Ready for Pickup</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button 
                onClick={() => deletePrescription(p.id)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {prescriptions.length === 0 && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-100">
          No prescriptions uploaded yet.
        </div>
      )}

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 relative"
              onClick={e => e.stopPropagation()}
            >
              <img src={selectedImage} alt="Prescription Full" className="w-full h-full object-contain" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg text-slate-900"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PharmacyManager({ medicines, addMed, updateMed, deleteMed }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Tablet',
    stock: 0,
    price: 0,
    expiryDate: ''
  });

  const isExpiringSoon = (dateStr: string) => {
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const expiringCount = useMemo(() => {
    return medicines.filter((m: any) => isExpiringSoon(m.expiryDate)).length;
  }, [medicines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMed) {
      await updateMed(editingMed.id, formData);
      setEditingMed(null);
    } else {
      await addMed(formData);
      setIsAdding(false);
    }
    setFormData({ name: '', category: 'Tablet', stock: 0, price: 0, expiryDate: '' });
  };

  const startEdit = (med: any) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      category: med.category,
      stock: med.stock,
      price: med.price,
      expiryDate: med.expiryDate
    });
    setIsAdding(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-slate-900">Medicine Inventory</h3>
          {expiringCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold animate-pulse">
              <AlertCircle size={14} />
              {expiringCount} Expiring Soon
            </div>
          )}
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingMed(null); setFormData({ name: '', category: 'Tablet', stock: 0, price: 0, expiryDate: '' }); }}
          className="flex items-center gap-2 px-6 py-2 rounded-xl medical-gradient text-white font-bold shadow-lg shadow-medical-primary/20"
        >
          <Plus size={18} />
          Add Medicine
        </button>
      </div>

      {/* Medicine Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsAdding(false); setEditingMed(null); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="medical-gradient p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">{editingMed ? 'Edit Medicine' : 'Add New Medicine'}</h3>
                <button 
                  onClick={() => { setIsAdding(false); setEditingMed(null); }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Medicine Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Paracetamol 500mg"
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-medical-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-medical-primary"
                    >
                      <option>Tablet</option>
                      <option>Capsule</option>
                      <option>Syrup</option>
                      <option>Injection</option>
                      <option>Ointment</option>
                      <option>Drops</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Stock Quantity</label>
                    <input 
                      required
                      type="number" 
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-medical-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Price (₹)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-medical-primary"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Expiry Date</label>
                    <input 
                      required
                      type="date" 
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-medical-primary"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingMed(null); }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 medical-gradient text-white font-bold rounded-xl shadow-lg"
                  >
                    {editingMed ? 'Update Medicine' : 'Save Medicine'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Medicine</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Category</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Stock</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Price</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Expiry</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {medicines.map((med: any) => {
                const expiring = isExpiringSoon(med.expiryDate);
                const isExpired = new Date(med.expiryDate) < new Date();
                
                return (
                  <tr key={med.id} className={`hover:bg-slate-50/50 transition-colors ${expiring || isExpired ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {med.name}
                        {isExpired && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded uppercase">Expired</span>}
                        {expiring && !isExpired && <AlertCircle size={14} className="text-red-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{med.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${med.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {med.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{med.price}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className={`flex flex-col ${isExpired ? 'text-red-600 font-bold' : expiring ? 'text-red-500 font-semibold' : 'text-slate-600'}`}>
                        <span>{new Date(med.expiryDate).toLocaleDateString()}</span>
                        {expiring && !isExpired && <span className="text-[10px] uppercase">Expiring soon</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedMed(med)}
                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => startEdit(med)}
                        className="p-2 text-slate-400 hover:text-medical-primary transition-colors"
                        title="Edit"
                      >
                        <UserCheck size={18} />
                      </button>
                      <button 
                        onClick={() => deleteMed(med.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        {medicines.length === 0 && (
          <div className="p-12 text-center text-slate-500">No medicines in inventory. Add some above!</div>
        )}
      </div>

      {/* Medicine Details Modal */}
      <AnimatePresence>
        {selectedMed && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedMed(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="medical-gradient p-8 text-white relative">
                <button 
                  onClick={() => setSelectedMed(null)}
                  className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <Pill size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedMed.name}</h3>
                    <p className="text-white/80 font-medium">{selectedMed.category}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Level</p>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${selectedMed.stock < 10 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                      <p className="text-lg font-bold text-slate-900">{selectedMed.stock} Units</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Price</p>
                    <p className="text-lg font-bold text-slate-900">₹{selectedMed.price}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry Date</p>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className={isExpiringSoon(selectedMed.expiryDate) ? 'text-red-500' : 'text-slate-400'} />
                      <p className={`text-lg font-bold ${isExpiringSoon(selectedMed.expiryDate) ? 'text-red-500' : 'text-slate-900'}`}>
                        {new Date(selectedMed.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Updated</p>
                    <p className="text-sm text-slate-600">
                      {selectedMed.lastUpdated ? new Date(selectedMed.lastUpdated).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-top border-slate-100 flex gap-4">
                  <button 
                    onClick={() => { startEdit(selectedMed); setSelectedMed(null); }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    Edit Medicine
                  </button>
                  <button 
                    onClick={() => setSelectedMed(null)}
                    className="flex-1 py-3 medical-gradient text-white font-bold rounded-xl shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
