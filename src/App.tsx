import React, { useState, useEffect } from 'react';
import { api, WorkbookPayload } from './api';
import { DbState, Dizimista, UserRole, Movimentacao, Usuario } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Dizimistas from './components/Dizimistas';
import MesesTab from './components/MesesTab';
import GeralTab from './components/GeralTab';
import PresbiterioTab from './components/PresbiterioTab';
import ConfiguracaoTab from './components/ConfiguracaoTab';
import LoginScreen from './components/LoginScreen';
import ControleAcessos from './components/ControleAcessos';
import { ShieldAlert, RefreshCw, LogOut, KeyRound, CheckCircle2, EyeOff } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem("ipa_treasury_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedChurchId, setSelectedChurchId] = useState<string>("ipb-alianca");

  const [dbState, setDbState] = useState<DbState | null>(null);
  const [workbook, setWorkbook] = useState<WorkbookPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [initialMonthIndex, setInitialMonthIndex] = useState<number>(5); // default monthly view month: Junho

  // Fetch dbState and Compiled spreadsheet workbook
  const loadFinanceData = async (targetChurchId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Determine active church context
      let cid = targetChurchId || selectedChurchId;
      if (currentUser && currentUser.perfil === 'tesoureiro') {
        cid = currentUser.igrejaId || "ipb-alianca";
      }

      api.setChurchId(cid);

      // Fetch base database state
      const state = await api.getDbState();
      setDbState(state);

      // Sync newest authorization permissions from database
      if (currentUser) {
        const syncedUser = state.usuarios?.find(u => u.id === currentUser.id);
        if (syncedUser) {
          setCurrentUser(syncedUser);
          localStorage.setItem("ipa_treasury_user", JSON.stringify(syncedUser));
        }
      }

      // Fetch computed workbook (sums and balances) representing this church's treasury
      const bbook = await api.getWorkbook();
      setWorkbook(bbook);

      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Erro de conexão e sincronização financeira.");
    } finally {
      setLoading(false);
    }
  };

  // Run on mount, or whenever user changes
  useEffect(() => {
    if (currentUser) {
      const activeCid = currentUser.perfil === 'tesoureiro' 
        ? (currentUser.igrejaId || "ipb-alianca") 
        : selectedChurchId;
      setSelectedChurchId(activeCid);
      loadFinanceData(activeCid);
    } else {
      // Load once even if not logged in, to feed available churches listing to registration form
      api.getDbState().then(state => {
        setDbState(state);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [currentUser?.id]);

  const handleLoginSuccess = (user: Usuario) => {
    setCurrentUser(user);
    localStorage.setItem("ipa_treasury_user", JSON.stringify(user));
    setActiveTab("dashboard");
    
    const initialCid = user.perfil === 'tesoureiro' 
      ? (user.igrejaId || "ipb-alianca") 
      : "ipb-alianca";
    setSelectedChurchId(initialCid);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("ipa_treasury_user");
    setWorkbook(null);
  };

  const handleChurchChange = async (newChurchId: string) => {
    setSelectedChurchId(newChurchId);
    await loadFinanceData(newChurchId);
  };

  // DIZIMISTAS ACTIONS
  const handleUpdateDizimista = async (id: string, update: Partial<Dizimista>) => {
    try {
      await api.updateDizimista(id, update);
      await loadFinanceData(); // re-compile workbook and update
    } catch (err) {
      alert("Falha ao salvar dízimo do membro.");
    }
  };

  const handleCreateDizimista = async (nome: string, numero?: number) => {
    try {
      await api.createDizimista({ nome, numero });
      await loadFinanceData();
    } catch (err) {
      alert("Falha ao criar ficha de dizimista.");
    }
  };

  const handleDeleteDizimista = async (id: string) => {
    try {
      await api.deleteDizimista(id);
      await loadFinanceData();
    } catch (err) {
      alert("Falha ao remover dizimista.");
    }
  };

  // MOVIMENTACOES ACTIONS
  const handleAddMovimentacao = async (mov: Partial<Movimentacao>) => {
    try {
      await api.createMovimentacao(mov);
      await loadFinanceData();
    } catch (err) {
      alert("Falha ao registrar movimentação financeira.");
    }
  };

  const handleDeleteMovimentacao = async (id: string) => {
    try {
      await api.deleteMovimentacao(id);
      await loadFinanceData();
    } catch (err) {
      alert("Falha ao excluir lançamento.");
    }
  };

  // IGREJA IDENTITY & CONFIGURATION SAVE
  const handleSaveConfig = async (payload: { igreja?: any; configuracoes?: any }) => {
    await api.saveIgrejaConfig(payload);
    await loadFinanceData();
  };

  const handleUpdateUserSignature = async (userId: string, signatureImg: string) => {
    try {
      const user = dbState?.usuarios?.find((u: any) => u.id === userId);
      if (!user) return;
      const res = await api.updateUser(
        userId,
        user.nome,
        user.login,
        user.perfil,
        user.igrejaId || "",
        signatureImg
      );
      if (res.success) {
        if (currentUser && currentUser.id === userId) {
          const updatedUser = { ...currentUser, assinaturaImg: signatureImg };
          setCurrentUser(updatedUser);
          localStorage.setItem("ipa_treasury_user", JSON.stringify(updatedUser));
        }
        await loadFinanceData();
      }
    } catch (err) {
      console.error("Erro ao atualizar assinatura do usuário:", err);
      alert("Falha ao salvar assinatura individual do tesoureiro.");
    }
  };

  // Helper for dashboard navigation clicks
  const handleNavigateToMonth = (monthIndex: number) => {
    setInitialMonthIndex(monthIndex);
    setActiveTab('meses');
  };

  // Compile active user role used for locking inputs (consultant is read-only)
  const resolvedRole: UserRole = currentUser?.perfil || 'consulta';

  // --- RENDERING PATHS ---

  // 1. NOT LOGGED IN
  if (!currentUser) {
    return (
      <LoginScreen 
        localChurches={dbState?.igrejasLocais || []} 
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  // 2. ACCOUNT BLOCKED / PENDING APPROVAL
  if (currentUser.autorizado === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
        
        {/* Decorative Blur Orbs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-6 relative z-10">
          <div className="mx-auto h-14 w-14 bg-red-500/10 border border-red-500/30 flex items-center justify-center rounded-2xl shadow-lg animate-pulse">
            <ShieldAlert className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Acesso Aguardando Liberação</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Olá, <strong>{currentUser.nome}</strong>. Sua solicitação de perfil para <span className="text-blue-400 font-bold">{currentUser.perfil === 'tesoureiro' ? 'Tesoureiro Local' : 'Consultor'}</span> foi submetida com sucesso ao sistema.
            </p>
          </div>

          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/60 text-left text-xs text-slate-400 space-y-2 leading-relaxed">
            <p><strong>🔒 Regra de Validação Coletiva:</strong></p>
            <p>Por motivos de segurança e integridade, novas credenciais eclesiásticas de tesouraria requerem liberação manual por parte do <strong>Pr. Douglas de Paula (Administrador Geral / Tesoureiro do Presbitério)</strong>.</p>
            <p>Por favor, contate a mesa diretora do Presbiteriado para confirmar seu provimento.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => loadFinanceData()}
              className="w-1/2 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recarregar Status
            </button>
            <button
              onClick={handleLogout}
              className="w-1/2 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine authorized churches list for active session user
  const isConsultant = currentUser.perfil === 'consulta';
  const authorizedChurches = isConsultant && dbState?.igrejasLocais
    ? dbState.igrejasLocais.filter(ch => currentUser.autorizacaoConsultas?.[ch.id] === true)
    : [];

  // 3. CONSULTANT NO CHURCHES AUTHORIZED
  if (isConsultant && authorizedChurches.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="absolute top-10 left-10 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-6 relative z-10">
          <div className="mx-auto h-14 w-14 bg-pink-500/10 border border-pink-500/30 flex items-center justify-center rounded-2xl shadow-lg">
            <EyeOff className="h-8 w-8 text-pink-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Consultor Sem Pastas Ativas</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Olá, <strong>{currentUser.nome}</strong>. Sua conta de Consultor de Visualização está ativa, porém você ainda não possui permissão para auditar nenhuma congregação.
            </p>
          </div>

          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/60 text-left text-xs text-slate-400 space-y-2 leading-relaxed font-sans">
            <p><strong>💡 Liberação de Leitura de Contas:</strong></p>
            <p>Conforme suas instruções estabelecidas, consultores dependem de uma liberação prévia dada diretamente pelos tesoureiros das respectivas congregações locais ou pelo Tesoureiro Geral.</p>
            <p>Solicite ao tesoureiro de sua igreja local para marcá-lo como autorizado de consulta em seu painel local.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => loadFinanceData()}
              className="w-1/2 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recarregar Status
            </button>
            <button
              onClick={handleLogout}
              className="w-1/2 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              Desconectar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback if consultant just entered with some churches. Make sure we auto-select one authorized church context
  if (isConsultant && !currentUser.autorizacaoConsultas?.[selectedChurchId]) {
    const firstAllowed = authorizedChurches[0]?.id;
    if (firstAllowed && selectedChurchId !== firstAllowed) {
      setSelectedChurchId(firstAllowed);
      loadFinanceData(firstAllowed);
    }
  }

  // 4. MAIN VALIDATED WORKSPACE RENDERER
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Upper Navigation Header bar */}
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        churchName={dbState?.igreja.nome || "Tesouraria Igreja Presbiteriana"}
        availableChurches={dbState?.igrejasLocais || []}
        activeChurchId={selectedChurchId}
        onChurchChange={handleChurchChange}
      />

      {/* Main Workspace Frame */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
        
        {loading && !dbState ? (
          <div className="flex flex-col justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-slate-500 font-medium font-mono text-sm">Sincronizando tesouraria relacional com o servidor...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl text-center max-w-md mx-auto space-y-3 shadow-sm mt-12">
            <span className="font-bold block text-lg">Erro de Sincronização</span>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => loadFinanceData()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold py-2 px-4 transition-all cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            
            {/* Active Tab Screen dispatching */}
            {activeTab === 'dashboard' && (
              <Dashboard 
                workbook={workbook} 
                dbState={dbState}
                onNavigateToMonth={handleNavigateToMonth} 
                onAddMovimentacao={handleAddMovimentacao}
                onSaveFullDB={async (state) => {
                  await api.saveFullDb(state);
                  await loadFinanceData();
                }}
                userRole={resolvedRole}
              />
            )}

            {activeTab === 'dizimistas' && (
              <Dizimistas 
                dizimistas={dbState?.dizimistas || []}
                igreja={dbState?.igreja}
                movimentacoes={dbState?.movimentacoes || []}
                userRole={resolvedRole}
                onUpdateDizimista={handleUpdateDizimista}
                onCreateDizimista={handleCreateDizimista}
                onDeleteDizimista={handleDeleteDizimista}
                onRefresh={() => loadFinanceData()}
                dbState={dbState}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'meses' && (
              <MesesTab 
                compiledMonths={workbook?.meses || []}
                movimentacoes={dbState?.movimentacoes || []}
                userRole={resolvedRole}
                onAddMovimentacao={handleAddMovimentacao}
                onDeleteMovimentacao={handleDeleteMovimentacao}
                initialMonthIndex={initialMonthIndex}
                dbState={dbState}
                workbook={workbook}
                onSaveConfig={handleSaveConfig}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'geral' && (
              <GeralTab 
                workbook={workbook} 
                dbState={dbState}
                onSaveConfig={handleSaveConfig}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'presbiterio' && (
              <PresbiterioTab 
                workbook={workbook} 
                dbState={dbState}
                onSaveConfig={handleSaveConfig}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'acessos' && (
              <ControleAcessos
                currentUser={currentUser}
                dbState={dbState}
                onRefreshStates={() => loadFinanceData()}
              />
            )}

            {activeTab === 'config' && (
              <ConfiguracaoTab 
                dbState={dbState}
                userRole={resolvedRole}
                onSaveConfig={handleSaveConfig}
                onSaveFullDB={async (state) => {
                  await api.saveFullDb(state);
                  await loadFinanceData();
                }}
                currentUser={currentUser}
                onUpdateUserSignature={handleUpdateUserSignature}
              />
            )}

          </div>
        )}

      </main>

      {/* Corporate footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 no-print mt-auto font-sans">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} - Sistema de Gestão Financeira Multi-Igrejas Presbiteriais.</p>
        </div>
      </footer>

    </div>
  );
}
