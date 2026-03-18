/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { auth, db } from './firebase';
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
  getDoc
} from 'firebase/firestore';

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
    <h1 className="text-4xl font-bold text-zinc-100 tracking-tighter">Análise de Riscos</h1>
    <p className="text-zinc-500 mt-2 tracking-widest uppercase text-sm">Desenvolvido por: Pedro Arce</p>
  </motion.div>
);

const DetailItem = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">{label}</span>
    <span className="text-sm text-stone-700 font-medium">{value || 'N/A'}</span>
  </div>
);

export default function App() {
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
          nome: nome,
          matricula: matricula
        }));
        setTestEmail(u.email || 'pedro.arce@cocal.com.br');
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
          createdAt: new Date().toISOString()
        });

        await sendEmailVerification(u);
        setAuthError('Conta criada! Um e-mail de verificação foi enviado. Por favor, verifique sua caixa de entrada.');
        setAuthMode('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setAuthError('Ocorreu um erro ao tentar autenticar. Tente novamente.');
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
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [viewState, setViewState] = useState<'home' | 'form' | 'list'>('home');
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [testEmail, setTestEmail] = useState('pedro.arce@cocal.com.br');
  const [sheetsUrl, setSheetsUrl] = useState(localStorage.getItem('agro_sheets_url') || import.meta.env.VITE_GOOGLE_SHEETS_API_URL || '');
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);

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
      console.error('Firestore error:', err);
      // Fallback to local storage if firestore fails
      const saved = localStorage.getItem('agro_analyses');
      if (saved) {
        try {
          setSavedAnalyses(JSON.parse(saved));
        } catch (e) {}
      }
    });

    return () => unsubscribe();
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
    email_supervisor: '',
    email_usuario: localStorage.getItem('agro_email_usuario') || '',
  });

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

    if (!sheetsUrl) {
      setError('A URL do Google Sheets não está configurada. Vá em Configurações (ícone de engrenagem) para definir a URL do Web App.');
      setSubmitting(false);
      return;
    }

    if (!formData.email_supervisor) {
      setError('Erro: E-mail do supervisor não identificado para esta supervisão. Verifique as configurações.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        userId: user?.uid,
        timestamp: new Date().toISOString(),
      };

      console.log('Payload Final para Envio:', payload);
      console.log('E-mail do Supervisor:', payload.email_supervisor);
      console.log('Iniciando envio para:', sheetsUrl);

      // Save to Firestore
      await addDoc(collection(db, 'analyses'), payload);

      // Envia para o Google Sheets (Apps Script Web App)
      try {
        await fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });
      } catch (fetchError) {
        console.error('Erro na requisição fetch:', fetchError);
        // We still consider it a success if Firestore worked
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center"
        >
          <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-lime-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Enviado com Sucesso!</h2>
          <p className="text-stone-500 mb-8">Sua análise de risco foi registrada na planilha.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setStep(0);
              setViewState('home');
              setFormData({ ...formData, matricula: '', nome: '', setor: '', fazenda: '', observacao_area: '' });
            }}
            className="bg-lime-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-lime-700 transition-colors"
          >
            Voltar ao Início
          </button>
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

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">1. Data</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">2. Matrícula</label>
              <input
                type="text"
                name="matricula"
                value={formData.matricula}
                onChange={handleInputChange}
                placeholder="Digite sua matrícula"
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">3. Nome</label>
              <select
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              >
                <option value="">Selecione seu nome</option>
                {NOMES_FUNCIONARIOS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">4. Início</label>
              <input
                type="time"
                name="horario_inicio"
                value={formData.horario_inicio}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">5. Término</label>
              <input
                type="time"
                name="horario_termino"
                value={formData.horario_termino}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">6. Supervisão</label>
              <select
                name="supervisao"
                value={formData.supervisao}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              >
                <option value="">Selecione a supervisão</option>
                {SUPERVISAO_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
              </select>
              {formData.email_supervisor && (
                <p className="mt-2 text-[10px] text-stone-400 px-2 italic">
                  O relatório será enviado para: {formData.email_supervisor}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">7. Operação</label>
              <select
                name="operacao"
                value={formData.operacao}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              >
                <option value="">Selecione a operação</option>
                {OPERACAO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">8. Setor</label>
              <input
                type="text"
                name="setor"
                value={formData.setor}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">9. Fazenda</label>
              <input
                type="text"
                name="fazenda"
                value={formData.fazenda}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">10. Unidade</label>
              <select
                name="unidade"
                value={formData.unidade}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              >
                <option value="">Selecione a unidade</option>
                {UNIDADE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {[
              { id: 'condicoes_trajeto', label: '11. Condições do trajeto' },
              { id: 'condicoes_carreadores', label: '12. Condições dos carreadores internos' },
              { id: 'condicoes_cercas', label: '13. Condições das cercas vizinhas' },
            ].map(item => (
              <div key={item.id}>
                <label className="block text-sm font-semibold text-stone-500 mb-2">{item.label}</label>
                <input
                  type="text"
                  name={item.id}
                  value={(formData as any)[item.id]}
                  onChange={handleInputChange}
                  className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                  required
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">14. Conservação das placas</label>
              <select
                name="conservacao_placas"
                value={formData.conservacao_placas}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              >
                <option value="">Selecione</option>
                <option value="Boa">Boa</option>
                <option value="Ruim">Ruim</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">15. Rede elétrica (postes coroados?)</label>
              <input
                type="text"
                name="rede_eletrica"
                value={formData.rede_eletrica}
                onChange={handleInputChange}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all"
                required
              />
            </div>
            {[
              { id: 'area_declive', label: '16. Área com declive' },
              { id: 'arvores_talhoes', label: '17. Árvores nos talhões' },
              { id: 'canal_vinhaca', label: '18. Canal de vinhaça' },
              { id: 'canal_escoador', label: '19. Canal escoador' },
              { id: 'pontes_danificadas', label: '20. Pontes danificadas' },
              { id: 'erosoes_area', label: '21. Erosões na área' },
              { id: 'presenca_pedras', label: '22. Presença de pedras' },
              { id: 'culturas_vizinhas', label: '23. Culturas vizinhas' },
              { id: 'sede_fazenda', label: '24. Sede na fazenda' },
            ].map(item => (
              <div key={item.id}>
                <label className="block text-sm font-semibold text-stone-500 mb-2">{item.label}</label>
                <div className="flex gap-4">
                  {['Sim', 'Não'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, [item.id]: opt }))}
                      className={cn(
                        "flex-1 py-3 rounded-xl border-2 transition-all font-medium",
                        (formData as any)[item.id] === opt 
                          ? "border-lime-500 bg-lime-50 text-lime-700" 
                          : "border-stone-100 bg-stone-50 text-stone-500 hover:border-stone-200"
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
              <label className="block text-sm font-semibold text-stone-500 mb-2">25. Outra observação da área</label>
              <textarea
                name="observacao_area"
                value={formData.observacao_area}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">26. Necessidade de patrol</label>
              <div className="flex gap-4">
                {['Sim', 'Não'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, necessidade_patrol: opt }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl border-2 transition-all font-medium",
                      formData.necessidade_patrol === opt 
                        ? "border-lime-500 bg-lime-50 text-lime-700" 
                        : "border-stone-100 bg-stone-50 text-stone-500 hover:border-stone-200"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-lime-50 border border-lime-100 rounded-2xl">
              <p className="text-sm text-lime-700 font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                O relatório será enviado automaticamente para:
              </p>
              <p className="text-xs text-lime-600 mt-1 font-mono">
                {formData.email_supervisor || "Selecione a supervisão no passo 1"}
              </p>
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
            <h1 className="text-base sm:text-lg font-bold leading-tight text-zinc-100">Análise de Riscos</h1>
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
          <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 p-6 sm:p-8 flex flex-col items-center justify-center text-center mt-4 sm:mt-10">
            <CustomLogo className="w-20 h-20 mb-6" />
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Bem-vindo, {user?.email?.split('@')[0]}</h2>
            <p className="text-zinc-400 mb-8 text-sm sm:text-base">Escolha uma das opções abaixo para continuar.</p>
            
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button 
                onClick={() => setViewState('form')}
                className="w-full flex items-center justify-center gap-3 bg-lime-600 hover:bg-lime-700 text-white transition-all py-4 rounded-2xl font-bold shadow-lg shadow-lime-950"
              >
                <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base">INICIAR NOVA ANÁLISE</span>
              </button>
              
              <button 
                onClick={() => setViewState('list')}
                className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-all py-4 rounded-2xl font-bold border border-zinc-700"
              >
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base">VER ANÁLISES ANTERIORES</span>
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showTestSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-[60] p-4 bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-lime-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Teste Enviado!</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  O relatório de teste foi enviado com sucesso. Verifique sua caixa de entrada e spam em instantes.
                </p>
                <button 
                  onClick={() => setShowTestSuccess(false)}
                  className="w-full py-3 bg-lime-600 hover:bg-lime-700 text-white rounded-xl font-bold transition-all"
                >
                  ENTENDIDO
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewState === 'list' && (
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">Análises Anteriores</h2>
              
              <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
                <Calendar className="w-4 h-4 text-stone-400" />
                <input 
                  type="date" 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="text-sm outline-none bg-transparent text-stone-600"
                />
                {dateFilter && (
                  <button 
                    onClick={() => setDateFilter('')}
                    className="p-1 hover:bg-stone-100 rounded-full text-stone-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            
            {savedAnalyses.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-8 text-center">
                <p className="text-stone-500">Nenhuma análise registrada ainda.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {savedAnalyses
                  .filter(a => !dateFilter || a.data === dateFilter)
                  .map((analysis, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedAnalysis(analysis)}
                    className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 sm:p-6 flex flex-col gap-4 text-left hover:border-lime-500 transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                      <div>
                        <h3 className="font-bold text-stone-900 group-hover:text-lime-600 transition-colors">{analysis.nome || 'Sem nome'}</h3>
                        <p className="text-sm text-stone-500">Data: {analysis.data} | Matrícula: {analysis.matricula}</p>
                        <p className="text-xs text-stone-400 mt-1">Operação: {analysis.operacao}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold px-3 py-1 bg-lime-100 text-lime-700 rounded-full w-fit">
                          Concluída
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-lime-500 transition-all" />
                      </div>
                    </div>
                  </button>
                ))}
                {savedAnalyses.filter(a => !dateFilter || a.data === dateFilter).length === 0 && (
                  <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-8 text-center">
                    <p className="text-stone-500">Nenhuma análise encontrada para esta data.</p>
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
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar"
              >
                <button 
                  onClick={() => setSelectedAnalysis(null)}
                  className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-lime-100 p-3 rounded-2xl border border-lime-200">
                    <ClipboardCheck className="w-6 h-6 text-lime-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">Relatório de Inspeção</h2>
                    <p className="text-xs text-stone-500 font-medium">Protocolo: {selectedAnalysis.timestamp?.split('T')[0]}-{Math.random().toString(36).substr(2, 5).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-lime-600 uppercase tracking-wider">Identificação</h3>
                    <div className="space-y-2">
                      <DetailItem label="Funcionário" value={selectedAnalysis.nome} />
                      <DetailItem label="Matrícula" value={selectedAnalysis.matricula} />
                      <DetailItem label="E-mail do Autor" value={selectedAnalysis.email_usuario} />
                      <DetailItem label="Data" value={selectedAnalysis.data} />
                      <DetailItem label="Horário" value={`${selectedAnalysis.horario_inicio} - ${selectedAnalysis.horario_termino}`} />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-lime-600 uppercase tracking-wider">Localização</h3>
                    <div className="space-y-2">
                      <DetailItem label="Unidade" value={selectedAnalysis.unidade} />
                      <DetailItem label="Fazenda" value={selectedAnalysis.fazenda} />
                      <DetailItem label="Setor" value={selectedAnalysis.setor} />
                      <DetailItem label="Supervisão" value={selectedAnalysis.supervisao} />
                      <DetailItem label="Operação" value={selectedAnalysis.operacao} />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-lime-600 uppercase tracking-wider">Condições da Área</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                      <DetailItem label="11. Trajeto" value={selectedAnalysis.condicoes_trajeto} />
                      <DetailItem label="12. Carreadores" value={selectedAnalysis.condicoes_carreadores} />
                      <DetailItem label="13. Cercas" value={selectedAnalysis.condicoes_cercas} />
                      <DetailItem label="14. Placas" value={selectedAnalysis.conservacao_placas} />
                      <DetailItem label="15. Rede Elétrica" value={selectedAnalysis.rede_eletrica} />
                      <DetailItem label="16. Declive" value={selectedAnalysis.area_declive} />
                      <DetailItem label="17. Árvores" value={selectedAnalysis.arvores_talhoes} />
                      <DetailItem label="18. Canal Vinhaça" value={selectedAnalysis.canal_vinhaca} />
                      <DetailItem label="19. Canal Escoador" value={selectedAnalysis.canal_escoador} />
                      <DetailItem label="20. Pontes" value={selectedAnalysis.pontes_danificadas} />
                      <DetailItem label="21. Erosões" value={selectedAnalysis.erosoes_area} />
                      <DetailItem label="22. Pedras" value={selectedAnalysis.presenca_pedras} />
                      <DetailItem label="23. Culturas Vizinhas" value={selectedAnalysis.culturas_vizinhas} />
                      <DetailItem label="24. Sede" value={selectedAnalysis.sede_fazenda} />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-lime-600 uppercase tracking-wider">Conclusão</h3>
                    <div className="space-y-2">
                      <DetailItem label="25. Observação" value={selectedAnalysis.observacao_area} />
                      <DetailItem label="26. Patrol" value={selectedAnalysis.necessidade_patrol} />
                      <DetailItem label="Supervisor Notificado" value={selectedAnalysis.email_supervisor} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100 flex justify-end">
                  <button 
                    onClick={() => setSelectedAnalysis(null)}
                    className="px-6 py-2 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors"
                  >
                    Fechar Relatório
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewState === 'form' && (
          <>
            {/* Progress Bar */}
            <div className="mb-6 sm:mb-8">
              <div className="flex justify-between mb-2">
                {steps.map((s, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex flex-col items-center gap-1",
                      i <= step ? "text-lime-500" : "text-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all",
                      i < step ? "bg-lime-600 text-white" : 
                      i === step ? "bg-lime-950 border-2 border-lime-600" : 
                      "bg-zinc-800 border-2 border-transparent"
                    )}>
                      {i < step ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : i + 1}
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter hidden sm:block">{s.title}</span>
                  </div>
                ))}
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-lime-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">
              <div className="p-4 sm:p-8">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-lime-950 rounded-xl flex items-center justify-center border border-lime-900 shrink-0">
                    {React.createElement(steps[step].icon, { className: "w-4 h-4 sm:w-5 sm:h-5 text-lime-500" })}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-100">{steps[step].title}</h2>
                </div>

                <form onSubmit={(e) => e.preventDefault()}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderStep()}
                    </motion.div>
                  </AnimatePresence>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 bg-red-950/50 border border-red-900 rounded-2xl flex items-start gap-3"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-200">{error}</p>
                    </motion.div>
                  )}

                  <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep(s => s - 1)}
                        className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 rounded-2xl font-bold text-stone-500 bg-stone-50 hover:bg-stone-100 transition-all border border-stone-200"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        Voltar
                      </button>
                    )}
                    {step < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setStep(s => s + 1)}
                        className="w-full sm:flex-[2] flex items-center justify-center gap-2 py-3 sm:py-4 rounded-2xl font-bold text-white bg-lime-600 hover:bg-lime-700 transition-all shadow-lg shadow-lime-200"
                      >
                        Próximo
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full sm:flex-[2] flex items-center justify-center gap-2 py-3 sm:py-4 rounded-2xl font-bold text-white bg-lime-600 hover:bg-lime-700 transition-all shadow-lg shadow-lime-200 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Enviar Formulário
                            <CheckCircle2 className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <p className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs text-stone-400 font-medium px-4">
              Quando você enviar este formulário, o proprietário verá seu nome e matrícula registrados.
            </p>
          </>
        )}
      </main>

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
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-lime-950 p-3 rounded-2xl border border-lime-900">
                  <Settings className="w-6 h-6 text-lime-500" />
                </div>
                <h2 className="text-xl font-bold text-zinc-100">Configurações</h2>
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
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-2">URL do Google Sheets (Apps Script)</label>
                  <p className="text-xs text-zinc-500 mb-3">
                    Cole aqui a URL do Web App gerada pelo Google Apps Script para salvar as análises diretamente na sua planilha.
                  </p>
                  <input
                    type="url"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-lime-500 outline-none text-zinc-100 text-sm"
                  />
                </div>
                
                <button
                  onClick={() => {
                    localStorage.setItem('agro_sheets_url', sheetsUrl);
                    setShowSettings(false);
                  }}
                  className="w-full bg-lime-600 hover:bg-lime-700 text-white py-3 rounded-xl font-bold transition-colors mt-4"
                >
                  Salvar Configurações
                </button>

                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">E-mail para Teste</label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="seu-email@exemplo.com"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-lime-500 outline-none text-zinc-100 text-sm"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!sheetsUrl) {
                        setError('Configure a URL do Google Sheets primeiro!');
                        return;
                      }
                      if (!testEmail) {
                        setError('Preencha o e-mail de teste!');
                        return;
                      }
                      setLoading(true);
                      setError(null);
                      try {
                        // Simula um relatório completo para teste
                        const testPayload = {
                          data: new Date().toISOString().split('T')[0],
                          matricula: "000000",
                          nome: "USUÁRIO DE TESTE",
                          horario_inicio: "08:00",
                          horario_termino: "17:00",
                          supervisao: "TESTE DE SISTEMA",
                          operacao: "DIAGNÓSTICO DE E-MAIL",
                          setor: "999",
                          fazenda: "FAZENDA MODELO",
                          unidade: "TESTE",
                          condicoes_trajeto: "Ótima",
                          condicoes_carreadores: "Ótima",
                          condicoes_cercas: "Sim",
                          conservacao_placas: "Boa",
                          rede_eletrica: "Sim",
                          area_declive: "Não",
                          arvores_talhoes: "Não",
                          canal_vinhaca: "Não",
                          canal_escoador: "Não",
                          pontes_danificadas: "Não",
                          erosoes_area: "Não",
                          presenca_pedras: "Não",
                          culturas_vizinhas: "Não",
                          sede_fazenda: "Não",
                          observacao_area: `ESTE É UM RELATÓRIO DE TESTE COMPLETO.
--------------------------------------------------
DADOS DA ÁREA:
- Trajeto: Ótimo
- Cercas: Sim
- Rede Elétrica: Sim
- Erosões: Não
- Pedras: Não
- Necessidade Patrol: Não

Este e-mail simula como os encarregados receberão as notificações de inspeção.`,
                          necessidade_patrol: "Não",
                          email_supervisor: testEmail,
                          email_usuario: testEmail, // No final
                          timestamp: new Date().toISOString(),
                        };

                        await fetch(sheetsUrl, {
                          method: 'POST',
                          mode: 'no-cors',
                          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                          body: JSON.stringify(testPayload),
                        });
                        setShowTestSuccess(true);
                      } catch (e) {
                        setError('Erro ao enviar teste: ' + (e as Error).message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                    Enviar E-mail de Teste
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
