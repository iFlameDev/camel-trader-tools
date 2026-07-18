import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import type { DiscCategory, Question, DiscResult, DiscScore } from '../types/disc';
import { Brain, Check, X, ShieldAlert, Award, Save, RefreshCw, ChevronLeft, ChevronRight, Play } from 'lucide-react';

const QUESTIONS_PER_PAGE = 6;

import { QUESTIONS } from '../data/discQuestions';

interface UserAnswer {
  most: string | null;  // Choice ID
  least: string | null; // Choice ID
}

export const DiscPage: React.FC = () => {
  // Navigation State
  const [currentPage, setCurrentPage] = useState(1);
  const [showResults, setShowResults] = useState(false);
  
  // Answers State
  const [answers, setAnswers] = useState<Record<number, UserAnswer>>(() => {
    const initial: Record<number, UserAnswer> = {};
    QUESTIONS.forEach(q => {
      initial[q.id] = { most: null, least: null };
    });
    return initial;
  });

  // Validation / Error States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Database Save States
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [authStatus, setAuthStatus] = useState<{ loggedIn: boolean; email?: string }>({ loggedIn: false });

  // Calculated Results State
  const [calculatedResults, setCalculatedResults] = useState<DiscResult | null>(null);

  // Check auth user on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthStatus({ loggedIn: true, email: user.email });
        } else {
          setAuthStatus({ loggedIn: false });
        }
      } catch (err) {
        console.error('Failed to get auth status:', err);
      }
    };
    checkAuth();
  }, []);

  // Selection Handler (ensures MOST and LEAST cannot be the same choice)
  const handleSelect = (questionId: number, choiceId: string, type: 'most' | 'least') => {
    setErrorMsg(null);
    setAnswers(prev => {
      const current = prev[questionId];
      const updated = { ...current };

      if (type === 'most') {
        updated.most = choiceId;
        if (updated.least === choiceId) {
          updated.least = null; // Auto-clear conflicting selection
        }
      } else {
        updated.least = choiceId;
        if (updated.most === choiceId) {
          updated.most = null; // Auto-clear conflicting selection
        }
      }

      return {
        ...prev,
        [questionId]: updated
      };
    });
  };

  // Check if a question is fully answered
  const isQuestionComplete = (questionId: number) => {
    const ans = answers[questionId];
    return ans.most !== null && ans.least !== null;
  };

  // Get total answered questions count
  const completedCount = Object.values(answers).filter(ans => ans.most && ans.least).length;
  const completionPercentage = Math.round((completedCount / QUESTIONS.length) * 100);

  // Quick Simulation Handler
  const handleSimulateAll = () => {
    setErrorMsg(null);
    const simulated: Record<number, UserAnswer> = {};
    QUESTIONS.forEach(q => {
      const idxMost = Math.floor(Math.random() * 4);
      let idxLeast = Math.floor(Math.random() * 4);
      while (idxLeast === idxMost) {
        idxLeast = Math.floor(Math.random() * 4);
      }
      simulated[q.id] = {
        most: q.choices[idxMost].id,
        least: q.choices[idxLeast].id,
      };
    });
    setAnswers(simulated);
    // Go to first page or stay where they are
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find all incomplete questions
    const incompleteIds: number[] = [];
    QUESTIONS.forEach(q => {
      if (!isQuestionComplete(q.id)) {
        incompleteIds.push(q.id);
      }
    });

    if (incompleteIds.length > 0) {
      setErrorMsg(`Mohon selesaikan semua pertanyaan sebelum mengirimkan. Soal belum lengkap: ${incompleteIds.slice(0, 5).join(', ')}${incompleteIds.length > 5 ? '...' : ''}`);
      
      // Auto-navigate to the page containing the first incomplete question
      const firstIncompleteId = incompleteIds[0];
      const targetPage = Math.ceil(firstIncompleteId / QUESTIONS_PER_PAGE);
      setCurrentPage(targetPage);
      
      // Scroll to top of list
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Perform calculations
    const most: DiscScore = { D: 0, I: 0, S: 0, C: 0 };
    const least: DiscScore = { D: 0, I: 0, S: 0, C: 0 };

    QUESTIONS.forEach(q => {
      const ans = answers[q.id];
      const mostChoice = q.choices.find(c => c.id === ans.most);
      const leastChoice = q.choices.find(c => c.id === ans.least);

      if (mostChoice) most[mostChoice.indicator]++;
      if (leastChoice) least[leastChoice.indicator]++;
    });

    const diff: DiscScore = {
      D: most.D - least.D,
      I: most.I - least.I,
      S: most.S - least.S,
      C: most.C - least.C,
    };

    setCalculatedResults({ most, least, diff });
    setShowResults(true);
    setErrorMsg(null);
    setSaveStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save to Database handler
  const handleSaveToDatabase = async () => {
    if (!calculatedResults) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      // Get current authenticated user
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      
      // Ignore session missing errors to allow fallback simulation mode
      if (authErr && authErr.message !== 'Auth session missing!' && authErr.name !== 'AuthSessionMissingError') {
        throw authErr;
      }

      // Real Supabase insertion
      const { error: dbError } = await supabase
        .from('disc_results')
        .insert({
          user_id: user ? user.id : null,
          most_d: calculatedResults.most.D,
          most_i: calculatedResults.most.I,
          most_s: calculatedResults.most.S,
          most_c: calculatedResults.most.C,
          least_d: calculatedResults.least.D,
          least_i: calculatedResults.least.I,
          least_s: calculatedResults.least.S,
          least_c: calculatedResults.least.C,
          diff_d: calculatedResults.diff.D,
          diff_i: calculatedResults.diff.I,
          diff_s: calculatedResults.diff.S,
          diff_c: calculatedResults.diff.C,
        });

      if (dbError) throw dbError;

      setSaveStatus({
        success: true,
        message: 'Hasil DISC kepribadian Anda telah berhasil disimpan ke database Supabase!'
      });
    } catch (err: any) {
      console.error('Error saving result:', err);
      setSaveStatus({
        success: false,
        message: err?.message || 'Gagal menyimpan ke database Supabase.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset Test Handler
  const handleReset = () => {
    const initial: Record<number, UserAnswer> = {};
    QUESTIONS.forEach(q => {
      initial[q.id] = { most: null, least: null };
    });
    setAnswers(initial);
    setCalculatedResults(null);
    setShowResults(false);
    setCurrentPage(1);
    setErrorMsg(null);
    setSaveStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Slice questions for current page
  const pageQuestions = QUESTIONS.slice(
    (currentPage - 1) * QUESTIONS_PER_PAGE,
    currentPage * QUESTIONS_PER_PAGE
  );

  const totalPages = Math.ceil(QUESTIONS.length / QUESTIONS_PER_PAGE);

  // Color mappings for D-I-S-C
  const colors = {
    D: { bg: 'bg-loss', border: 'border-loss/30', text: 'text-loss', fill: '#ef4444' },
    I: { bg: 'bg-accent-500', border: 'border-accent-500/30', text: 'text-accent-400', fill: '#f59e0b' },
    S: { bg: 'bg-profit', border: 'border-profit/30', text: 'text-profit-light', fill: '#10b981' },
    C: { bg: 'bg-brand-500', border: 'border-brand-500/30', text: 'text-brand-400', fill: '#3b82f6' }
  };

  // Get primary personality description based on highest DIFF score
  const getPrimaryPersonality = (diff: DiscScore) => {
    const entries = Object.entries(diff) as [DiscCategory, number][];
    entries.sort((a, b) => b[1] - a[1]);
    const topType = entries[0][0];

    const profiles = {
      D: {
        title: 'Dominance (D) - Sang Pemimpin / Eksekutor',
        description: 'Anda memiliki profil Dominan yang tinggi. Anda cenderung asertif, berorientasi pada hasil, cepat mengambil keputusan, dan berani menghadapi tantangan.',
        tradingStyle: 'Dalam trading, Anda sangat tegas dalam mengeksekusi rencana. Namun, Anda rentan terhadap "overtrading" karena ambisi Anda untuk menguasai pasar, serta dapat mengambil risiko yang terlampau besar akibat kepercayaan diri yang berlebih. Disiplin posisi size adalah kunci sukses Anda.'
      },
      I: {
        title: 'Influence (I) - Sang Komunikator / Promotor',
        description: 'Anda memiliki profil Influence yang tinggi. Anda sangat antusias, optimis, senang berinteraksi, persuasif, dan penuh energi positif.',
        tradingStyle: 'Dalam trading, optimisme Anda yang tinggi adalah aset besar dalam bangkit dari kerugian. Namun, Anda rentan terkena bias FOMO (Fear of Missing Out) karena mudah terpengaruh oleh opini publik atau tren sosial media. Selalu andalkan analisis teknikal objektif daripada sentimen kelompok.'
      },
      S: {
        title: 'Steadiness (S) - Sang Penyabar / Stabilizer',
        description: 'Anda memiliki profil Steadiness yang tinggi. Anda tenang, sabar, loyal, konsisten, dan sangat menghargai stabilitas.',
        tradingStyle: 'Dalam trading, Anda cenderung sabar menanti setup yang tepat dan sangat patuh pada aturan manajemen risiko. Kelemahan Anda adalah keraguan ("hesitancy") untuk menarik pelatuk entry saat market berubah dengan cepat, serta sulit memotong kerugian dengan segera karena mengharapkan pembalikan arah. Latihlah fleksibilitas mental Anda.'
      },
      C: {
        title: 'Conscientiousness (C) - Sang Analitis / Pemikir',
        description: 'Anda memiliki profil Conscientiousness yang tinggi. Anda sangat analitis, logis, teliti, disiplin, dan berpegang teguh pada data.',
        tradingStyle: 'Dalam trading, Anda adalah peneliti yang luar biasa. Rencana trading Anda sangat detail dan teruji. Namun, Anda rentan terhadap "Analysis Paralysis" (terlalu banyak analisis hingga takut mengambil posisi). Ingatlah bahwa trading adalah probabilitas; tidak ada sistem yang 100% sempurna.'
      }
    };

    return profiles[topType];
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      
      {/* Intro Header Card */}
      {!showResults && (
        <Card gradient className="overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
                <Brain size={14} />
                Psychology Profile
              </div>
              <h1 className="text-2xl font-bold text-surface-100 tracking-tight">Kalkulator Profil DISC</h1>
              <p className="text-sm text-surface-400 max-w-2xl">
                Kenali kecenderungan psikologi kepribadian Anda dalam mengambil keputusan trading. Tes ini memetakan kepribadian Anda ke dalam 4 dimensi utama: <strong>Dominance (D)</strong>, <strong>Influence (I)</strong>, <strong>Steadiness (S)</strong>, dan <strong>Conscientiousness (C)</strong>.
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <Button 
                variant="secondary" 
                onClick={handleSimulateAll}
                icon={<Play size={16} />}
                size="sm"
              >
                Auto-fill Test (Dev)
              </Button>
            </div>
          </div>

          {/* Guidelines */}
          <div className="mt-6 pt-6 border-t border-surface-700/50 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-surface-400">
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">1</div>
              <div>
                <p className="font-semibold text-surface-200">Cara Pengisian</p>
                <p className="mt-0.5">Pilih 1 pernyataan <strong>Paling Sesuai (MOST)</strong> dan 1 pernyataan <strong>Paling Tidak Sesuai (LEAST)</strong> pada setiap nomor.</p>
              </div>
            </div>
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">2</div>
              <div>
                <p className="font-semibold text-surface-200">Bebas Konflik</p>
                <p className="mt-0.5">Satu baris pernyataan tidak boleh dipilih sebagai MOST sekaligus LEAST. Sistem akan otomatis membatalkan pilihan sebelumnya jika bentrok.</p>
              </div>
            </div>
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">3</div>
              <div>
                <p className="font-semibold text-surface-200">Analisis Trader</p>
                <p className="mt-0.5">Setelah selesai, profil psikologi trading Anda akan dianalisis secara lengkap beserta 3 bar chart komparatif.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Container */}
      {!showResults ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold tracking-wider text-surface-400 uppercase">
              <span>Progres Pengisian</span>
              <span>{completedCount} / {QUESTIONS.length} Soal Selesai ({completionPercentage}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden border border-surface-700/40">
              <div 
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Validation Warning Alert */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-loss/10 border border-loss/20 text-loss flex gap-3 items-center animate-slide-up">
              <ShieldAlert className="shrink-0" size={18} />
              <p className="text-xs font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Questions Grid List */}
          <div className="space-y-5">
            {pageQuestions.map((q) => (
              <Card key={q.id} className="relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-[4px] h-full bg-surface-700 group-hover:bg-brand-500 transition-colors" />
                
                <div className="flex justify-between items-center mb-4 border-b border-surface-700/30 pb-3">
                  <span className="text-sm font-bold text-brand-400 uppercase tracking-wider">
                    Nomor Soal {q.id}
                  </span>
                  {isQuestionComplete(q.id) ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-profit/15 text-profit text-[10px] font-semibold">
                      <Check size={12} /> Lengkap
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-700 text-surface-400 text-[10px] font-semibold">
                      Belum Lengkap
                    </span>
                  )}
                </div>

                {/* Question layout: Most | Statement | Least */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-700/50">
                        <th className="py-2 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-20">MOST</th>
                        <th className="py-2 px-4 text-xs font-bold text-surface-400 uppercase tracking-wider">PERNYATAAN</th>
                        <th className="py-2 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-20">LEAST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800/50">
                      {q.choices.map((choice) => {
                        const isMost = answers[q.id].most === choice.id;
                        const isLeast = answers[q.id].least === choice.id;

                        return (
                          <tr 
                            key={choice.id} 
                            className={`transition-colors hover:bg-surface-800/20 ${
                              isMost ? 'bg-brand-500/5' : isLeast ? 'bg-loss/5' : ''
                            }`}
                          >
                            {/* MOST Column */}
                            <td className="py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelect(q.id, choice.id, 'most')}
                                className={`inline-flex w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                                  isMost
                                    ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20'
                                    : 'border-surface-600 hover:border-brand-400 bg-surface-800'
                                }`}
                                title="Pilih sebagai Paling Sesuai"
                              >
                                {isMost && <Check size={12} strokeWidth={3} />}
                              </button>
                            </td>

                            {/* Statement Column */}
                            <td className="py-3 px-4">
                              <span className={`text-sm ${isMost ? 'text-brand-300 font-medium' : isLeast ? 'text-loss-light/80' : 'text-surface-200'}`}>
                                {choice.text}
                              </span>
                            </td>

                            {/* LEAST Column */}
                            <td className="py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelect(q.id, choice.id, 'least')}
                                className={`inline-flex w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                                  isLeast
                                    ? 'bg-loss border-loss text-white shadow-lg shadow-loss/20'
                                    : 'border-surface-600 hover:border-loss-light bg-surface-800'
                                }`}
                                title="Pilih sebagai Paling Tidak Sesuai"
                              >
                                {isLeast && <X size={12} strokeWidth={3} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination & Actions Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-surface-700/50">
            {/* Page info */}
            <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
              Halaman {currentPage} dari {totalPages}
            </div>

            {/* Pagination Controls */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                icon={<ChevronLeft size={16} />}
              >
                Kembali
              </Button>

              {currentPage < totalPages ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  icon={<ChevronRight size={16} />}
                >
                  Selanjutnya
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  icon={<Award size={16} />}
                >
                  Kalkulasi Hasil DISC
                </Button>
              )}
            </div>
          </div>

        </form>
      ) : (
        /* Results Section */
        <div className="space-y-8 animate-slide-up">
          {calculatedResults && (
            <>
              {/* Primary Profile Card */}
              <Card gradient padding="lg" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-accent-500/5 rounded-full blur-2xl -z-10" />

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
                    <Award size={24} />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-widest">Kepribadian Dominan Anda</h2>
                    <h1 className="text-xl font-bold text-surface-100 mt-0.5">
                      {getPrimaryPersonality(calculatedResults.diff).title}
                    </h1>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider mb-1">Deskripsi Profil</h4>
                    <p className="text-sm text-surface-400 leading-relaxed">
                      {getPrimaryPersonality(calculatedResults.diff).description}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-surface-900 border border-surface-700/50">
                    <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Brain size={14} />
                      Dampak Terhadap Trading Style Anda:
                    </h4>
                    <p className="text-sm text-surface-300 leading-relaxed">
                      {getPrimaryPersonality(calculatedResults.diff).tradingStyle}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Native Bar Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* MOST CHART (Values 0 - 24) */}
                <Card className="flex flex-col">
                  <h3 className="text-sm font-bold text-surface-200 mb-2 tracking-wide text-center uppercase">
                    Grafik I: MOST (Paling Sesuai)
                  </h3>
                  <p className="text-[10px] text-surface-400 text-center mb-6">
                    Mencerminkan respon sadar diri/publik yang ditunjukkan di lingkungan.
                  </p>

                  <div className="flex-1 flex justify-around items-end h-64 px-4 pb-4 pt-8 border-b border-surface-700/50">
                    {(Object.keys(calculatedResults.most) as DiscCategory[]).map((category) => {
                      const score = calculatedResults.most[category];
                      const heightPct = Math.round((score / 24) * 100);
                      const config = colors[category];

                      return (
                        <div key={category} className="flex flex-col items-center gap-2 group w-12">
                          <div className="relative w-full h-44 flex items-end justify-center">
                            {/* Hover tooltip */}
                            <div className="absolute -top-6 bg-surface-700 border border-surface-600 px-1.5 py-0.5 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Nilai: {score}
                            </div>
                            {/* Bar */}
                            <div
                              className={`w-8 rounded-t-lg ${config.bg} transition-all duration-700 ease-out`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${config.text}`}>{category} ({score})</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-between items-center px-4 py-3 text-[10px] text-surface-500 uppercase tracking-widest font-semibold bg-surface-900/50 rounded-b-xl shrink-0">
                    <span>Skala 0 - 24</span>
                    <span>Most Total: {Object.values(calculatedResults.most).reduce((a, b) => a + b, 0)}</span>
                  </div>
                </Card>

                {/* LEAST CHART (Values 0 - 24) */}
                <Card className="flex flex-col">
                  <h3 className="text-sm font-bold text-surface-200 mb-2 tracking-wide text-center uppercase">
                    Grafik II: LEAST (Tidak Sesuai)
                  </h3>
                  <p className="text-[10px] text-surface-400 text-center mb-6">
                    Mencerminkan respon instingtif diri di bawah tekanan/keadaan terdesak.
                  </p>

                  <div className="flex-1 flex justify-around items-end h-64 px-4 pb-4 pt-8 border-b border-surface-700/50">
                    {(Object.keys(calculatedResults.least) as DiscCategory[]).map((category) => {
                      const score = calculatedResults.least[category];
                      const heightPct = Math.round((score / 24) * 100);
                      const config = colors[category];

                      return (
                        <div key={category} className="flex flex-col items-center gap-2 group w-12">
                          <div className="relative w-full h-44 flex items-end justify-center">
                            {/* Hover tooltip */}
                            <div className="absolute -top-6 bg-surface-700 border border-surface-600 px-1.5 py-0.5 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Nilai: {score}
                            </div>
                            {/* Bar */}
                            <div
                              className={`w-8 rounded-t-lg ${config.bg} transition-all duration-700 ease-out`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${config.text}`}>{category} ({score})</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center px-4 py-3 text-[10px] text-surface-500 uppercase tracking-widest font-semibold bg-surface-900/50 rounded-b-xl shrink-0">
                    <span>Skala 0 - 24</span>
                    <span>Least Total: {Object.values(calculatedResults.least).reduce((a, b) => a + b, 0)}</span>
                  </div>
                </Card>

                {/* DIFFERENCE CHART (Values -24 to +24) */}
                <Card className="flex flex-col">
                  <h3 className="text-sm font-bold text-surface-200 mb-2 tracking-wide text-center uppercase">
                    Grafik III: DIFFERENCE (Selisih)
                  </h3>
                  <p className="text-[10px] text-surface-400 text-center mb-6">
                    Menunjukkan kepribadian asli/bawaan asli Anda yang paling akurat.
                  </p>

                  <div className="flex-1 flex justify-around items-stretch h-64 px-4 pb-4 pt-4 border-b border-surface-700/50">
                    {(Object.keys(calculatedResults.diff) as DiscCategory[]).map((category) => {
                      const score = calculatedResults.diff[category];
                      const barHeightPct = Math.round((Math.abs(score) / 24) * 100);
                      const config = colors[category];

                      return (
                        <div key={category} className="flex flex-col items-center group w-12">
                          <div className="flex-1 w-full flex flex-col justify-center items-center relative py-2">
                            
                            {/* Top half (for positive values) */}
                            <div className="h-1/2 w-full flex flex-col justify-end items-center pb-[1px]">
                              {score > 0 && (
                                <div
                                  className={`w-8 rounded-t-md ${config.bg} transition-all duration-700 ease-out origin-bottom`}
                                  style={{ height: `${barHeightPct}%` }}
                                />
                              )}
                            </div>
                            
                            {/* Zero line */}
                            <div className="w-full h-[2px] bg-surface-600 shrink-0 relative">
                              <span className="absolute -right-2 -top-1.5 text-[8px] font-semibold text-surface-500">0</span>
                            </div>
                            
                            {/* Bottom half (for negative values) */}
                            <div className="h-1/2 w-full flex flex-col justify-start items-center pt-[1px]">
                              {score < 0 && (
                                <div
                                  className={`w-8 rounded-b-md ${config.bg} transition-all duration-700 ease-out origin-top`}
                                  style={{ height: `${barHeightPct}%` }}
                                />
                              )}
                            </div>

                            {/* Hover tooltip for accurate value */}
                            <div className="absolute top-0 bg-surface-700 border border-surface-600 px-1.5 py-0.5 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              Selisih: {score > 0 ? `+${score}` : score}
                            </div>
                          </div>
                          
                          <span className={`text-xs font-bold mt-2 ${config.text}`}>
                            {category} ({score > 0 ? `+${score}` : score})
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center px-4 py-3 text-[10px] text-surface-500 uppercase tracking-widest font-semibold bg-surface-900/50 rounded-b-xl shrink-0">
                    <span>Skala -24 s/d +24</span>
                    <span>Selisih Asli (M - L)</span>
                  </div>
                </Card>

              </div>

              {/* Status Alert Banner */}
              {saveStatus && (
                <div className={`p-4 rounded-xl flex gap-3 items-center border animate-slide-up ${
                  saveStatus.success 
                    ? 'bg-profit/10 border-profit/20 text-profit' 
                    : 'bg-loss/10 border-loss/20 text-loss'
                }`}>
                  {saveStatus.success ? <Check size={18} /> : <ShieldAlert size={18} />}
                  <p className="text-xs font-medium">{saveStatus.message}</p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-surface-700/50">
                <div className="text-xs text-surface-400">
                  {authStatus.loggedIn ? (
                    <span className="text-profit-light font-medium">✓ Login sebagai: {authStatus.email}</span>
                  ) : (
                    <span className="text-accent-400 font-medium">⚠️ Menjalankan mode demo (Penyimpanan akan disimulasikan).</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleReset}
                    icon={<RefreshCw size={16} />}
                  >
                    Ulangi Tes
                  </Button>
                  
                  <Button
                    type="button"
                    variant="primary"
                    loading={saving}
                    onClick={handleSaveToDatabase}
                    icon={<Save size={16} />}
                  >
                    Simpan ke Database
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
};
