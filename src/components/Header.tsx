import React from 'react';
import { Usuario, IgrejaLocal } from '../types';
import { 
  Shield, Eye, Database, Church, Landmark, Settings, 
  Users, CalendarDays, BarChart3, Receipt, LogOut, KeyRound 
} from 'lucide-react';

interface HeaderProps {
  currentUser: Usuario | null;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  churchName: string;
  availableChurches?: IgrejaLocal[];
  activeChurchId?: string;
  onChurchChange?: (id: string) => void;
}

export default function Header({ 
  currentUser, 
  onLogout, 
  activeTab, 
  onTabChange, 
  churchName,
  availableChurches = [],
  activeChurchId = "",
  onChurchChange
}: HeaderProps) {
  
  const isAdmin = currentUser?.perfil === 'admin';
  const isConsultant = currentUser?.perfil === 'consulta';

  // Determine what churches are switcher-selectable for this user
  const selectableChurches = isAdmin 
    ? availableChurches 
    : isConsultant 
    ? availableChurches.filter(ch => currentUser?.autorizacaoConsultas?.[ch.id] === true)
    : [];

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* UPPER ROW - IDENTITY, FOCUS, SESSION SWITCHER */}
        <div className="flex items-center justify-between h-16 border-b border-slate-800">
          
          {/* Brand & Church logo */}
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-blue-600 rounded-lg text-white">
              <Church className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <span id="church-display-name" className="font-bold text-base tracking-tight block max-w-[200px] sm:max-w-xs truncate text-slate-100">
                Igreja Presbiteriana Aliança
              </span>
              <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider">
                Controle Eclesiástico
              </span>
            </div>
          </div>

          {/* ACTIVE CHURCH CONTEXT SWITCHER OR INDICATOR */}
          {(isAdmin || (isConsultant && selectableChurches.length > 1)) ? (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800 shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 px-1.5 hidden lg:inline">
                Igreja Ativa:
              </span>
              <select
                value={activeChurchId}
                onChange={(e) => onChurchChange?.(e.target.value)}
                className="bg-transparent text-xs font-semibold text-blue-400 border-none outline-none pr-6 cursor-pointer focus:ring-0 font-sans"
              >
                {selectableChurches.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-300 font-sans">
                    {c.igreja.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            currentUser && (
              <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs font-semibold bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/65">
                <Church className="w-3.5 h-3.5 text-blue-500" />
                <span className="truncate max-w-[180px]">{churchName}</span>
              </div>
            )
          )}

          {/* SESSION USER CARD */}
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <span className="text-xs font-bold block text-slate-100 leading-tight">
                  {currentUser.nome}
                </span>
                <span className={`text-[9px] uppercase font-bold tracking-wider rounded font-mono px-1.5 py-0.5 mt-0.5 inline-block ${
                  currentUser.perfil === 'admin' 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : currentUser.perfil === 'tesoureiro'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-pink-500/10 text-pink-400'
                }`}>
                  {currentUser.perfil === 'admin' ? 'Administrador Geral' : currentUser.perfil === 'tesoureiro' ? 'Tesoureiro Local' : 'Consultor'}
                </span>
              </div>

              {/* LOGOUT BUTTON */}
              <button
                onClick={onLogout}
                className="p-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                title="Sair do Sistema"
              >
                <LogOut className="w-4 h-4 text-slate-400 hover:text-red-400" />
                <span className="hidden sm:inline">Desconectar</span>
              </button>
            </div>
          )}

        </div>

        {/* LOWER ROW - PRIMARY TABS NAVIGATION BAR */}
        <div className="flex overflow-x-auto space-x-1 py-1 no-scrollbar leading-none">
          {[
            { id: 'dashboard', label: 'Painel Central', icon: BarChart3 },
            { id: 'dizimistas', label: 'Dizimistas', icon: Users, visible: currentUser?.perfil !== 'consulta' },
            { id: 'meses', label: 'Módulos Mensais', icon: CalendarDays },
            { id: 'geral', label: 'Consolidação Geral', icon: Landmark },
            { id: 'presbiterio', label: 'Relatório ao Presbitério', icon: Receipt },
            { id: 'acessos', label: 'Controle de Acessos', icon: KeyRound, visible: isAdmin || currentUser?.perfil === 'tesoureiro' },
            { id: 'config', label: 'Configurações', icon: Settings, visible: currentUser?.perfil !== 'consulta' },
          ]
          .filter(tab => tab.visible !== false)
          .map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`py-2 px-3.5 rounded-t-lg font-medium text-xs sm:text-sm flex items-center space-x-2 transition-all cursor-pointer shrink-0 border-b-2 ${
                  active
                    ? 'border-blue-500 bg-slate-800 text-white font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
