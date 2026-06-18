import React, { useState } from 'react';
import { api } from '../api';
import { Usuario, IgrejaLocal } from '../types';
import { Church, Shield, User, Loader2, UserPlus, Key, Info, CheckCircle2, Mail, Lock } from 'lucide-react';

interface LoginScreenProps {
  localChurches: IgrejaLocal[];
  onLoginSuccess: (user: Usuario) => void;
}

export default function LoginScreen({ localChurches, onLoginSuccess }: LoginScreenProps) {
  // Login flow state machine: 'username' | 'password' | 'setup' | 'recovery' | 'reset'
  const [loginStep, setLoginStep] = useState<'username' | 'password' | 'setup' | 'recovery' | 'reset'>('username');
  
  const [loginInput, setLoginInput] = useState("");
  const [userLogin, setUserLogin] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [userForSetup, setUserForSetup] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // First Access (Password and Email Setup)
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState("");

  // Temporal password recovery flow states
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  // Registration Form State
  const [showRegister, setShowRegister] = useState(false);
  const [regNome, setRegNome] = useState("");
  const [regLogin, setRegLogin] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPerfil, setRegPerfil] = useState<'tesoureiro' | 'consulta'>('tesoureiro');
  const [regIgrejaId, setRegIgrejaId] = useState("");
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Step 1: Handle checking Username
  const handleLoginUsername = async (loginName: string) => {
    if (!loginName.trim()) return;
    try {
      setLoading(true);
      setErrorStatus(null);
      
      const response = await api.login(loginName);
      if (response.success) {
        if (response.needPasswordSetup) {
          // No password is set on the server yet! Transition to first access configuration
          setUserForSetup(response.usuario || null);
          setSetupEmail(response.usuario?.email || "");
          setUserLogin(loginName);
          setLoginStep('setup');
        } else if (response.usuario) {
          // Bypassed if no password is set, but wait: if they configured one, loginName without password should trigger 401 on server (or catch below)
          onLoginSuccess(response.usuario);
        }
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("protegido por senha") || msg.includes("Senha incorreta")) {
        // Since there is a password set, transition to the password input step!
        setUserLogin(loginName);
        setLoginStep('password');
      } else {
        setErrorStatus(msg || "Nome de usuário incorreto.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle password entry login
  const handlePasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      alert("Por favor, insira a sua senha.");
      return;
    }
    try {
      setLoading(true);
      setErrorStatus(null);
      const response = await api.login(userLogin || loginInput, passwordInput);
      if (response.success && response.usuario) {
        onLoginSuccess(response.usuario);
      }
    } catch (err: any) {
      setErrorStatus(err.message || "Senha incorreta.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle setting up password (First Access)
  const handleSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupEmail.trim()) {
      alert("Por favor, preencha o e-mail.");
      return;
    }
    if (setupPassword.length < 4) {
      alert("A senha de acesso deve ter no mínimo 4 caracteres.");
      return;
    }
    if (setupPassword !== setupPasswordConfirm) {
      alert("As senhas informadas não coincidem.");
      return;
    }
    try {
      setLoading(true);
      const res = await api.setupPassword(userForSetup?.login || userLogin || loginInput, setupEmail, setupPassword);
      if (res.success && res.usuario) {
        alert("Primeiro acesso configurado com sucesso! Guarde suas credenciais.");
        onLoginSuccess(res.usuario);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao configurar primeiro acesso.");
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Handle requesting password recovery via e-mail
  const handleRequestRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginName = userLogin || loginInput;
    if (!loginName || !recoveryEmail.trim()) {
      alert("Preencha o login e o e-mail correspondente.");
      return;
    }
    try {
      setLoading(true);
      setErrorStatus(null);
      const res = await api.requestRecovery(loginName, recoveryEmail);
      if (res.success) {
        setSimulatedCode(res.codeSimulated || "123456");
        setLoginStep('reset');
        alert("E-mail validado! O código de redefinição foi gerado com sucesso.");
      }
    } catch (err: any) {
      setErrorStatus(err.message || "E-mail ou usuário inválido.");
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Handle submitting new password with verification code
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginName = userLogin || loginInput;
    if (!recoveryCodeInput.trim() || !newPassword.trim()) {
      alert("Por favor, preencha o código de recuperação e a nova senha.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      alert("As senhas não coincidem.");
      return;
    }
    try {
      setLoading(true);
      setErrorStatus(null);
      const res = await api.resetPassword(loginName, recoveryCodeInput, newPassword);
      if (res.success) {
        alert("Senha redefinida com sucesso! Prossiga com o seu login.");
        setLoginStep('password');
        setPasswordInput(newPassword);
        setSimulatedCode(null);
      }
    } catch (err: any) {
      setErrorStatus(err.message || "Erro ao redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNome.trim() || !regLogin.trim() || !regEmail.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios (incluindo o e-mail).");
      return;
    }
    try {
      setLoading(true);
      setErrorStatus(null);
      const targetChurch = regPerfil === 'tesoureiro' ? (regIgrejaId || localChurches[0]?.id) : "";
      
      const response = await api.register(regNome, regLogin, regPerfil, targetChurch, undefined, undefined, regEmail);
      if (response.success && response.usuario) {
        setRegSuccess(`Cadastro realizado com sucesso! Como ${regPerfil === 'tesoureiro' ? 'Tesoureiro Local' : 'Consultor'}, aguarde a liberação do seu acesso pelo Administrador Geral.`);
        // Clear reg states
        setRegNome("");
        setRegLogin("");
        setRegEmail("");
        setTimeout(() => {
          setRegSuccess(null);
          setShowRegister(false);
          setLoginInput(regLogin);
          setLoginStep('username');
        }, 4500);
      }
    } catch (err: any) {
      alert(err.message || "Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  // Helper reset back to start
  const resetToStart = () => {
    setLoginStep('username');
    setErrorStatus(null);
    setPasswordInput("");
    setSimulatedCode(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        
        {/* BRAND LOGO CARD */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 flex items-center justify-center rounded-2xl shadow-lg ring-4 ring-blue-500/20">
            <Church className="h-9 w-9 text-white" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
            Controle de Tesouraria
          </h2>
          <p className="mt-2 text-xs text-slate-400 font-mono uppercase tracking-widest">
            Presbitério e Igrejas Locais
          </p>
        </div>

        {/* CONTAINER CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          
          {!showRegister ? (
            <>
              {/* --- 1. USERNAME ACCESSIBILITY CHECK --- */}
              {loginStep === 'username' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Key className="w-4 h-4 text-blue-400" />
                      Identificação do Usuário
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Insira o seu login de acesso para autenticar na plataforma.
                    </p>
                  </div>

                  {errorStatus && (
                    <div id="login-error-alert" className="bg-red-500/10 border border-red-500/20 text-red-300 p-3.5 rounded-xl text-xs space-y-1">
                      <strong>Erro de Acesso:</strong>
                      <p>{errorStatus}</p>
                    </div>
                  )}

                  <form onSubmit={(e) => { e.preventDefault(); handleLoginUsername(loginInput); }} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Usuário (Login)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none">
                          <User className="w-5 h-5 text-slate-500" />
                        </span>
                        <input
                          type="text"
                          required
                          value={loginInput}
                          onChange={(e) => setLoginInput(e.target.value)}
                          placeholder="Ex: alianca ou admin"
                          className="block w-full pl-10 pr-3 py-3 border border-slate-800 bg-slate-950/80 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 font-semibold text-sm transition-all shadow-md focus:outline-none cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Procurando Usuário...
                        </>
                      ) : (
                        "Avançar"
                      )}
                    </button>
                  </form>

                  {/* DEMO ACCOUNTS HELPER BOX */}
                  <div className="bg-slate-950/55 rounded-2xl p-4 border border-slate-800/60 mt-4 space-y-3 font-sans">
                    <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider block font-bold">
                      🔐 Perfis Cadastrados (Entrada Rápida)
                    </span>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      
                      {/* ADMIN */}
                      <button
                        onClick={() => { setLoginInput("admin"); handleLoginUsername("admin"); }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-slate-900/80 transition-all text-left text-slate-300"
                      >
                        <div>
                          <strong className="block text-slate-100 text-[11px]">Rev. Douglas de Paula</strong>
                          <span className="text-[10px] text-slate-500 font-mono">login: admin</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold tracking-wider">
                          ADMIN GERAL
                        </span>
                      </button>

                      {/* CO - ALIANCA */}
                      <button
                        onClick={() => { setLoginInput("alianca"); handleLoginUsername("alianca"); }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-900/80 transition-all text-left text-slate-300"
                      >
                        <div>
                          <strong className="block text-slate-100 text-[11px]">Carlos Alberto (Igr. Aliança)</strong>
                          <span className="text-[10px] text-slate-500 font-mono">login: alianca</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold tracking-wider">
                          TESOUREIRO
                        </span>
                      </button>

                      {/* CO - CENTRAL */}
                      <button
                        onClick={() => { setLoginInput("central"); handleLoginUsername("central"); }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-900/80 transition-all text-left text-slate-300"
                      >
                        <div>
                          <strong className="block text-slate-100 text-[11px]">Roberto Mendes (Igr. Central)</strong>
                          <span className="text-[10px] text-slate-500 font-mono">login: central</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold tracking-wider">
                          TESOUREIRO
                        </span>
                      </button>

                      {/* CO - ESPERANCA (BLOCKED) */}
                      <button
                        onClick={() => { setLoginInput("esperanca"); handleLoginUsername("esperanca"); }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500 hover:bg-slate-900/80 transition-all text-left text-slate-300"
                      >
                        <div>
                          <strong className="block text-slate-100 text-[11px]">Marcos Pinheiro (Igr. Esperança)</strong>
                          <span className="text-[10px] text-slate-500 font-mono">login: esperanca</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold tracking-wider">
                          PENDENTE
                        </span>
                      </button>

                      {/* CONSULTANT */}
                      <button
                        onClick={() => { setLoginInput("consultor"); handleLoginUsername("consultor"); }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-pink-500 hover:bg-slate-900/80 transition-all text-left text-slate-300"
                      >
                        <div>
                          <strong className="block text-slate-100 text-[11px]">Dr. Marcos Silva</strong>
                          <span className="text-[10px] text-slate-500 font-mono">login: consultor</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 font-bold tracking-wider">
                          CONSULTOR
                        </span>
                      </button>

                    </div>
                  </div>

                  {/* REGISTER REDIRECT LINK */}
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setShowRegister(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Não possui cadastro? Crie uma conta aqui.
                    </button>
                  </div>
                </div>
              )}

              {/* --- 2. PASSWORD PROMPT SCREEN --- */}
              {loginStep === 'password' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-400" />
                      Digite Sua Senha
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Identificado com sucesso: <span className="text-blue-400 font-semibold font-mono">@{userLogin}</span>
                    </p>
                  </div>

                  {errorStatus && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs">
                      {errorStatus}
                    </div>
                  )}

                  <form onSubmit={handlePasswordLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Senha de Segurança
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none">
                          <Lock className="w-5 h-5 text-slate-500" />
                        </span>
                        <input
                          type="password"
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Digite seu código pessoal"
                          className="block w-full pl-10 pr-3 py-3 border border-slate-800 bg-slate-950/80 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryEmail("");
                          setLoginStep('recovery');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={resetToStart}
                        className="w-1/3 py-2.5 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-800/30 transition-all cursor-pointer"
                      >
                        Trocar Usuário
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Autenticar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* --- 3. FIRST TIME PASSWORD / EMAIL SETUP --- */}
              {loginStep === 'setup' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold tracking-wider font-mono uppercase mb-2 inline-block">
                      🛡️ PRIMEIRO ACESSO DETECTADO
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 leading-snug">
                      Vincular E-mail e Senha
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Olá, <span className="font-semibold text-slate-200">{userForSetup?.nome || userLogin}</span>! Identificamos que esta conta ainda não possui senha de acesso configurada. Cadastre agora os dados obrigatórios para segurança do sistema.
                    </p>
                  </div>

                  <form onSubmit={handleSetupPasswordSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        E-mail de Correspondência (Preenchimento Obrigatório)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none">
                          <Mail className="w-4 h-4 text-slate-500" />
                        </span>
                        <input
                          type="email"
                          required
                          value={setupEmail}
                          onChange={(e) => setSetupEmail(e.target.value)}
                          placeholder="ex: seuemail@dominio.com"
                          className="block w-full pl-9 pr-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Este e-mail será obrigatoriamente utilizado para recuperar ou alterar a sua senha de acesso em caso de perda.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Defina uma Senha Segura
                      </label>
                      <input
                        type="password"
                        required
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-mono transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Confirme a Senha
                      </label>
                      <input
                        type="password"
                        required
                        value={setupPasswordConfirm}
                        onChange={(e) => setSetupPasswordConfirm(e.target.value)}
                        placeholder="Repita a senha definida"
                        className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-mono transition-all"
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={resetToStart}
                        className="w-1/3 py-2.5 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-800/30 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Configurar e Entrar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* --- 4. REQUEST PASSWORD RECOVERY --- */}
              {loginStep === 'recovery' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-400" />
                      Recuperação de Senha
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Identificado com: <span className="font-mono text-blue-400">@{userLogin || loginInput}</span>. Informe seu e-mail cadastrado.
                    </p>
                  </div>

                  {errorStatus && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs">
                      {errorStatus}
                    </div>
                  )}

                  <form onSubmit={handleRequestRecoverySubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Seu E-mail Cadastrado
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none">
                          <Mail className="w-5 h-5 text-slate-500" />
                        </span>
                        <input
                          type="email"
                          required
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="Informe seu e-mail vinculado ao cadastro"
                          className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setLoginStep('password')}
                        className="w-1/3 py-2.5 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-800/30 transition-all cursor-pointer"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Solicitar Acesso
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* --- 5. VERIFY RECOVERY CODE AND ENTER NEW PASSWORD --- */}
              {loginStep === 'reset' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[10px] font-bold tracking-wider font-mono uppercase mb-2 inline-block">
                      📨 CÓDIGO DE REDEFINIÇÃO GERADO
                    </span>
                    <h3 className="text-lg font-bold text-slate-100">
                      Cadastrar Nova Senha
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      Informe o código de verificação recebido e configure a sua nova senha eclesiástica.
                    </p>
                  </div>

                  {/* SIMULATED DEVICE FOR MOCK ENVIRONMENT (FULLY FUNCTIONAL DESIGN) */}
                  {simulatedCode && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3.5 rounded-2xl text-xs space-y-1">
                      <strong>Serviço de Notificação de E-mail (Simulado):</strong>
                      <p>
                        Para fins de demonstração, o código enviado para <span className="underline">{recoveryEmail}</span> é: <span className="font-mono text-sm tracking-widest font-bold text-white bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 ml-1">{simulatedCode}</span>
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Digite o Código de 6 Dígitos
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="Ex: 123456"
                        value={recoveryCodeInput}
                        onChange={(e) => setRecoveryCodeInput(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs text-center font-mono tracking-widest focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Sua Nova Senha Segura
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite sua nova senha de acesso"
                        className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-mono transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Confirme a Senha
                      </label>
                      <input
                        type="password"
                        required
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="Repita a senha de acesso"
                        className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-mono transition-all"
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setLoginStep('recovery')}
                        className="w-1/3 py-2.5 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-800/30 transition-all cursor-pointer"
                      >
                        Refazer Código
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Redefinir e Avançar
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            // --- REGISTRATION FORM VIEW WITH MANDATORY EMAIL ---
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-4.5 h-4.5 text-blue-400" />
                  Cadastrar Ficha de Acesso
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  Após o cadastro, o Administrador autorizará a liberação. No primeiro login, você criará a sua senha de segurança.
                </p>
              </div>

              {regSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-medium">{regSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pr. André Luiz"
                      value={regNome}
                      onChange={(e) => setRegNome(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Usuário de Acesso (Login Único)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: andreluiz"
                      value={regLogin}
                      onChange={(e) => setRegLogin(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-200 text-sm font-mono focus:outline-none focus:border-blue-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      E-mail Correspondente (Obrigatório)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Ex: andre@dominio.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Perfil de Acesso
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRegPerfil('tesoureiro')}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          regPerfil === 'tesoureiro'
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Tesoureiro Local
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegPerfil('consulta')}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          regPerfil === 'consulta'
                            ? 'bg-pink-600/10 border-pink-500 text-pink-400'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Consultor / Auditor
                      </button>
                    </div>
                  </div>

                  {regPerfil === 'tesoureiro' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Igreja Local Designada
                      </label>
                      <select
                        value={regIgrejaId}
                        onChange={(e) => setRegIgrejaId(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                      >
                        {localChurches.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.igreja.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRegister(false)}
                      className="w-1/3 py-2.5 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-800/30 transition-all cursor-pointer"
                    >
                      Voltar ao Login
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Solicitar Cadastro
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* COMPREHENSIVE COMPANION CARD */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 flex gap-2.5 items-start text-[11px] text-slate-400 leading-snug">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p>
            <strong>Regras De Acesso Eclesiástico:</strong> O Administrador Geral do Presbitério possui autoridade plena para aprovar novos tesoureiros. Os consultores possuem acesso de <span className="text-pink-400 font-medium">apenas leitura</span> e necessitam de uma liberação específica (feita pelo administrador geral ou pelo tesoureiro-chefe da respectiva igreja local).
          </p>
        </div>

      </div>
    </div>
  );
}
