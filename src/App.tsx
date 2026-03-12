/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { NOMES_FUNCIONARIOS, SUPERVISAO_OPTIONS, OPERACAO_OPTIONS, UNIDADE_OPTIONS } from './constants';
import { 
  ClipboardCheck, 
  LogOut, 
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
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

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

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [viewState, setViewState] = useState<'home' | 'form' | 'list'>('home');
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('agro_analyses');
    if (saved) {
      try {
        setSavedAnalyses(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);
  
  // Código de acesso simples para todos os colaboradores
  const SHARED_CODE = "AGRO2024"; 

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.toUpperCase() === SHARED_CODE) {
      setIsAuthorized(true);
      localStorage.setItem('agro_authorized', 'true');
    } else {
      alert('Código de acesso incorreto. Verifique com seu supervisor.');
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem('agro_authorized');
    if (auth === 'true') setIsAuthorized(true);
  }, []);

  const handleLogout = () => {
    setIsAuthorized(false);
    localStorage.removeItem('agro_authorized');
    setStep(0);
  };

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    matricula: '',
    nome: '',
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
  });
  const [file, setFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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

    try {
      let fileUrl = '';
      if (file) {
        // Tenta fazer upload para o Supabase se estiver configurado, 
        // caso contrário, apenas registra o nome do arquivo
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('analise-riscos')
            .upload(fileName, file);
          
          if (!uploadError) {
            fileUrl = uploadData.path;
          }
        } catch (e) {
          console.warn('Supabase storage not configured, skipping file upload');
          fileUrl = `Arquivo: ${file.name}`;
        }
      }

      const payload = {
        ...formData,
        foto_url: fileUrl,
        timestamp: new Date().toISOString(),
      };

      const googleSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_API_URL;

      if (googleSheetsUrl) {
        // Envia para o Google Sheets (Apps Script Web App)
        const response = await fetch(googleSheetsUrl, {
          method: 'POST',
          mode: 'no-cors', // Necessário para Apps Script
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        // No mode 'no-cors', não conseguimos ler a resposta, mas se não deu erro no fetch, assumimos sucesso
        const newAnalyses = [...savedAnalyses, payload];
        setSavedAnalyses(newAnalyses);
        localStorage.setItem('agro_analyses', JSON.stringify(newAnalyses));
        setSubmitted(true);
      } else {
        // Fallback para Supabase se o Google Sheets não estiver configurado
        const { error } = await supabase
          .from('analises_risco')
          .insert([payload]);

        if (error) throw error;
        const newAnalyses = [...savedAnalyses, payload];
        setSavedAnalyses(newAnalyses);
        localStorage.setItem('agro_analyses', JSON.stringify(newAnalyses));
        setSubmitted(true);
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      
      let errorMessage = 'Erro ao enviar formulário. Verifique sua conexão e tente novamente.';
      
      if (error.message?.includes('row-level security policy')) {
        errorMessage = 'Erro de Permissão (RLS): O banco de dados está bloqueando o envio. Por favor, execute o comando SQL de permissão no painel do Supabase.';
      } else if (error.message?.includes('Bucket not found')) {
        errorMessage = 'Erro de Armazenamento: O bucket "analise-riscos" não foi encontrado no Supabase.';
      }

      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (showSplash) return <SplashScreen />;

  if (!isAuthorized) {
    const isConfigMissing = (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co') && !import.meta.env.VITE_GOOGLE_SHEETS_API_URL;

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-zinc-800"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-lime-950 rounded-2xl flex items-center justify-center border border-lime-900">
              <CustomLogo className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-zinc-100 mb-2">Análise de Riscos</h1>
          <p className="text-zinc-400 text-center mb-8">Produção Agrícola - Acesso Colaborador</p>
          
          {isConfigMissing && (
            <div className="mb-6 p-4 bg-amber-950 border border-amber-900 rounded-2xl text-amber-200 text-sm">
              <p className="font-bold mb-1">Configuração Pendente:</p>
              O administrador precisa configurar o banco de dados.
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Código de Acesso</label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Digite o código"
                className="w-full p-3 sm:p-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-lime-500 outline-none transition-all text-center font-bold tracking-widest text-zinc-100"
                required
              />
            </div>
            <button
              type="button"
              onClick={handleAccess}
              disabled={isConfigMissing}
              className="w-full flex items-center justify-center gap-3 bg-lime-600 hover:bg-lime-700 text-white transition-all py-3 sm:py-4 rounded-2xl font-bold shadow-lg shadow-lime-950 disabled:opacity-50"
            >
              Entrar no Aplicativo
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
          
          <p className="mt-6 text-[10px] text-center text-zinc-600 uppercase font-bold tracking-widest">
            Segurança em Primeiro Lugar
          </p>
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
    { title: "Finalização", icon: Camera },
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
            <div className="grid grid-cols-2 gap-4">
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
                {SUPERVISAO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
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
            <div>
              <label className="block text-sm font-semibold text-stone-500 mb-2">27. Foto ou arquivo</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,application/pdf"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-stone-300 rounded-2xl cursor-pointer hover:bg-stone-50 transition-all"
                >
                  <Camera className="w-8 h-8 text-stone-400 mb-2" />
                  <span className="text-sm text-stone-500">
                    {file ? file.name : "Clique para carregar arquivo"}
                  </span>
                </label>
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
            onClick={exportToExcel}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-lime-500"
            title="Exportar Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        {viewState === 'home' && (
          <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 p-6 sm:p-8 flex flex-col items-center justify-center text-center mt-4 sm:mt-10">
            <CustomLogo className="w-20 h-20 mb-6" />
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Bem-vindo à Gestão de Risco</h2>
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

        {viewState === 'list' && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">Análises Anteriores</h2>
            </div>
            
            {savedAnalyses.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-8 text-center">
                <p className="text-stone-500">Nenhuma análise registrada ainda.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {savedAnalyses.map((analysis, idx) => (
                  <div key={idx} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-stone-900">{analysis.nome || 'Sem nome'}</h3>
                      <p className="text-sm text-stone-500">Data: {analysis.data} | Matrícula: {analysis.matricula}</p>
                    </div>
                    <div className="text-xs font-bold px-3 py-1 bg-lime-100 text-lime-700 rounded-full w-fit">
                      Concluída
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
    </div>
  );
}
