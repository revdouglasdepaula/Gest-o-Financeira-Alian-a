import React, { useState } from 'react';
import { api } from '../api';
import { Usuario, DbState, IgrejaLocal } from '../types';
import { 
  Users, Key, ShieldCheck, ShieldAlert, Plus, Trash2, 
  ToggleLeft, ToggleRight, Church, UserCheck, Eye, EyeOff, ClipboardList, Info, Pencil, X, Check, Upload 
} from 'lucide-react';

interface ControleAcessosProps {
  currentUser: Usuario;
  dbState: DbState | null;
  onRefreshStates: () => Promise<void>;
}

export default function ControleAcessos({ 
  currentUser, 
  dbState, 
  onRefreshStates 
}: ControleAcessosProps) {
  
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'igrejas'>('usuarios');

  // New Church form state (Admin only)
  const [newChurchNome, setNewChurchNome] = useState("");
  const [newChurchCnpj, setNewChurchCnpj] = useState("");
  const [newChurchEndereco, setNewChurchEndereco] = useState("");
  const [newChurchPastor, setNewChurchPastor] = useState("");

  // New User form state (Admin only)
  const [newUserNome, setNewUserNome] = useState("");
  const [newUserLogin, setNewUserLogin] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserSenha, setNewUserSenha] = useState("");
  const [newUserPerfil, setNewUserPerfil] = useState<'admin' | 'tesoureiro' | 'consulta'>('tesoureiro');
  const [newUserIgrejaId, setNewUserIgrejaId] = useState("");
  const [newUserCpf, setNewUserCpf] = useState("");
  const [newUserTelefone, setNewUserTelefone] = useState("");
  const [newUserAssinaturaImg, setNewUserAssinaturaImg] = useState("");
  const [newUserConsultantAccess, setNewUserConsultantAccess] = useState<Record<string, boolean>>({});

  // Non-blocking iframe-proof delete states
  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);
  const [churchToDeleteId, setChurchToDeleteId] = useState<string | null>(null);

  // Edit states
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editingChurch, setEditingChurch] = useState<IgrejaLocal | null>(null);

  const handleStartEditUser = (user: Usuario) => {
    setEditingUser(user);
    setNewUserNome(user.nome);
    setNewUserLogin(user.login);
    setNewUserEmail(user.email || "");
    setNewUserSenha(""); // Keep blank to indicate no change unless typed
    setNewUserPerfil(user.perfil);
    setNewUserIgrejaId(user.igrejaId || "");
    setNewUserCpf(user.cpf || "");
    setNewUserTelefone(user.telefone || "");
    setNewUserAssinaturaImg(user.assinaturaImg || "");
    setNewUserConsultantAccess(user.autorizacaoConsultas || {});
  };

  const handleCancelEditUser = () => {
    setEditingUser(null);
    setNewUserNome("");
    setNewUserLogin("");
    setNewUserEmail("");
    setNewUserSenha("");
    setNewUserPerfil("tesoureiro");
    setNewUserIgrejaId("");
    setNewUserCpf("");
    setNewUserTelefone("");
    setNewUserAssinaturaImg("");
    setNewUserConsultantAccess({});
  };

  const handleStartEditChurch = (churchLocal: IgrejaLocal) => {
    setEditingChurch(churchLocal);
    setNewChurchNome(churchLocal.igreja.nome);
    setNewChurchCnpj(churchLocal.igreja.cnpj || "");
    setNewChurchPastor(churchLocal.igreja.pastor || "");
    setNewChurchEndereco(churchLocal.igreja.endereco || "");
  };

  const handleCancelEditChurch = () => {
    setEditingChurch(null);
    setNewChurchNome("");
    setNewChurchCnpj("");
    setNewChurchPastor("");
    setNewChurchEndereco("");
  };

  const handleSelectSubTab = (tab: 'usuarios' | 'igrejas') => {
    setActiveSubTab(tab);
    handleCancelEditUser();
    handleCancelEditChurch();
  };

  const usersList = dbState?.usuarios || [];
  const churchesList = dbState?.igrejasLocais || [];

  const isAdmin = currentUser.perfil === 'admin';
  const isTreasurer = currentUser.perfil === 'tesoureiro';

  // Find user's church name if they're a treasurer
  const treasurerChurch = churchesList.find(c => c.id === currentUser.igrejaId);

  const handleToggleAuth = async (userId: string) => {
    try {
      setLoading(true);
      await api.toggleUserAuth(userId);
      await onRefreshStates();
    } catch (err: any) {
      alert(err.message || "Erro ao alterar autorização.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      await api.deleteUser(userId);
      await onRefreshStates();
    } catch (err: any) {
      alert(err.message || "Falha ao excluir usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurchNome.trim()) return;
    try {
      setLoading(true);
      if (editingChurch) {
        await api.updateChurch(editingChurch.id, newChurchNome, newChurchCnpj, newChurchEndereco, newChurchPastor);
        handleCancelEditChurch();
        alert("Igreja local atualizada com sucesso!");
      } else {
        await api.createChurch(newChurchNome, newChurchCnpj, newChurchEndereco, newChurchPastor);
        setNewChurchNome("");
        setNewChurchCnpj("");
        setNewChurchEndereco("");
        setNewChurchPastor("");
        alert("Igreja local criada com sucesso!");
      }
      await onRefreshStates();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar congregação.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChurch = async (churchId: string) => {
    try {
      setLoading(true);
      await api.deleteChurch(churchId);
      await onRefreshStates();
      alert("Igreja removida com sucesso.");
    } catch (err: any) {
      alert(err.message || "Erro ao excluir igreja.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNome.trim() || !newUserLogin.trim()) return;
    try {
      setLoading(true);
      const churchId = newUserPerfil === 'tesoureiro' ? (newUserIgrejaId || churchesList[0]?.id) : "";
      const consultantAccess = newUserPerfil === 'consulta' ? newUserConsultantAccess : undefined;
      
      if (editingUser) {
        await api.updateUser(
          editingUser.id, 
          newUserNome, 
          newUserLogin, 
          newUserPerfil, 
          churchId, 
          newUserAssinaturaImg,
          consultantAccess,
          newUserEmail,
          newUserSenha || undefined,
          newUserCpf || undefined,
          newUserTelefone || undefined
        );
        handleCancelEditUser();
        alert("Usuário atualizado com sucesso!");
      } else {
        await api.register(
          newUserNome, 
          newUserLogin, 
          newUserPerfil, 
          churchId, 
          newUserAssinaturaImg,
          consultantAccess,
          newUserEmail,
          newUserCpf || undefined,
          newUserTelefone || undefined
        );
        // If a password was specified during registration, we update it immediately!
        if (newUserSenha.trim()) {
          const freshDb = dbState; // Use the context dbState in React safely
          const createdUser = freshDb?.usuarios?.find((u: any) => u.login.toLowerCase() === newUserLogin.trim().toLowerCase());
          if (createdUser) {
            await api.updateUser(
              createdUser.id,
              createdUser.nome,
              createdUser.login,
              createdUser.perfil,
              createdUser.igrejaId,
              createdUser.assinaturaImg,
              createdUser.autorizacaoConsultas,
              newUserEmail,
              newUserSenha.trim(),
              newUserCpf || undefined,
              newUserTelefone || undefined
            );
          }
        }
        setNewUserNome("");
        setNewUserLogin("");
        setNewUserEmail("");
        setNewUserSenha("");
        setNewUserCpf("");
        setNewUserTelefone("");
        setNewUserAssinaturaImg("");
        setNewUserConsultantAccess({});
        alert("Usuário registrado com sucesso!");
      }
      await onRefreshStates();
    } catch (err: any) {
      alert(err.message || "Erro ao registrar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConsultantAccess = async (consultantId: string, churchId: string, isCurrentlyAuthorized: boolean) => {
    try {
      setLoading(true);
      await api.authorizeConsultant(consultantId, churchId, !isCurrentlyAuthorized);
      await onRefreshStates();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar autorização de consulta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Controle de Autorizações & Acessos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin 
              ? "Gerencie as contas de tesoureiros locais, cadastre novas igrejas do Presbitério e conceda autorizações globais." 
              : `Conselho de Tesouraria - Autorize consultores e auditores para acessar a pasta da ${treasurerChurch?.igreja.nome || 'sua igreja'}.`
            }
          </p>
        </div>

        {(isAdmin || isTreasurer) && (
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => handleSelectSubTab('usuarios')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'usuarios' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isAdmin ? "Tesoureiros & Consultores" : "Autorizações de Consultores"}
            </button>
            <button
              onClick={() => handleSelectSubTab('igrejas')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'igrejas' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lista de Igrejas do Presbitério
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div id="loading-overlay" className="bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 animate-pulse justify-center font-mono">
          <span>●</span> Sincronizando dados de segurança com o servidor...
        </div>
      )}

      {/* ADMIN LEVEL - MEMBERS TAB */}
      {isAdmin && activeSubTab === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* USER MANAGEMENT LIST (LEFT & CENTER columns) */}
          <div className="lg:col-span-2 space-y-4">
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Usuários Logados no Presbitério ({usersList.length})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 font-bold uppercase text-[10px]">Nome / Login</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">Perfil</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">Status</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">Igreja Vínculo / Permissões</th>
                      <th className="py-2.5 font-bold uppercase text-[10px] text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {usersList.map((u) => {
                      const userChurch = churchesList.find(c => c.id === u.igrejaId);
                      return (
                        <tr key={u.id} className="hover:bg-slate-950/20 text-slate-300">
                          <td className="py-3">
                            <span className="font-semibold block text-slate-200 text-sm">{u.nome}</span>
                            <span className="font-mono text-slate-500 text-[10px]">{u.login}</span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                              u.perfil === 'admin' 
                                ? 'bg-blue-500/10 text-blue-400' 
                                : u.perfil === 'tesoureiro' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-pink-500/10 text-pink-400'
                            }`}>
                              {u.perfil.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => u.perfil !== 'admin' && handleToggleAuth(u.id)}
                              disabled={u.perfil === 'admin'}
                              className={`flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2 py-1 select-none ${
                                u.perfil === 'admin' 
                                  ? 'text-blue-400'
                                  : u.autorizado 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer hover:bg-red-500/20'
                              }`}
                            >
                              {u.autorizado ? "Autorizado" : "Bloqueado / Aguardando"}
                            </button>
                          </td>
                          <td className="py-3 max-w-xs truncate">
                            {u.perfil === 'admin' && <span className="text-slate-500">Acesso Total</span>}
                            {u.perfil === 'tesoureiro' && (
                              <span className="text-slate-300">
                                {userChurch?.igreja.nome || "Não Vinculada"}
                              </span>
                            )}
                            {u.perfil === 'consulta' && (
                              <div className="space-y-1">
                                <span className="text-indigo-400 font-medium block">Consultor Autorizado em:</span>
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                  {churchesList.map(ch => {
                                    const hasAccess = u.autorizacaoConsultas?.[ch.id] === true;
                                    return (
                                      <button
                                        key={ch.id}
                                        onClick={() => handleToggleConsultantAccess(u.id, ch.id, hasAccess)}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                          hasAccess 
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                            : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-400'
                                        }`}
                                      >
                                        {ch.igreja.nome.replace("Igreja Presbiteriana ", "IP ")}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditUser(u)}
                                className="text-blue-400 hover:text-blue-300 p-2 rounded-lg bg-slate-950 border border-slate-800/80 hover:bg-blue-500/10 cursor-pointer transition-all"
                                title="Editar Usuário / Acesso"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {u.perfil !== 'admin' && (
                                <button
                                  onClick={() => setUserToDeleteId(u.id)}
                                  className="text-red-400 hover:text-red-300 p-2 rounded-lg bg-slate-950 border border-slate-800/80 hover:bg-red-500/10 cursor-pointer transition-all"
                                  title="Excluir Usuário"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECURITY LOG EXPLANATION */}
            <div className="bg-blue-950/40 border border-blue-800/60 rounded-3xl p-5 flex gap-3 text-xs text-slate-200 leading-relaxed shadow-lg shadow-blue-950/20">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <strong className="text-blue-300">💡 Gestão Eclesiástica Multi-Igrejas:</strong>
                <p className="text-slate-300">Como Administrador Geral (Tesoureiro do Presbitério), você tem autoridade absoluta sobre os tesoureiros de todas as congregações locais. Ao aprovar um cadastro, o tesoureiro designado poderá efetivar e retificar seus relatórios. Os consultores são read-only e necessitam de aprovação em cada igreja local.</p>
              </div>
            </div>

          </div>

          {/* REGISTER NEW BOARD MEMBER (RIGHT column) */}
          <div className="space-y-4">
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                {editingUser ? <Pencil className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-blue-400" />}
                {editingUser ? "Editar Usuário / Acesso" : "Registrar Novo Acesso"}
              </h3>
              
              <form onSubmit={handleSubmitUser} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Presb. Marcos Silva"
                    value={newUserNome}
                    onChange={(e) => setNewUserNome(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Login de Entrada (Único)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: marcos_central"
                    value={newUserLogin}
                    onChange={(e) => setNewUserLogin(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Perfil
                  </label>
                  <select
                    value={newUserPerfil}
                    onChange={(e) => setNewUserPerfil(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="tesoureiro">Tesoureiro Local</option>
                    <option value="consulta">Consultor / Auditor</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>

                {newUserPerfil === 'tesoureiro' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Igreja Local Designada
                    </label>
                    <select
                      value={newUserIgrejaId}
                      onChange={(e) => setNewUserIgrejaId(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all cursor-pointer mb-3"
                    >
                      <option value="">-- Selecione uma Igreja --</option>
                      {churchesList.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.igreja.nome}
                        </option>
                      ))}
                    </select>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Assinatura Digitalizada (Individual)
                      </label>
                      <p className="text-[10px] text-slate-500 leading-normal mb-1.5">
                        Adicione a assinatura em PNG/JPEG para este tesoureiro. Ela será impressa nos balancetes assinados.
                      </p>
                      
                      {newUserAssinaturaImg ? (
                        <div className="space-y-2">
                          <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl flex items-center justify-between">
                            <img 
                              src={newUserAssinaturaImg} 
                              alt="Assinatura" 
                              className="max-h-12 object-contain bg-white rounded p-1 max-w-[125px]"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => setNewUserAssinaturaImg("")}
                              className="text-red-400 hover:text-red-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 px-2 py-1 rounded-lg text-[10px] transition font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" /> Remover
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center border border-dashed border-slate-800 bg-slate-950 rounded-xl py-3 px-4 cursor-pointer hover:bg-slate-900/50 hover:border-slate-700 transition group">
                          <div className="text-center">
                            <Upload className="w-4 h-4 text-slate-500 mx-auto group-hover:text-slate-400 transition mb-1" />
                            <span className="text-[10px] font-bold text-slate-400">Carregar Imagem de Assinatura</span>
                          </div>
                          <input
                            type="file"
                            accept="image/png, image/jpeg"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const base64 = ev.target?.result as string;
                                  setNewUserAssinaturaImg(base64);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* CPF, Telefone, Email and Password Setup fields */}
                <div className="border-t border-slate-800/60 pt-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        CPF (Individual)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 000.000.000-00"
                        value={newUserCpf}
                        onChange={(e) => setNewUserCpf(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Telefone Celular
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: (00) 00000-0000"
                        value={newUserTelefone}
                        onChange={(e) => setNewUserTelefone(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      E-mail Correspondente
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: exemplo@dominio.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all font-sans"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug font-sans">
                      Email vinculatório para receber códigos de redefinição de acesso em caso de perda.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      {editingUser ? "Alterar Senha do Usuário" : "Definir Senha Inicial"}
                    </label>
                    <input
                      type="password"
                      placeholder={editingUser ? "Deixe em branco para manter a atual" : "Opcional: Deixe em branco para o primeiro acesso"}
                      value={newUserSenha}
                      onChange={(e) => setNewUserSenha(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {newUserPerfil === 'consulta' && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Designar Igrejas para Consulta (Acesso de Leitura)
                    </label>
                    <p className="text-[10px] text-slate-500 leading-normal mb-2">
                      Marque as igrejas locais que este consultor/auditor terá permissão para ver e auditar relatórios:
                    </p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                      {churchesList.map((ch) => {
                        const hasAccess = !!newUserConsultantAccess[ch.id];
                        return (
                          <label key={ch.id} className="flex items-start gap-2.5 text-[11px] text-slate-300 font-medium cursor-pointer hover:text-slate-100 transition-all">
                            <input
                              type="checkbox"
                              checked={hasAccess}
                              onChange={(e) => {
                                setNewUserConsultantAccess(prev => ({
                                  ...prev,
                                  [ch.id]: e.target.checked
                                }));
                              }}
                              className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer h-3.5 w-3.5 mt-0.5"
                            />
                            <span>{ch.igreja.nome}</span>
                          </label>
                        );
                      })}
                      {churchesList.length === 0 && (
                        <p className="text-slate-500 text-[10px] italic text-center py-2">
                          Nenhuma igreja cadastrada no sistema.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingUser && (
                    <button
                      type="button"
                      onClick={handleCancelEditUser}
                      className="w-1/3 flex justify-center items-center gap-1 py-2.5 px-3 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700/80 font-semibold transition-all cursor-pointer text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`${editingUser ? 'w-2/3' : 'w-full'} flex justify-center items-center gap-1.5 py-2.5 px-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-semibold transition-all cursor-pointer text-xs`}
                  >
                    {editingUser ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingUser ? "Salvar Alterações" : "Salvar Usuário"}
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* CHURCHES TAB - AVAILABLE FOR ADMIN AND TREASURER */}
      {(isAdmin || isTreasurer) && activeSubTab === 'igrejas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Church className="w-4 h-4 text-blue-400" />
                Igrejas Locais Ativas no Presbitério ({churchesList.length})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 font-bold uppercase text-[10px]">Nome da Congregação</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">CNPJ</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">Pastor Residente</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">Tesoureiros</th>
                      <th className="py-2.5 font-bold uppercase text-[10px] text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {churchesList.map((ch) => {
                      const associatedTreasurers = usersList.filter(u => u.igrejaId === ch.id);
                      return (
                        <tr key={ch.id} className="hover:bg-slate-950/20 text-slate-300">
                          <td className="py-3">
                            <span className="font-semibold block text-slate-200 text-sm">{ch.igreja.nome}</span>
                            <span className="text-slate-500 text-[10px] truncate max-w-xs block">{ch.igreja.endereco}</span>
                          </td>
                          <td className="py-3 font-mono">{ch.igreja.cnpj || "Sem cadastro"}</td>
                          <td className="py-3">{ch.igreja.pastor || "Não informado"}</td>
                          <td className="py-3">
                            {associatedTreasurers.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {associatedTreasurers.map(t => (
                                  <span key={t.id} className={`text-[10px] ${t.autorizado ? 'text-emerald-400 font-medium' : 'text-slate-500 line-through'}`}>
                                    👤 {t.nome} ({t.login})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-red-400/80 text-[10px] font-medium">⚠️ Sem Tesoureiro Vinculado</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditChurch(ch)}
                                className="text-blue-400 hover:text-blue-300 p-2 rounded-lg bg-slate-950 border border-slate-800/80 hover:bg-blue-500/10 cursor-pointer transition-all"
                                title="Editar Igreja"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {churchesList.length > 1 && (
                                <button
                                  onClick={() => setChurchToDeleteId(ch.id)}
                                  className="text-red-400 hover:text-red-300 p-2 rounded-lg bg-slate-950 border border-slate-800/80 hover:bg-red-500/10 cursor-pointer transition-all"
                                  title="Excluir Igreja"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CREATE NEW CHURCH (RIGHT Column) */}
          <div className="space-y-4">
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                {editingChurch ? <Pencil className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-blue-400" />}
                {editingChurch ? "Editar Igreja" : "Cadastrar Nova Igreja"}
              </h3>
              
              <form onSubmit={handleSubmitChurch} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nome Completo da Igreja
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Igreja Presbiteriana Redenção"
                    value={newChurchNome}
                    onChange={(e) => setNewChurchNome(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    CNPJ Comercial
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: --.---.---/----.--"
                    value={newChurchCnpj}
                    onChange={(e) => setNewChurchCnpj(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Pastor Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rev. André Luiz"
                    value={newChurchPastor}
                    onChange={(e) => setNewChurchPastor(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Endereço Completo
                  </label>
                  <textarea
                    placeholder="Ex: Av. Governador, 520 - Jardim"
                    value={newChurchEndereco}
                    onChange={(e) => setNewChurchEndereco(e.target.value)}
                    rows={2}
                    className="block w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="flex gap-2">
                  {editingChurch && (
                    <button
                      type="button"
                      onClick={handleCancelEditChurch}
                      className="w-1/3 flex justify-center items-center gap-1 py-2.5 px-3 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700/80 font-semibold transition-all cursor-pointer text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`${editingChurch ? 'w-2/3' : 'w-full'} flex justify-center items-center gap-1.5 py-2.5 px-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-semibold transition-all cursor-pointer text-xs`}
                  >
                    {editingChurch ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingChurch ? "Salvar Alterações" : "Salvar Nova Congregação"}
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* TREASURER LEVEL - CONSULTANTS AUTHORIZATION TAB */}
      {isTreasurer && activeSubTab === 'usuarios' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Liberar Acesso de Consultores / Auditores de Contas
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Como Tesoureiro Local da congregação <strong className="text-emerald-400">{treasurerChurch?.igreja.nome}</strong>, você pode autorizar ou revogar o acesso de visualização de cada auditor registrado no sistema somente para a sua pasta de tesouraria.
            </p>
          </div>

          {usersList.filter(u => u.perfil === 'consulta').length === 0 ? (
            <div className="bg-slate-950 rounded-2xl p-6 text-center text-slate-500 text-xs">
              Nenhum usuário de consulta cadastrado no sistema do Presbitério.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 font-bold uppercase text-[10px]">Nome do Auditor</th>
                    <th className="py-2.5 font-bold uppercase text-[10px]">Login Único</th>
                    <th className="py-2.5 font-bold uppercase text-[10px]">Vínculo do Cadastro</th>
                    <th className="py-2.5 font-bold uppercase text-[10px]">Permissão de Leitura em Sua Igreja</th>
                    <th className="py-2.5 font-bold uppercase text-[10px] text-right">Controle Local</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {usersList.filter(u => u.perfil === 'consulta').map((u) => {
                    const hasAccess = u.autorizacaoConsultas?.[currentUser.igrejaId || ""] === true;
                    return (
                      <tr key={u.id} className="hover:bg-slate-950/20 text-slate-300">
                        <td className="py-3">
                          <span className="font-bold text-slate-200 text-sm block">{u.nome}</span>
                          <span className="text-[10px] text-pink-400 font-mono">PERFIL CONSULTA</span>
                        </td>
                        <td className="py-3 font-mono text-slate-400">{u.login}</td>
                        <td className="py-3">
                          <span className="text-slate-500 font-mono text-[10px]">Sistema Geral</span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                            hasAccess 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {hasAccess ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                Liberado (Visualização Autorizada)
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                Bloqueado (Sem Acesso de Leitura)
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleToggleConsultantAccess(u.id, currentUser.igrejaId || "", hasAccess)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                              hasAccess 
                                ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400' 
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {hasAccess ? "Bloquear Visualização" : "Autorizar Visualização"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. MODALS DE CONFIRMAÇÃO DE EXCLUSÃO (Para contornar bloqueios de iFrames) */}
      {userToDeleteId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-sans">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Confirmar Exclusão de Membro
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Deseja realmente excluir este usuário do sistema permanentemente? Esta ação revoga quaisquer credenciais de acesso existentes.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setUserToDeleteId(null)}
                className="w-1/2 py-2 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-800/30 transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  handleDeleteUser(userToDeleteId);
                  setUserToDeleteId(null);
                }}
                className="w-1/2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Excluir Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {churchToDeleteId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-sans">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
              Confirmar Exclusão de Igreja
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              ATENÇÃO: Deseja realmente excluir esta igreja local? Todos os dízimos, lançamentos de caixa e relatórios associados a ela serão removidos permanentemente!
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setChurchToDeleteId(null)}
                className="w-1/2 py-2 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-800/30 transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  handleDeleteChurch(churchToDeleteId);
                  setChurchToDeleteId(null);
                }}
                className="w-1/2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Excluir Igreja
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
