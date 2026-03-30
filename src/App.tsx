/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component } from 'react';
import { NOMES_FUNCIONARIOS, SUPERVISAO_OPTIONS, OPERACAO_OPTIONS, UNIDADE_OPTIONS, SUPERVISORES } from './constants';
import { 
  ClipboardCheck, 
  Calendar, 
  User, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Mail,
  FileSpreadsheet,
  Home,
  Settings,
  X,
  Check,
  LogOut,
  Lock,
  Mail as MailIcon,
  User as UserIcon,
  Key,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Plus,
  Send,
  Wifi,
  History,
  Upload,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { auth, db, storage } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error) {
          errorMessage = `Erro no Banco de Dados: ${parsedError.error}`;
          if (parsedError.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Você não tem permissão para realizar esta operação. Verifique se você é o dono dos dados ou um administrador.";
          }
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 rounded-3xl border border-zinc-800 p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-mono font-bold text-zinc-100 mb-4 uppercase tracking-tighter">Ops! Algo deu errado</h2>
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 mb-6 text-left leading-relaxed">
              {errorMessage}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-zinc-100 hover:bg-white text-zinc-900 rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-[0.2em] shadow-xl"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CustomLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="#84cc16" />
    <path d="M 18 58 C 30 75, 60 85, 78 25 C 78 25, 75 75, 45 70 C 30 67, 18 58, 18 58 Z" fill="white" />
    <text x="50" y="90" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">GESTÃO DE RISCO</text>
  </svg>
);

const SplashScreen = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50"
  >
    <div className="mb-6">
      <CustomLogo className="w-24 h-24" />
    </div>
    <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tighter text-center px-6">Gestão de Riscos & Stop Work</h1>
  </motion.div>
);

const DetailItem = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col">
    <span className="text-[9px] uppercase font-mono font-bold text-zinc-500 tracking-widest">{label}</span>
    <span className="text-xs text-zinc-300 font-mono mt-0.5">{value || 'N/A'}</span>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [showTestSuccess, setShowTestSuccess] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMatricula, setAuthMatricula] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        let nome = localStorage.getItem(`agro_nome_${u.uid}`) || '';
        let matricula = localStorage.getItem(`agro_matricula_${u.uid}`) || '';

        // Try to fetch from Firestore if not in local storage
        if (!nome || !matricula) {
          try {
            const userDoc = await getDoc(doc(db, 'users', u.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              nome = data.nome || nome;
              matricula = data.matricula || matricula;
              localStorage.setItem(`agro_nome_${u.uid}`, nome);
              localStorage.setItem(`agro_matricula_${u.uid}`, matricula);
            }
          } catch (e) {
            console.error('Error fetching user profile:', e);
          }
        }

        setFormData(prev => ({ 
          ...prev, 
          email_usuario: u.email || '',
          nome: nome || prev.nome,
          matricula: matricula || prev.matricula
        }));
        setTestEmail(u.email || 'pedro.arce@cocal.com.br');
      } else {
        setFormData(prev => ({
          ...prev,
          email_usuario: '',
          nome: '',
          matricula: ''
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const u = userCredential.user;
        
        // Save user profile to Firestore
        await setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: authEmail,
          nome: authName,
          matricula: authMatricula,
          createdAt: new Date().toISOString(),
          role: 'user'
        });

        // Save to local storage for immediate use
        localStorage.setItem(`agro_nome_${u.uid}`, authName);
        localStorage.setItem(`agro_matricula_${u.uid}`, authMatricula);

        // Send Welcome Email via Google Sheets Script
        if (sheetsUrlAnalise && sheetsUrlAnalise.trim().startsWith('http')) {
          try {
            await fetch(sheetsUrlAnalise.trim(), {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                type: 'WELCOME_EMAIL',
                email: authEmail,
                nome: authName,
                matricula: authMatricula,
                timestamp: new Date().toISOString()
              }),
            });
          } catch (e) {
            console.warn('Could not send welcome email via script:', e);
          }
        }

        await sendEmailVerification(u);
        setAuthError('Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro.');
        setAuthMode('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('O login por E-mail/Senha ainda não foi ativado no Console do Firebase. Ative-o em Authentication > Sign-in method.');
      } else {
        setAuthError('Erro ao autenticar: ' + err.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setViewState('home');
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          setError("Erro de conexão com o Firebase. Verifique sua internet ou configuração.");
        }
      }
    };
    testConnection();

    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [viewState, setViewState] = useState<'home' | 'form' | 'list' | 'stopwork'>('home');
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);
  const [savedStopWorks, setSavedStopWorks] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [testEmail, setTestEmail] = useState(localStorage.getItem('agro_test_email') || 'pedro.arce@cocal.com.br');
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearStopWorkConfirm, setShowClearStopWorkConfirm] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setTestLogs(prev => [...prev, `[${time}] ${msg}`]);
    console.log(`[TEST LOG] ${msg}`);
  };
  const [sheetsUrlAnalise, setSheetsUrlAnalise] = useState(localStorage.getItem('agro_sheets_url_analise') || 'https://script.google.com/macros/s/AKfycbzMZwMR71gH4Xb2t5Jal0-5rBYslmEyjMcPmofNKO3WiUvtAMKkcSNiu3A4WNN5MdI/exec');
  const [sheetsUrlStopWork, setSheetsUrlStopWork] = useState(localStorage.getItem('agro_sheets_url_stopwork') || 'https://script.google.com/macros/s/AKfycby3rqwZsMmh3DuQlc9EY2kU7EQB9gaVAIBKHiS0r_LN88TDBZVUBUjPAHfMR1902PZl/exec');
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [selectedStopWork, setSelectedStopWork] = useState<any | null>(null);
  const [stopWorkDateFilter, setStopWorkDateFilter] = useState('');

  useEffect(() => {
    const currentAnaliseUrl = localStorage.getItem('agro_sheets_url_analise');
    const oldDefaultAnaliseUrl = 'https://script.google.com/macros/s/AKfycbx1In2RzeAQRm334sBnDB5Y1SW6HtbscRcFSQ8toxQ9oV0yz9qZuxzAMIWHzYkhhWSE/exec';
    const newDefaultAnaliseUrl = 'https://script.google.com/macros/s/AKfycbzMZwMR71gH4Xb2t5Jal0-5rBYslmEyjMcPmofNKO3WiUvtAMKkcSNiu3A4WNN5MdI/exec';
    
    if (!currentAnaliseUrl || currentAnaliseUrl === '' || currentAnaliseUrl === oldDefaultAnaliseUrl) {
      setSheetsUrlAnalise(newDefaultAnaliseUrl);
      localStorage.setItem('agro_sheets_url_analise', newDefaultAnaliseUrl);
    }

    const currentStopWorkUrl = localStorage.getItem('agro_sheets_url_stopwork');
    if (!currentStopWorkUrl || currentStopWorkUrl === '') {
      const defaultStopWorkUrl = 'https://script.google.com/macros/s/AKfycby3rqwZsMmh3DuQlc9EY2kU7EQB9gaVAIBKHiS0r_LN88TDBZVUBUjPAHfMR1902PZl/exec';
      setSheetsUrlStopWork(defaultStopWorkUrl);
      localStorage.setItem('agro_sheets_url_stopwork', defaultStopWorkUrl);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setSavedAnalyses([]);
      return;
    }

    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const analyses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedAnalyses(analyses);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'analyses');
      // Fallback to local storage if firestore fails
      const saved = localStorage.getItem('agro_analyses');
      if (saved) {
        try {
          setSavedAnalyses(JSON.parse(saved));
        } catch (e) {}
      }
    });

    const unsubscribeStopWork = onSnapshot(query(
      collection(db, 'stop_work'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    ), (snapshot) => {
      const stopWorks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedStopWorks(stopWorks);
    });

    return () => {
      unsubscribe();
      unsubscribeStopWork();
    };
  }, [user]);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    matricula: localStorage.getItem('agro_matricula') || '',
    nome: localStorage.getItem('agro_nome') || '',
    horario_inicio: '',
    horario_termino: '',
    supervisao: '',
    operacao: '',
    setor: '',
    fazenda: '',
    unidade: '',
    condicoes_trajeto: '',
    condicoes_carreadores: '',
    condicoes_cercas: '',
    conservacao_placas: '',
    rede_eletrica: '',
    area_declive: '',
    arvores_talhoes: '',
    canal_vinhaca: '',
    canal_escoador: '',
    pontes_danificadas: '',
    erosoes_area: '',
    presenca_pedras: '',
    culturas_vizinhas: '',
    sede_fazenda: '',
    observacao_area: '',
    necessidade_patrol: '',
    foto_arquivo: '',
    email_supervisor: '',
    email_usuario: localStorage.getItem('agro_email_usuario') || '',
  });

  const [stopWorkData, setStopWorkData] = useState({
    data: new Date().toISOString().split('T')[0],
    equipe: '',
    turno: '',
    gestor: '',
    duracao: '',
    local_setor: '',
    temas: '',
    foto: '',
    email_usuario: localStorage.getItem('agro_email_usuario') || '',
  });

  useEffect(() => {
    if (user) {
      const nome = localStorage.getItem(`agro_nome_${user.uid}`) || '';
      setStopWorkData(prev => ({ ...prev, gestor: nome, email_usuario: user.email || '' }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'supervisao') {
      const selectedOption = SUPERVISAO_OPTIONS.find(o => o.label === value);
      setFormData(prev => ({ 
        ...prev, 
        supervisao: value,
        email_supervisor: selectedOption ? selectedOption.email : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      // Persistir dados básicos
      if (['matricula', 'nome', 'email_usuario'].includes(name)) {
        localStorage.setItem(`agro_${name}`, value);
      }
    }
  };

  const handleFileUpload = async (file: File, type: 'analise' | 'stopwork') => {
    if (!file || !user) {
      console.warn('Arquivo ou usuário não encontrado:', { file: !!file, user: !!user });
      return;
    }
    
    console.log('Iniciando upload do arquivo:', file.name, 'Tamanho:', file.size, 'Tipo:', file.type);
    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `photos/${user.uid}/${Date.now()}_${file.name}`);
      console.log('Referência do storage criada:', storageRef.fullPath);
      
      const snapshot = await uploadBytes(storageRef, file);
      console.log('Upload concluído. Snapshot:', snapshot.metadata.fullPath);
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('URL de download obtida:', downloadURL);
      
      if (type === 'analise') {
        setFormData(prev => ({ ...prev, foto_arquivo: downloadURL }));
      } else {
        setStopWorkData(prev => ({ ...prev, foto: downloadURL }));
      }
      console.log('✅ Foto enviada com sucesso:', downloadURL);
    } catch (e) {
      console.error('Erro detalhado ao enviar foto:', e);
      if (e instanceof Error) {
        console.error('Mensagem de erro:', e.message);
        console.error('Stack trace:', e.stack);
      }
      setError('Erro ao enviar foto. Verifique sua conexão e as permissões do Firebase Storage.');
    } finally {
      console.log('Finalizando processo de upload.');
      setUploadingPhoto(false);
    }
  };
  const handleClearStopWorkHistory = async () => {
    if (!user || savedStopWorks.length === 0) {
      setShowClearStopWorkConfirm(false);
      return;
    }
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      savedStopWorks.forEach((sw) => {
        if (sw.id) {
          const docRef = doc(db, 'stop_work', sw.id);
          batch.delete(docRef);
        }
      });
      await batch.commit();
      setShowClearStopWorkConfirm(false);
    } catch (e) {
      setError('Erro ao limpar histórico: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet([formData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analise");
    XLSX.writeFile(wb, `Analise_Risco_${formData.nome || 'export'}.xlsx`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSyncWarning(false);
    setLastSyncStatus('idle');

    if (!sheetsUrlAnalise) {
      setError('A URL do Google Sheets para Análise de Risco não está configurada.');
      setSubmitting(false);
      return;
    }

    if (!formData.email_supervisor) {
      setError('Erro: E-mail do supervisor não identificado para esta supervisão. Verifique as configurações.');
      setSubmitting(false);
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const payload = {
        ...formData,
        userId: user?.uid,
        timestamp,
      };

      // Payload formatado especificamente para as colunas do Google Sheets
      const sheetsPayload = {
        "type": "ANALISE_RISCO",
        "Data": formData.data,
        "Matrícula": formData.matricula,
        "Nome": formData.nome,
        "Horário de inicio": formData.horario_inicio,
        "Horário de Término": formData.horario_termino,
        "Supervisão": formData.supervisao,
        "Operação": formData.operacao,
        "Setor": formData.setor,
        "Fazenda": formData.fazenda,
        "Unidade": formData.unidade,
        "Condições do trajeto": formData.condicoes_trajeto,
        "Condições dos carreadores internos": formData.condicoes_carreadores,
        "Condições das cercas vizinhas": formData.condicoes_cercas,
        "Conservação das placas no trajeto": formData.conservacao_placas,
        "Presença de rede elétrica. Se sim os postes estão coroados": formData.rede_eletrica,
        "Área com declive": formData.area_declive,
        "Existência de árvores dentro dos talhões": formData.arvores_talhoes,
        "Á presença de canal de vinhaça": formData.canal_vinhaca,
        "Á presença de canal escoador": formData.canal_escoador,
        "Pontes danificadas ou mal conservadas?": formData.pontes_danificadas,
        "Presença de erosões na área?": formData.erosoes_area,
        "Área com presença de pedras?": formData.presenca_pedras,
        "Á presença de culturas vizinhas?": formData.culturas_vizinhas,
        "Possui alguma sede na fazenda?": formData.sede_fazenda,
        "Alguma outra observação da área?": formData.observacao_area,
        "Á necessidade de máquina amarela - patrol:": formData.necessidade_patrol,
        "Foto ou arquivo se necessário": formData.foto_arquivo,
        "email_supervisor": formData.email_supervisor,
        "email_usuario": formData.email_usuario,
        "timestamp": timestamp
      };

      console.log('Payload Final para Envio (Sheets):', sheetsPayload);
      console.log('E-mail do Supervisor:', payload.email_supervisor);
      console.log('Iniciando envio para:', sheetsUrlAnalise);

      // Save to Firestore
      try {
        await addDoc(collection(db, 'analyses'), payload);
        console.log('✅ Salvo no Firestore com sucesso!');
      } catch (fsError: any) {
        handleFirestoreError(fsError, OperationType.CREATE, 'analyses');
      }
      
      setLastPayload(sheetsPayload);

      // Envia para o Google Sheets (Apps Script Web App)
      try {
        const urlToFetch = sheetsUrlAnalise.trim();
        if (!urlToFetch.startsWith('https://script.google.com')) {
          throw new Error('URL Inválida. A URL deve começar com https://script.google.com');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        await fetch(urlToFetch, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(sheetsPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setLastSyncStatus('success');
      } catch (fetchError: any) {
        console.error('Erro na requisição fetch:', fetchError);
        setSyncWarning(true);
        setLastSyncStatus('error');
        if (fetchError.name === 'AbortError') {
          console.warn('Timeout na sincronização com Google Sheets');
        }
      }
      
      setSubmitted(true);
      setStep(0);
      
      // Local storage as backup
      try {
        const newAnalyses = [payload, ...savedAnalyses];
        localStorage.setItem('agro_analyses', JSON.stringify(newAnalyses));
      } catch (e) {
        console.warn('LocalStorage quota exceeded');
      }
    } catch (e) {
      console.error('Submission error:', e);
      setError('Erro ao enviar dados: ' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSyncWarning(false);
    setLastSyncStatus('idle');

    if (!sheetsUrlStopWork) {
      setError('A URL do Google Sheets para Stop Work não está configurada.');
      setSubmitting(false);
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const payload = {
        ...stopWorkData,
        type: 'STOP_WORK',
        userId: user?.uid,
        timestamp,
      };

      const sheetsStopWorkPayload = {
        "type": "STOP_WORK",
        "DATA REGISTRO": stopWorkData.data,
        "EQUIPE": stopWorkData.equipe,
        "TURNO": stopWorkData.turno,
        "GESTOR": stopWorkData.gestor,
        "DURAÇÃO": stopWorkData.duracao,
        "LOCAL/SETOR": stopWorkData.local_setor,
        "TEMAS ABORDADOS": stopWorkData.temas,
        "FOTO": stopWorkData.foto,
        "EMAIL USUARIO": stopWorkData.email_usuario,
        "TIMESTAMP": timestamp,
        "ID USUARIO": user?.uid
      };

      // Save to Firestore
      await addDoc(collection(db, 'stop_work'), payload);
      
      setLastPayload(sheetsStopWorkPayload);

      // Envia para o Google Sheets
      try {
        await fetch(sheetsUrlStopWork.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(sheetsStopWorkPayload),
        });
        setLastSyncStatus('success');
      } catch (fetchError) {
        setSyncWarning(true);
        setLastSyncStatus('error');
      }
      
      setSubmitted(true);
      setViewState('home');
      setStopWorkData(prev => ({ ...prev, equipe: '', turno: '', duracao: '', local_setor: '', temas: '', foto: '' }));
    } catch (e) {
      setError('Erro ao enviar dados: ' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };
  const handleRetrySync = async () => {
    if (!lastPayload) return;
    
    // Determine which URL to use based on payload structure
    const isStopWork = 'DATA REGISTRO' in lastPayload;
    const urlToUse = isStopWork ? sheetsUrlStopWork : sheetsUrlAnalise;

    if (!urlToUse) return;
    
    setSubmitting(true);
    try {
      const urlToFetch = urlToUse.trim();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      await fetch(urlToFetch, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(lastPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setSyncWarning(false);
      setLastSyncStatus('success');
    } catch (e) {
      console.error('Retry failed:', e);
      setLastSyncStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user || savedAnalyses.length === 0) {
      setShowClearConfirm(false);
      return;
    }
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      savedAnalyses.forEach((analysis) => {
        if (analysis.id) {
          const docRef = doc(db, 'analyses', analysis.id);
          batch.delete(docRef);
        }
      });
      await batch.commit();
      
      // Also clear local storage backup
      localStorage.removeItem('agro_analyses');
      setSavedAnalyses([]);
      setShowClearConfirm(false);
      alert('Histórico limpo com sucesso!');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'analyses');
    } finally {
      setLoading(false);
    }
  };

  if (showSplash || !authReady) return <SplashScreen />;

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 rounded-3xl border border-zinc-800 p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <CustomLogo className="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
            <p className="text-zinc-500 text-sm text-center mt-1">
              {authMode === 'login' 
                ? 'Entre com seu e-mail Outlook para continuar.' 
                : 'Crie sua conta corporativa para acessar o App.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Nome Completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-lime-500 outline-none text-white transition-all"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Matrícula</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={authMatricula}
                      onChange={(e) => setAuthMatricula(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-lime-500 outline-none text-white transition-all"
                      placeholder="Sua matrícula"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">E-mail Outlook</label>
              <div className="relative">
                <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-lime-500 outline-none text-white transition-all"
                  placeholder="usuario@outlook.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-lime-500 outline-none text-white transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-lime-600 hover:bg-lime-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-lime-950 flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'ENTRAR' : 'CADASTRAR')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError(null);
              }}
              className="text-sm text-zinc-400 hover:text-lime-500 transition-colors"
            >
              {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-zinc-900 rounded-3xl border border-zinc-800 p-10 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-500 to-emerald-500" />
          
          <div className="w-24 h-24 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-zinc-700 shadow-inner">
            {syncWarning ? (
              <AlertTriangle className="w-12 h-12 text-amber-500 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-12 h-12 text-lime-500" />
            )}
          </div>
          
          <div className="space-y-6 mb-10">
            <h2 className="text-2xl font-mono font-bold text-zinc-100 uppercase tracking-tighter">
              {syncWarning ? "Sincronização Pendente" : "Relatório Transmitido"}
            </h2>
            {syncWarning && (
              <p className="text-xs font-mono text-amber-500/70 uppercase tracking-widest leading-relaxed">
                O relatório foi salvo localmente, mas a sincronização falhou.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {syncWarning && (
              <button
                disabled={submitting}
                onClick={handleRetrySync}
                className="w-full bg-amber-500 text-zinc-900 py-4 rounded-2xl font-mono font-bold hover:bg-amber-400 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs shadow-xl flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Re-tentar Sincronização
              </button>
            )}

            <button
              onClick={() => {
                setSubmitted(false);
                setStep(0);
                setViewState('home');
                setFormData({ ...formData, matricula: '', nome: '', setor: '', fazenda: '', observacao_area: '' });
              }}
              className="w-full bg-zinc-100 text-zinc-900 py-5 rounded-2xl font-mono font-bold hover:bg-white active:scale-95 transition-all uppercase tracking-[0.2em] text-sm shadow-xl"
            >
              Voltar ao Início
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const steps = [
    { title: "Identificação", icon: User },
    { title: "Operação", icon: Clock },
    { title: "Localização", icon: MapPin },
    { title: "Condições", icon: AlertTriangle },
    { title: "Finalização", icon: CheckCircle2 },
  ];

  const renderStopWorkForm = () => {
    return (
      <div className="space-y-6">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <h3 className="text-xl font-mono font-bold text-red-500 uppercase tracking-tighter">Lançamento Stop Work</h3>
          </div>
          <p className="text-[10px] font-mono text-red-400/70 uppercase tracking-widest">Segurança é Inegociável</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Equipe</label>
              <input
                type="text"
                value={stopWorkData.equipe}
                onChange={(e) => setStopWorkData(p => ({ ...p, equipe: e.target.value }))}
                placeholder="EX: Equipe 80 Plantio Mecanizado"
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Turno</label>
              <select
                value={stopWorkData.turno}
                onChange={(e) => setStopWorkData(p => ({ ...p, turno: e.target.value }))}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all text-zinc-100 font-mono appearance-none"
                required
              >
                <option value="">Selecione</option>
                <option value="A">Turno A</option>
                <option value="B">Turno B</option>
                <option value="C">Turno C</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Data</label>
              <input
                type="date"
                value={stopWorkData.data}
                onChange={(e) => setStopWorkData(p => ({ ...p, data: e.target.value }))}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all text-zinc-100 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Duração (Minutos)</label>
              <input
                type="number"
                value={stopWorkData.duracao}
                onChange={(e) => setStopWorkData(p => ({ ...p, duracao: e.target.value }))}
                placeholder="EX: 25"
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Gestor Responsável</label>
            <input
              type="text"
              value={stopWorkData.gestor}
              onChange={(e) => setStopWorkData(p => ({ ...p, gestor: e.target.value }))}
              className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all text-zinc-100 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Local / Setor</label>
            <input
              type="text"
              value={stopWorkData.local_setor}
              onChange={(e) => setStopWorkData(p => ({ ...p, local_setor: e.target.value }))}
              placeholder="EX: Setor 3755"
              className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Temas Abordados</label>
            <textarea
              value={stopWorkData.temas}
              onChange={(e) => setStopWorkData(p => ({ ...p, temas: e.target.value }))}
              placeholder="Liste os temas discutidos..."
              rows={4}
              className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Foto da Equipe</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-800 border-dashed rounded-2xl cursor-pointer bg-zinc-950 hover:bg-zinc-900 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
                  ) : (
                    <Camera className="w-8 h-8 text-zinc-600 mb-2" />
                  )}
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    {uploadingPhoto ? 'Enviando Foto...' : 'Anexar Foto do Stop Work'}
                  </p>
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'stopwork');
                  }}
                />
              </label>
            </div>
            {stopWorkData.foto && (
              <div className="mt-4 p-2 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                <img 
                  src={stopWorkData.foto} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded-lg"
                  referrerPolicy="no-referrer"
                />
                <p className="mt-2 text-[8px] font-mono text-red-500 uppercase tracking-widest truncate">URL: {stopWorkData.foto}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={() => setViewState('home')}
            className="flex-1 py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-mono font-bold text-xs uppercase tracking-widest border border-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleStopWorkSubmit}
            className="flex-[2] py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-mono font-bold text-sm uppercase tracking-widest shadow-xl shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Transmitindo...</span>
              </div>
            ) : "Finalizar Stop Work"}
          </button>
        </div>
      </div>
    );
  };
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">1. Data</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">2. Matrícula</label>
              <input
                type="text"
                name="matricula"
                value={formData.matricula}
                onChange={handleInputChange}
                placeholder="EX: 12345"
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">3. Nome</label>
              <select
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono appearance-none"
                required
              >
                <option value="" className="bg-zinc-900">SELECIONE O NOME</option>
                {NOMES_FUNCIONARIOS.map(n => <option key={n} value={n} className="bg-zinc-900">{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest">Remetente (E-mail)</label>
              <div className="w-full p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-500 font-mono text-xs flex items-center gap-3">
                <Mail className="w-4 h-4 text-zinc-600" />
                {formData.email_usuario || 'Não identificado'}
              </div>
              <p className="mt-2 text-[9px] text-zinc-600 font-mono italic">
                * Este e-mail será usado como remetente no sistema central.
              </p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">4. Horário de início</label>
                <input
                  type="time"
                  name="horario_inicio"
                  value={formData.horario_inicio}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">5. Horário de Término</label>
                <input
                  type="time"
                  name="horario_termino"
                  value={formData.horario_termino}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">6. Supervisão</label>
              <select
                name="supervisao"
                value={formData.supervisao}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono appearance-none"
                required
              >
                <option value="" className="bg-zinc-900">SELECIONE A SUPERVISÃO</option>
                {SUPERVISAO_OPTIONS.map(o => <option key={o.label} value={o.label} className="bg-zinc-900">{o.label}</option>)}
              </select>
              {formData.email_supervisor && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-lime-500/5 rounded-lg border border-lime-500/10">
                  <Mail className="w-3 h-3 text-lime-500" />
                  <p className="text-[9px] font-mono text-lime-500/70 uppercase tracking-widest truncate">
                    Destinatário: {formData.email_supervisor}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">7. Operação</label>
              <select
                name="operacao"
                value={formData.operacao}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono appearance-none"
                required
              >
                <option value="" className="bg-zinc-900">SELECIONE A OPERAÇÃO</option>
                {OPERACAO_OPTIONS.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">8. Setor</label>
              <input
                type="text"
                name="setor"
                value={formData.setor}
                onChange={handleInputChange}
                placeholder="EX: SETOR SUL"
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">9. Fazenda</label>
              <input
                type="text"
                name="fazenda"
                value={formData.fazenda}
                onChange={handleInputChange}
                placeholder="NOME DA FAZENDA"
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">10. Unidade</label>
              <select
                name="unidade"
                value={formData.unidade}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono appearance-none"
                required
              >
                <option value="" className="bg-zinc-900">SELECIONE A UNIDADE</option>
                {UNIDADE_OPTIONS.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-3 custom-scrollbar">
            {[
              { id: 'condicoes_trajeto', label: '11. Condições do trajeto' },
              { id: 'condicoes_carreadores', label: '12. Condições dos carreadores internos' },
              { id: 'condicoes_cercas', label: '13. Condições das cercas vizinhas' },
            ].map(item => (
              <div key={item.id}>
                <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">{item.label}</label>
                <input
                  type="text"
                  name={item.id}
                  value={(formData as any)[item.id]}
                  onChange={handleInputChange}
                  placeholder="DESCREVA AS CONDIÇÕES"
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700"
                  required
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">14. Conservação das placas no trajeto</label>
              <div className="grid grid-cols-2 gap-3">
                {['Boa', 'Ruim'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, conservacao_placas: opt }))}
                    className={cn(
                      "py-3 rounded-xl border font-mono font-bold text-[10px] uppercase tracking-widest transition-all",
                      formData.conservacao_placas === opt 
                        ? "border-lime-500 bg-lime-500/10 text-lime-500 shadow-[0_0_10px_rgba(101,163,13,0.1)]" 
                        : "border-zinc-800 bg-zinc-950 text-zinc-600 hover:border-zinc-700"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">15. Presença de rede elétrica. Se sim os postes estão coroados</label>
              <input
                type="text"
                name="rede_eletrica"
                value={formData.rede_eletrica}
                onChange={handleInputChange}
                placeholder="SIM / NÃO / OBSERVAÇÃO"
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700"
                required
              />
            </div>
            {[
              { id: 'area_declive', label: '16. Área com declive' },
              { id: 'arvores_talhoes', label: '17. Existência de árvores dentro dos talhões' },
              { id: 'canal_vinhaca', label: '18. Á presença de canal de vinhaça' },
              { id: 'canal_escoador', label: '19. Á presença de canal escoador' },
              { id: 'pontes_danificadas', label: '20. Pontes danificadas ou mal conservadas?' },
              { id: 'erosoes_area', label: '21. Presença de erosões na área?' },
              { id: 'presenca_pedras', label: '22. Área com presença de pedras?' },
              { id: 'culturas_vizinhas', label: '23. Á presença de culturas vizinhas?' },
              { id: 'sede_fazenda', label: '24. Possui alguma sede na fazenda?' },
            ].map(item => (
              <div key={item.id}>
                <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">{item.label}</label>
                <div className="flex gap-3">
                  {['Sim', 'Não'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, [item.id]: opt }))}
                      className={cn(
                        "flex-1 py-3 rounded-xl border font-mono font-bold text-[10px] uppercase tracking-widest transition-all",
                        (formData as any)[item.id] === opt 
                          ? "border-lime-500 bg-lime-500/10 text-lime-500 shadow-[0_0_10px_rgba(101,163,13,0.1)]" 
                          : "border-zinc-800 bg-zinc-950 text-zinc-600 hover:border-zinc-700"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">25. Alguma outra observação da área?</label>
              <textarea
                name="observacao_area"
                value={formData.observacao_area}
                onChange={handleInputChange}
                placeholder="REGISTRE DETALHES ADICIONAIS DA ÁREA..."
                rows={4}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition-all text-zinc-100 font-mono placeholder:text-zinc-700 resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">26. Á necessidade de máquina amarela - patrol:</label>
              <div className="flex gap-3">
                {['Sim', 'Não'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, necessidade_patrol: opt }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl border font-mono font-bold text-[10px] uppercase tracking-widest transition-all",
                      formData.necessidade_patrol === opt 
                        ? "border-lime-500 bg-lime-500/10 text-lime-500 shadow-[0_0_10px_rgba(101,163,13,0.1)]" 
                        : "border-zinc-800 bg-zinc-950 text-zinc-600 hover:border-zinc-700"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 mb-2 uppercase tracking-widest text-lime-500">27. Foto ou arquivo se necessário</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-800 border-dashed rounded-2xl cursor-pointer bg-zinc-950 hover:bg-zinc-900 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingPhoto ? (
                      <Loader2 className="w-8 h-8 text-lime-500 animate-spin mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-zinc-600 mb-2" />
                    )}
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      {uploadingPhoto ? 'Enviando Arquivo...' : 'Clique para anexar arquivo'}
                    </p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    disabled={uploadingPhoto}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'analise');
                    }}
                  />
                </label>
              </div>
              {formData.foto_arquivo && (
                <div className="mt-4 p-2 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                  <img 
                    src={formData.foto_arquivo} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                  <p className="mt-2 text-[8px] font-mono text-lime-500 uppercase tracking-widest truncate">URL: {formData.foto_arquivo}</p>
                </div>
              )}
            </div>
            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-lime-500" />
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-lime-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-mono font-bold text-zinc-100 uppercase tracking-widest mb-1">
                    Protocolo de Transmissão
                  </p>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-relaxed">
                    O RELATÓRIO SERÁ TRANSMITIDO PARA O SUPERVISOR: <span className="text-lime-500">{formData.email_supervisor || "NÃO SELECIONADO"}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-lime-600 p-2 rounded-lg">
            <CustomLogo className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight text-zinc-100">Gestão de Riscos & Stop Work</h1>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-lime-500 font-bold">Produção Agrícola</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {viewState !== 'home' && (
            <button 
              onClick={() => {
                if (viewState === 'form' && step > 0 && !submitted) {
                  if (confirm('Deseja cancelar esta análise? Os dados serão perdidos.')) {
                    setViewState('home');
                    setStep(0);
                  }
                } else {
                  setViewState('home');
                  setStep(0);
                  setSubmitted(false);
                }
              }}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
              title="Voltar ao Início"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
            title="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={exportToExcel}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-lime-500"
            title="Exportar Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        {viewState === 'home' && (
          <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 p-8 sm:p-12 flex flex-col items-center justify-center text-center mt-4 sm:mt-10 relative overflow-hidden">
            {/* Industrial Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <ShieldCheck className="w-64 h-64 text-zinc-100" />
            </div>

            <div className="relative mb-10">
              <div className="w-28 h-28 bg-zinc-800 rounded-3xl flex items-center justify-center border border-zinc-700 shadow-2xl relative z-10">
                <CustomLogo className="w-16 h-16" />
              </div>
              <div className="absolute -inset-4 bg-lime-500/10 blur-2xl rounded-full pointer-events-none" />
            </div>
            
            <div className="mb-12 relative z-10">
              <h1 className="text-4xl font-mono font-bold text-zinc-100 uppercase tracking-tighter mb-1">
                Gestão de Riscos
              </h1>
              <h2 className="text-xl font-mono font-bold text-lime-500 uppercase tracking-tighter mb-6">
                & Stop Work
              </h2>
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-500/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-500/20" />
                </div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.4em]">Operador: {user?.email?.split('@')[0].toUpperCase()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg relative z-10">
              <motion.button 
                whileHover={{ scale: 1.02, y: -4, boxShadow: "0 20px 40px -10px rgba(101,163,13,0.3)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewState('form')}
                className="group flex flex-col items-center justify-center gap-5 bg-zinc-100 hover:bg-white text-zinc-900 transition-all p-10 rounded-3xl font-mono font-bold shadow-2xl relative overflow-hidden border border-white/20"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-lime-500" />
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center group-hover:bg-lime-500 transition-all duration-300 shadow-lg group-hover:shadow-lime-500/50">
                  <Plus className="w-8 h-8 text-zinc-100" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm uppercase tracking-[0.2em] mb-1">Nova Inspeção</span>
                  <span className="text-[9px] opacity-50 uppercase tracking-widest bg-zinc-900/5 px-2 py-0.5 rounded">Iniciar Protocolo</span>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-lime-500/5 blur-2xl rounded-full group-hover:bg-lime-500/20 transition-all" />
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.02, y: -4, boxShadow: "0 20px 40px -10px rgba(220,38,38,0.3)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewState('stopwork')}
                className="group flex flex-col items-center justify-center gap-5 bg-red-600 hover:bg-red-500 text-white transition-all p-10 rounded-3xl font-mono font-bold shadow-2xl relative overflow-hidden border border-red-400/20"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/30" />
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-lg group-hover:shadow-white/20">
                  <ShieldAlert className="w-8 h-8 text-white" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm uppercase tracking-[0.2em] mb-1">Stop Work</span>
                  <span className="text-[9px] opacity-70 uppercase tracking-widest bg-black/10 px-2 py-0.5 rounded">Lançar Parada</span>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 blur-2xl rounded-full group-hover:bg-white/10 transition-all" />
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-8 relative z-10">
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: "rgba(39, 39, 42, 1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewState('list')}
                className="flex flex-col items-center justify-center gap-2 py-6 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-2xl font-mono text-[10px] uppercase tracking-widest border border-zinc-700/50 transition-all shadow-lg"
              >
                <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-700 mb-1">
                  <History className="w-4 h-4 text-lime-500" />
                </div>
                Histórico Inspeções
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: "rgba(39, 39, 42, 1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewState('stopwork_list')}
                className="flex flex-col items-center justify-center gap-2 py-6 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-2xl font-mono text-[10px] uppercase tracking-widest border border-zinc-700/50 transition-all shadow-lg"
              >
                <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-700 mb-1">
                  <History className="w-4 h-4 text-red-500" />
                </div>
                Histórico Stop Work
              </motion.button>
            </div>

            <div className="mt-14 pt-10 border-t border-zinc-800/50 w-full relative z-10">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] mb-6">
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                  Registros Recentes
                </span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{savedAnalyses.length} Total</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                {savedAnalyses.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex-shrink-0 bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-2xl min-w-[160px] text-left hover:border-zinc-700 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[9px] text-zinc-600 font-mono">{a.data}</p>
                      <div className="w-1 h-1 bg-lime-500/30 rounded-full group-hover:bg-lime-500 transition-colors" />
                    </div>
                    <p className="text-[11px] text-zinc-300 font-bold truncate uppercase tracking-tight">{a.fazenda || 'S/N'}</p>
                    <p className="text-[9px] text-zinc-500 uppercase mt-1 truncate">{a.operacao || 'Geral'}</p>
                  </div>
                ))}
                {savedAnalyses.length === 0 && (
                  <div className="w-full py-8 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center">
                    <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest">Nenhum registro local encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showTestSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-[60] p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-lime-500" />
                <div className="w-20 h-20 bg-lime-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-lime-500/20 shadow-inner">
                  <CheckCircle2 className="w-10 h-10 text-lime-500" />
                </div>
                <h3 className="text-xl font-mono font-bold text-zinc-100 mb-3 uppercase tracking-tighter">Teste Transmitido</h3>
                <p className="text-zinc-500 font-mono text-[10px] mb-8 uppercase tracking-widest leading-relaxed">
                  O PROTOCOLO DE TESTE FOI DISPARADO COM SUCESSO. VERIFIQUE SUA CAIXA DE ENTRADA E SPAM EM ALGUNS INSTANTES.
                </p>
                <button 
                  onClick={() => setShowTestSuccess(false)}
                  className="w-full py-4 bg-zinc-100 hover:bg-white text-zinc-900 rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-[0.2em] shadow-xl active:scale-95"
                >
                  Confirmar Recebimento
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewState === 'list' && (
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-mono font-bold text-zinc-100 uppercase tracking-tighter">Histórico de Operações</h2>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Registros de Inspeção</p>
              </div>
              
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 shadow-inner">
                {savedAnalyses.length > 0 && (
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="p-2 hover:bg-red-500/10 rounded-full text-red-500 transition-colors mr-2 border-r border-zinc-800 pr-4"
                    title="Limpar Histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <Calendar className="w-4 h-4 text-zinc-500" />
                <input 
                  type="date" 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="text-xs font-mono outline-none bg-transparent text-zinc-300 uppercase"
                />
                {dateFilter && (
                  <button 
                    onClick={() => setDateFilter('')}
                    className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            
            {savedAnalyses.length === 0 ? (
              <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-12 text-center">
                <History className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Nenhuma análise registrada no banco local.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {savedAnalyses
                  .filter(a => !dateFilter || a.data === dateFilter)
                  .map((analysis, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedAnalysis(analysis)}
                    className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex flex-col gap-4 text-left hover:border-lime-500/50 hover:bg-zinc-800/50 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-lime-500 transition-colors" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{analysis.data}</span>
                          <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{analysis.matricula}</span>
                        </div>
                        <h3 className="font-mono font-bold text-zinc-100 group-hover:text-lime-500 transition-colors uppercase tracking-tight">{analysis.nome || 'Sem nome'}</h3>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase mt-1 tracking-tighter">
                          {analysis.fazenda} • {analysis.operacao}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[9px] font-mono font-bold px-3 py-1 bg-lime-500/10 text-lime-500 rounded-lg border border-lime-500/20 uppercase tracking-widest">
                          Arquivado
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-lime-500 transition-all transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </button>
                ))}
                {savedAnalyses.filter(a => !dateFilter || a.data === dateFilter).length === 0 && (
                  <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-12 text-center">
                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Nenhuma análise encontrada para esta data.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {viewState === 'stopwork_list' && (
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-mono font-bold text-zinc-100 uppercase tracking-tighter">Histórico Stop Work</h2>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Registros de Segurança</p>
              </div>
              
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 shadow-inner">
                {savedStopWorks.length > 0 && (
                  <button 
                    onClick={() => setShowClearStopWorkConfirm(true)}
                    className="p-2 hover:bg-red-500/10 rounded-full text-red-500 transition-colors mr-2 border-r border-zinc-800 pr-4"
                    title="Limpar Histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <Calendar className="w-4 h-4 text-zinc-500" />
                <input 
                  type="date" 
                  value={stopWorkDateFilter}
                  onChange={(e) => setStopWorkDateFilter(e.target.value)}
                  className="text-xs font-mono outline-none bg-transparent text-zinc-300 uppercase"
                />
                {stopWorkDateFilter && (
                  <button 
                    onClick={() => setStopWorkDateFilter('')}
                    className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            
            {savedStopWorks.length === 0 ? (
              <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-12 text-center">
                <History className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Nenhum Stop Work registrado no banco local.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {savedStopWorks
                  .filter(sw => !stopWorkDateFilter || sw.data === stopWorkDateFilter)
                  .map((sw, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedStopWork(sw)}
                    className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex flex-col gap-4 text-left hover:border-red-500/50 hover:bg-zinc-800/50 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-red-500 transition-colors" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{sw.data}</span>
                          <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{sw.equipe} - Turno {sw.turno}</span>
                        </div>
                        <h3 className="font-mono font-bold text-zinc-100 group-hover:text-red-500 transition-colors uppercase tracking-tight">{sw.gestor || 'Sem gestor'}</h3>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase mt-1 tracking-tighter">
                          {sw.local_setor} • {sw.duracao} min
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[9px] font-mono font-bold px-3 py-1 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 uppercase tracking-widest">
                          Stop Work
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-red-500 transition-all transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </button>
                ))}
                {savedStopWorks.filter(sw => !stopWorkDateFilter || sw.data === stopWorkDateFilter).length === 0 && (
                  <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-12 text-center">
                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Nenhum Stop Work encontrado para esta data.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Report Modal */}
        <AnimatePresence>
          {selectedAnalysis && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-500 to-emerald-500" />
                
                <button 
                  onClick={() => setSelectedAnalysis(null)}
                  className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-inner">
                    <ClipboardCheck className="w-6 h-6 text-lime-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-mono font-bold text-zinc-100 uppercase tracking-tighter">Relatório de Inspeção</h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Protocolo: {selectedAnalysis.timestamp?.split('T')[0]}-{Math.random().toString(36).substr(2, 5).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-3 bg-lime-500 rounded-full" />
                      <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">Identificação</h3>
                    </div>
                    <div className="space-y-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                      <DetailItem label="1. Data" value={selectedAnalysis.data} />
                      <DetailItem label="2. Matrícula" value={selectedAnalysis.matricula} />
                      <DetailItem label="3. Nome" value={selectedAnalysis.nome} />
                      <DetailItem label="4. Horário de inicio" value={selectedAnalysis.horario_inicio} />
                      <DetailItem label="5. Horário de Término" value={selectedAnalysis.horario_termino} />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-3 bg-lime-500 rounded-full" />
                      <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">Localização</h3>
                    </div>
                    <div className="space-y-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                      <DetailItem label="6. Supervisão" value={selectedAnalysis.supervisao} />
                      <DetailItem label="7. Operação" value={selectedAnalysis.operacao} />
                      <DetailItem label="8. Setor" value={selectedAnalysis.setor} />
                      <DetailItem label="9. Fazenda" value={selectedAnalysis.fazenda} />
                      <DetailItem label="10. Unidade" value={selectedAnalysis.unidade} />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-3 bg-lime-500 rounded-full" />
                      <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">Condições da Área</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50">
                      <DetailItem label="11. Condições do trajeto" value={selectedAnalysis.condicoes_trajeto} />
                      <DetailItem label="12. Condições dos carreadores internos" value={selectedAnalysis.condicoes_carreadores} />
                      <DetailItem label="13. Condições das cercas vizinhas" value={selectedAnalysis.condicoes_cercas} />
                      <DetailItem label="14. Conservação das placas no trajeto" value={selectedAnalysis.conservacao_placas} />
                      <DetailItem label="15. Presença de rede elétrica" value={selectedAnalysis.rede_eletrica} />
                      <DetailItem label="16. Área com declive" value={selectedAnalysis.area_declive} />
                      <DetailItem label="17. Existência de árvores dentro dos talhões" value={selectedAnalysis.arvores_talhoes} />
                      <DetailItem label="18. Á presença de canal de vinhaça" value={selectedAnalysis.canal_vinhaca} />
                      <DetailItem label="19. Á presença de canal escoador" value={selectedAnalysis.canal_escoador} />
                      <DetailItem label="20. Pontes danificadas ou mal conservadas?" value={selectedAnalysis.pontes_danificadas} />
                      <DetailItem label="21. Presença de erosões na área?" value={selectedAnalysis.erosoes_area} />
                      <DetailItem label="22. Área com presença de pedras?" value={selectedAnalysis.presenca_pedras} />
                      <DetailItem label="23. Á presença de culturas vizinhas?" value={selectedAnalysis.culturas_vizinhas} />
                      <DetailItem label="24. Possui alguma sede na fazenda?" value={selectedAnalysis.sede_fazenda} />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-3 bg-lime-500 rounded-full" />
                      <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">Conclusão</h3>
                    </div>
                    <div className="space-y-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50">
                      <DetailItem label="25. Alguma outra observação da área?" value={selectedAnalysis.observacao_area} />
                      <DetailItem label="26. Á necessidade de máquina amarela - patrol:" value={selectedAnalysis.necessidade_patrol} />
                      <DetailItem label="27. Foto ou arquivo se necessário" value={selectedAnalysis.foto_arquivo || 'Nenhum arquivo'} />
                      <DetailItem label="Supervisor Notificado" value={selectedAnalysis.email_supervisor} />
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-800 flex justify-end">
                  <button 
                    onClick={() => setSelectedAnalysis(null)}
                    className="px-10 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-mono font-bold text-xs hover:bg-white transition-all uppercase tracking-widest shadow-xl"
                  >
                    Fechar Relatório
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {selectedStopWork && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                
                <button 
                  onClick={() => setSelectedStopWork(null)}
                  className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-inner">
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-mono font-bold text-zinc-100 uppercase tracking-tighter">Relatório Stop Work</h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Protocolo: {selectedStopWork.timestamp?.split('T')[0]}-SW-{Math.random().toString(36).substr(2, 5).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-3 bg-red-500 rounded-full" />
                      <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">Identificação</h3>
                    </div>
                    <div className="space-y-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                      <DetailItem label="Data" value={selectedStopWork.data} />
                      <DetailItem label="Equipe" value={selectedStopWork.equipe} />
                      <DetailItem label="Turno" value={selectedStopWork.turno} />
                      <DetailItem label="Gestor Responsável" value={selectedStopWork.gestor} />
                      <DetailItem label="Duração" value={`${selectedStopWork.duracao} minutos`} />
                      <DetailItem label="Local / Setor" value={selectedStopWork.local_setor} />
                    </div>
                  </div>
                  
                  <div className="sm:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-3 bg-red-500 rounded-full" />
                      <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">Temas Abordados</h3>
                    </div>
                    <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50">
                      <p className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                        {selectedStopWork.temas}
                      </p>
                    </div>
                  </div>

                  {selectedStopWork.foto && (
                    <div className="sm:col-span-2 space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-3 bg-red-500 rounded-full" />
                        <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">Evidência Fotográfica</h3>
                      </div>
                      <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Arquivo: {selectedStopWork.foto}</p>
                        <div className="w-full h-48 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
                          <Camera className="w-12 h-12 text-zinc-800" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-800 flex justify-end">
                  <button 
                    onClick={() => setSelectedStopWork(null)}
                    className="px-10 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-mono font-bold text-xs hover:bg-white transition-all uppercase tracking-widest shadow-xl"
                  >
                    Fechar Relatório
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear History Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-[70] p-4 bg-black/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-inner">
                  <ShieldAlert className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="text-xl font-mono font-bold text-zinc-100 mb-3 uppercase tracking-tighter">Limpar Histórico?</h3>
                <p className="text-zinc-500 font-mono text-[10px] mb-8 uppercase tracking-widest leading-relaxed">
                  ESTA AÇÃO IRÁ APAGAR PERMANENTEMENTE TODOS OS REGISTROS DE INSPEÇÃO SALVOS NESTE DISPOSITIVO E NO BANCO DE DADOS. ESTA OPERAÇÃO NÃO PODE SER DESFEITA.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleClearHistory}
                    disabled={loading}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-[0.2em] shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    CONFIRMAR EXCLUSÃO
                  </button>
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-[0.2em] active:scale-95"
                  >
                    CANCELAR
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showClearStopWorkConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-[70] p-4 bg-black/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-inner">
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-mono font-bold text-zinc-100 mb-3 uppercase tracking-tighter">Limpar Stop Work?</h3>
                <p className="text-zinc-500 font-mono text-[10px] mb-8 uppercase tracking-widest leading-relaxed">
                  ESTA AÇÃO IRÁ APAGAR PERMANENTEMENTE TODOS OS REGISTROS DE STOP WORK SALVOS NESTE DISPOSITIVO E NO BANCO DE DADOS. ESTA OPERAÇÃO NÃO PODE SER DESFEITA.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleClearStopWorkHistory}
                    disabled={loading}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-[0.2em] shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    CONFIRMAR EXCLUSÃO
                  </button>
                  <button 
                    onClick={() => setShowClearStopWorkConfirm(false)}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-mono font-bold text-xs transition-all uppercase tracking-[0.2em] active:scale-95"
                  >
                    CANCELAR
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewState === 'stopwork' && (
          <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 p-6 sm:p-10">
            {renderStopWorkForm()}
          </div>
        )}

        {viewState === 'form' && (
          <>
            {/* Progress Bar */}
            <div className="mb-8 sm:mb-12">
              <div className="flex justify-between mb-4">
                {steps.map((s, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex flex-col items-center gap-2",
                      i <= step ? "text-lime-500" : "text-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold transition-all border-2",
                      i < step ? "bg-lime-600 border-lime-600 text-white shadow-[0_0_15px_rgba(101,163,13,0.3)]" : 
                      i === step ? "bg-zinc-900 border-lime-500 text-lime-500 shadow-[0_0_15px_rgba(101,163,13,0.2)]" : 
                      "bg-zinc-900 border-zinc-800 text-zinc-700"
                    )}>
                      {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-[0.2em] hidden sm:block">{s.title}</span>
                  </div>
                ))}
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  className="h-full bg-gradient-to-r from-lime-600 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800" />
              <div className="absolute top-0 left-0 h-1 bg-lime-500 transition-all duration-500" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
              
              <div className="p-6 sm:p-10">
                <div className="flex items-center gap-4 mb-8 sm:mb-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-inner shrink-0">
                    {React.createElement(steps[step].icon, { className: "w-5 h-5 sm:w-6 sm:h-6 text-lime-500" })}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-mono font-bold text-zinc-100 uppercase tracking-tighter">{steps[step].title}</h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Passo {step + 1} de {steps.length}</p>
                  </div>
                </div>

                <form onSubmit={(e) => e.preventDefault()}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ x: 10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -10, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderStep()}
                    </motion.div>
                  </AnimatePresence>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest mb-1">Erro de Validação</p>
                        <p className="text-xs font-mono text-red-200/70">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row gap-4">
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep(s => s - 1)}
                        className="w-full sm:flex-1 flex items-center justify-center gap-3 py-4 sm:py-5 rounded-2xl font-mono font-bold text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-750 hover:text-zinc-100 transition-all border border-zinc-700 uppercase tracking-widest"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Voltar
                      </button>
                    )}
                    {step < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setStep(s => s + 1)}
                        className="w-full sm:flex-[2] flex items-center justify-center gap-3 py-4 sm:py-5 rounded-2xl font-mono font-bold text-sm text-zinc-900 bg-zinc-100 hover:bg-white active:scale-[0.98] transition-all shadow-xl uppercase tracking-widest"
                      >
                        Próximo Passo
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="w-full sm:flex-[2] flex items-center justify-center gap-3 py-4 sm:py-5 rounded-2xl font-mono font-bold text-sm text-white bg-lime-600 hover:bg-lime-500 active:scale-[0.98] transition-all shadow-xl shadow-lime-900/20 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Transmitindo...
                          </>
                        ) : (
                          <>
                            Finalizar Inspeção
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <p className="mt-8 text-center text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em] px-4">
              Aviso: O envio deste formulário registra automaticamente sua identidade e carimbo de data/hora.
            </p>
          </>
        )}
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 w-full bg-zinc-950 border-t border-zinc-900 px-4 py-2 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              lastSyncStatus === 'success' ? "bg-lime-500" : 
              lastSyncStatus === 'error' ? "bg-red-500" : "bg-zinc-700"
            )} />
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              {lastSyncStatus === 'success' ? "Sincronizado" : 
               lastSyncStatus === 'error' ? "Erro de Sincronização" : "Pronto"}
            </span>
          </div>
          <div className="h-3 w-[1px] bg-zinc-800" />
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
            v2.4.0-INDUSTRIAL
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Wifi className={cn(
              "w-3 h-3",
              navigator.onLine ? "text-lime-500" : "text-red-500"
            )} />
            <span className="text-[9px] font-mono text-zinc-600 uppercase">
              {navigator.onLine ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-500 to-emerald-500" />
              
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                  <Settings className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <h2 className="text-xl font-mono font-bold text-zinc-100 uppercase tracking-tighter">Configurações</h2>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Parâmetros do Sistema</p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-lime-500 font-bold">
                    {user?.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{user?.email}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Usuário Autenticado</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  SAIR DA CONTA
                </button>
                <button 
                  onClick={() => {
                    setShowSettings(false);
                    setShowClearConfirm(true);
                  }}
                  className="w-full py-2 mt-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  LIMPAR HISTÓRICO INTERNO
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">URL Análise de Risco (Integrada)</label>
                  <input
                    type="url"
                    value={sheetsUrlAnalise}
                    onChange={(e) => setSheetsUrlAnalise(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-500 outline-none text-zinc-100 font-mono text-xs opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">URL Stop Work (Nova Planilha)</label>
                  <input
                    type="url"
                    value={sheetsUrlStopWork}
                    onChange={(e) => setSheetsUrlStopWork(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-red-500 outline-none text-zinc-100 font-mono text-xs"
                  />
                  <p className="mt-2 text-[9px] text-zinc-600 font-mono italic">
                    * Insira o link do novo Apps Script para a planilha de Stop Work.
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        await fetch('https://www.google.com', { mode: 'no-cors', signal: controller.signal });
                        clearTimeout(timeoutId);
                        
                        try {
                          const scriptController = new AbortController();
                          const scriptTimeoutId = setTimeout(() => scriptController.abort(), 5000);
                          await fetch('https://script.google.com', { mode: 'no-cors', signal: scriptController.signal });
                          clearTimeout(scriptTimeoutId);
                          alert('✅ CONEXÃO COM GOOGLE SCRIPTS ESTÁ OK!\nA rede permite o envio de dados.');
                        } catch (e) {
                          alert('⚠️ BLOQUEIO DETECTADO: O Wi-Fi da Usina está bloqueando o Google Scripts.\n\nSOLUÇÃO: Desligue o Wi-Fi e use os DADOS MÓVEIS (4G/5G) para enviar.');
                        }
                      } catch (e) {
                        alert('❌ SEM CONEXÃO: O dispositivo está totalmente sem internet.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full py-3 bg-zinc-950 text-zinc-400 rounded-xl text-[10px] font-mono font-bold hover:text-zinc-100 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 border border-zinc-800"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                    VERIFICAR BLOQUEIO DE REDE
                  </button>
                </div>

                <div className="pt-4">
                  <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">E-mail para Teste</label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-500 outline-none text-zinc-100 font-mono text-xs"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={() => {
                      localStorage.setItem('agro_sheets_url_analise', sheetsUrlAnalise);
                      localStorage.setItem('agro_sheets_url_stopwork', sheetsUrlStopWork);
                      localStorage.setItem('agro_test_email', testEmail);
                      setShowSettings(false);
                      setLastSyncStatus('idle');
                    }}
                    className="w-full py-4 bg-lime-600 text-white rounded-xl font-mono font-bold text-sm hover:bg-lime-500 transition-all shadow-lg shadow-lime-900/20 uppercase tracking-widest"
                  >
                    Salvar Configurações
                  </button>

                  <button
                    disabled={isTesting}
                    onClick={async () => {
                      if (!sheetsUrlAnalise) {
                        setError('Configure a URL do Google Sheets primeiro!');
                        return;
                      }
                      if (!testEmail) {
                        setError('Preencha o e-mail de teste!');
                        return;
                      }

                      setIsTesting(true);
                      setTestSuccess(null);
                      setTestLogs([]);
                      setError(null);
                      
                      addLog('Iniciando diagnóstico de transmissão...');
                      addLog(`URL: ${sheetsUrlAnalise.substring(0, 30)}...`);
                      addLog(`Destinatário: ${testEmail}`);

                      try {
                        if (!sheetsUrlAnalise.startsWith('https://script.google.com')) {
                          throw new Error('URL Inválida. Deve começar com script.google.com');
                        }

                        addLog('Verificando conectividade básica...');
                        const online = navigator.onLine;
                        addLog(`Status do Navegador: ${online ? 'ONLINE' : 'OFFLINE'}`);

                        if (!online) throw new Error('Dispositivo está offline.');

                        addLog('Preparando pacote de dados (Payload)...');
                        const testPayload = {
                          "Data": new Date().toLocaleDateString('pt-BR'),
                          "Matrícula": "TESTE-001",
                          "Nome": "USUÁRIO DE TESTE",
                          "Horário de inicio": "08:00",
                          "Horário de Término": "17:00",
                          "Supervisão": "TESTE DE SISTEMA",
                          "Operação": "DIAGNÓSTICO DE REDE",
                          "Setor": "999",
                          "Fazenda": "USINA COCAL - TESTE",
                          "Unidade": "TESTE",
                          "Condições do trajeto": "Ótima",
                          "Condições dos carreadores internos": "Ótima",
                          "Condições das cercas vizinhas": "Sim",
                          "Conservação das placas no trajeto": "Boa",
                          "Presença de rede elétrica. Se sim os postes estão coroados": "Sim",
                          "Área com declive": "Não",
                          "Existência de árvores dentro dos talhões": "Não",
                          "Á presença de canal de vinhaça": "Não",
                          "Á presença de canal escoador": "Não",
                          "Pontes danificadas ou mal conservadas?": "Não",
                          "Presença de erosões na área?": "Não",
                          "Área com presença de pedras?": "Não",
                          "Á presença de culturas vizinhas?": "Não",
                          "Possui alguma sede na fazenda?": "Não",
                          "Alguma outra observação da área?": `RELATÓRIO DE TESTE TÉCNICO INDUSTRIAL.
--------------------------------------------------
ID: ${Math.random().toString(36).substring(7).toUpperCase()}
Data: ${new Date().toLocaleString('pt-BR')}
Rede Detectada: ${navigator.onLine ? 'Ativa' : 'Inativa'}`,
                          "Á necessidade de máquina amarela - patrol:": "Não",
                          "Foto ou arquivo se necessário": "teste.jpg",
                          "email_supervisor": testEmail,
                          "email_usuario": testEmail,
                          "timestamp": new Date().toISOString(),
                        };

                        addLog('Tentando requisição POST (JSON via text/plain)...');
                        
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 15000);

                        try {
                          await fetch(sheetsUrlAnalise.trim(), {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify(testPayload),
                            signal: controller.signal
                          });
                          
                          clearTimeout(timeoutId);
                          addLog('Dados enviados ao Google.');
                          addLog('Payload enviado: ' + JSON.stringify(testPayload));
                          addLog('Nota: Em modo no-cors, o navegador não permite ver a resposta do script, mas o pacote foi entregue.');
                          
                          setLastSyncStatus('success');
                          setTestSuccess(true);
                          setShowTestSuccess(true);
                        } catch (fetchErr: any) {
                          clearTimeout(timeoutId);
                          if (fetchErr.name === 'AbortError') {
                            throw new Error('Tempo limite esgotado (Timeout). A rede da usina pode estar bloqueando o Google Scripts.');
                          }
                          throw fetchErr;
                        }

                      } catch (e: any) {
                        addLog(`ERRO CRÍTICO: ${e.message}`);
                        setLastSyncStatus('error');
                        setTestSuccess(false);
                        setError('Falha no Diagnóstico: ' + e.message);
                      } finally {
                        setIsTesting(false);
                      }
                    }}
                    className="w-full py-4 bg-zinc-800 text-zinc-100 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all border border-zinc-700 shadow-lg uppercase tracking-widest disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        EXECUTANDO DIAGNÓSTICO...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        EXECUTAR DIAGNÓSTICO DE CONEXÃO
                      </>
                    )}
                  </button>

                  {testLogs.length > 0 && (
                    <div className="mt-4 p-4 bg-black rounded-xl border border-zinc-800 font-mono text-[9px] text-zinc-400 max-h-32 overflow-y-auto custom-scrollbar">
                      <p className="text-zinc-600 mb-2 uppercase tracking-widest border-b border-zinc-900 pb-1">Console de Diagnóstico</p>
                      {testLogs.map((log, i) => (
                        <div key={i} className="mb-1 leading-tight">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar Industrial */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-2 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            lastSyncStatus === 'success' ? "bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.5)]" : 
            lastSyncStatus === 'error' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-zinc-600"
          )} />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {lastSyncStatus === 'success' ? "Sistema Online / Sincronizado" : 
             lastSyncStatus === 'error' ? "Erro de Conexão Detectado" : "Aguardando Atividade"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-700 hidden sm:inline">COCAL_AGRO_V2.1</span>
          <span className="text-[10px] font-mono text-zinc-600">MODO_INDUSTRIAL</span>
        </div>
      </div>
    </div>
  );
}
