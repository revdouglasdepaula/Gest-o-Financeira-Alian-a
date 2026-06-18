import React, { useState } from 'react';
import { DbState, UserRole, LISTA_MINISTERIOS } from '../types';
import { formatCurrency } from '../utils';
import { Settings, Save, ShieldCheck, Lock, ShieldAlert, Key, HelpCircle, RefreshCw, Download, Upload, Database, PenTool, X } from 'lucide-react';

interface ConfiguracaoTabProps {
  dbState: DbState | null;
  userRole: UserRole;
  onSaveConfig: (payload: { igreja?: any; configuracoes?: any }) => Promise<void>;
  onSaveFullDB: (state: DbState) => Promise<void>;
  currentUser?: any;
  onUpdateUserSignature?: (userId: string, signatureImg: string) => Promise<void>;
}

export default function ConfiguracaoTab({
  dbState,
  userRole,
  onSaveConfig,
  onSaveFullDB,
  currentUser,
  onUpdateUserSignature
}: ConfiguracaoTabProps) {
  
  const loggedInUserObj = dbState?.usuarios?.find((u: any) => u.id === currentUser?.id) || currentUser;
  const activeTreasurerUser = dbState?.usuarios?.find(
    (u: any) => u.perfil === 'tesoureiro' && u.igrejaId === dbState?.igreja?.id
  );
  const showSignatureSrc = activeTreasurerUser?.assinaturaImg 
    ? activeTreasurerUser.assinaturaImg 
    : ((currentUser?.perfil === 'tesoureiro' && loggedInUserObj?.assinaturaImg)
        ? loggedInUserObj.assinaturaImg
        : (dbState?.igreja?.tesoureiroAssinaturaImg || ""));

  // Setup form states bound to initial state
  const [nome, setNome] = useState(dbState?.igreja.nome || "");
  const [cnpj, setCnpj] = useState(dbState?.igreja.cnpj || "");
  const [endereco, setEndereco] = useState(dbState?.igreja.endereco || "");
  const [pastor, setPastor] = useState(dbState?.igreja.pastor || "");
  const [pastorCpf, setPastorCpf] = useState(dbState?.igreja.pastorCpf || "");
  const [membrosAtivos, setMembrosAtivos] = useState(dbState?.igreja.membrosAtivos || 100);

  const [tesoureiroNome, setTesoureiroNome] = useState(() => {
    const activeChTreasurer = dbState?.usuarios?.find(
      (u: any) => u.perfil === 'tesoureiro' && u.igrejaId === dbState?.igreja?.id
    );
    return activeChTreasurer?.nome || dbState?.igreja.tesoureiroNome || "";
  });
  const [tesoureiroCpf, setTesoureiroCpf] = useState(dbState?.igreja.tesoureiroCpf || "");
  const [tesoureiroTelefone, setTesoureiroTelefone] = useState(dbState?.igreja.tesoureiroTelefone || "");
  const [tesoureiroEmail, setTesoureiroEmail] = useState(dbState?.igreja.tesoureiroEmail || "");
  const [segundoTesoureiroNome, setSegundoTesoureiroNome] = useState(dbState?.igreja.segundoTesoureiroNome || "");
  const [segundoTesoureiroTelefone, setSegundoTesoureiroTelefone] = useState(dbState?.igreja.segundoTesoureiroTelefone || "");
  const [segundoTesoureiroEmail, setSegundoTesoureiroEmail] = useState(dbState?.igreja.segundoTesoureiroEmail || "");

  const [saldoJanBanco, setSaldoJanBanco] = useState(dbState?.configuracoes.saldoInicialBancoJan || 0);
  const [saldoJanInvest, setSaldoJanInvest] = useState(dbState?.configuracoes.saldoInicialInvestJan || 0);
  const [saldosMinisterios, setSaldosMinisterios] = useState<{ [sigla: string]: number }>(dbState?.configuracoes.saldosIniciaisMinisterios || {});
  const [listaMinisterios, setListaMinisterios] = useState<any[]>(dbState?.configuracoes?.ministerios || LISTA_MINISTERIOS);

  // Digital Signatures configuration states
  const [showDigitalSignatures, setShowDigitalSignatures] = useState<boolean>(dbState?.configuracoes?.showDigitalSignatures !== false);
  const [signedByTreasurer, setSignedByTreasurer] = useState<boolean>(dbState?.configuracoes?.signedByTreasurer !== false);
  const [signatureDate, setSignatureDate] = useState<string>(() => {
    if (dbState?.configuracoes?.signatureDate) return dbState.configuracoes.signatureDate;
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return "2026-06-17";
    }
  });
  const [signatureTime, setSignatureTime] = useState<string>(() => {
    if (dbState?.configuracoes?.signatureTime) return dbState.configuracoes.signatureTime;
    try {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    } catch {
      return "10:16";
    }
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [novoNome, setNovoNome] = useState("");

  const isReadOnly = userRole === 'consulta';
  const isAdmin = userRole === 'admin';

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Drag and drop events for digital signature image
  const handleSignatureUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Por favor, selecione apenas arquivos de imagem.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const targetUserId = activeTreasurerUser?.id || (currentUser?.perfil === 'tesoureiro' ? currentUser.id : null);
        if (targetUserId && onUpdateUserSignature) {
          await onUpdateUserSignature(targetUserId, base64);
        }
        if (onSaveConfig && dbState?.igreja) {
          await onSaveConfig({
            igreja: {
              ...dbState.igreja,
              tesoureiroAssinaturaImg: base64
            }
          });
        }
        alert("Imagem da assinatura digitalizada salva com sucesso!");
      } catch (error) {
        console.error("Erro ao salvar assinatura:", error);
        alert("Erro ao salvar assinatura.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isReadOnly) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSignatureUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveSignatureImg = async () => {
    if (isReadOnly) return;
    if (window.confirm("Deseja realmente remover a imagem de assinatura digitalizada?")) {
      try {
        const targetUserId = activeTreasurerUser?.id || (currentUser?.perfil === 'tesoureiro' ? currentUser.id : null);
        if (targetUserId && onUpdateUserSignature) {
          await onUpdateUserSignature(targetUserId, "");
        }
        if (onSaveConfig && dbState?.igreja) {
          const { tesoureiroAssinaturaImg, ...restIgreja } = dbState.igreja;
          await onSaveConfig({
            igreja: {
              ...restIgreja,
              tesoureiroAssinaturaImg: ""
            }
          });
        }
        alert("Imagem da assinatura removida com sucesso.");
      } catch (error) {
        console.error("Erro ao remover assinatura:", error);
        alert("Erro ao remover assinatura.");
      }
    }
  };

  // Trigger JSON download for local backup copies
  const handleExportBackup = () => {
    if (!dbState) {
      alert("Erro: O estado do banco de dados não está carregado.");
      return;
    }
    try {
      const dataStr = JSON.stringify(dbState, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-').slice(0, 5);
      const exportFileDefaultName = `backup_financeiro_ipa_${dateStr}_${timeStr}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      alert("Falha ao exportar a cópia de segurança.");
      console.error(err);
    }
  };

  // Process uploaded backup file and write state to db.json through onSaveFullDB
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) {
      alert("Perfil de consulta não possui permissão para restaurar arquivos.");
      return;
    }
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("ATENÇÃO: Restaurar esta cópia de segurança irá substituir COMPLETAMENTE todas as movimentações de todos os meses, dízimos dos membros e configurações atuais pelos dados contidos neste arquivo. Esta operação não pode ser desfeita. Deseja prosseguir?")) {
      e.target.value = ''; // clear
      return;
    }

    setImporting(true);
    fileReader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);
        
        // Validation to safeguard data integrity and historical accuracy
        if (
          !parsedData ||
          typeof parsedData !== 'object' ||
          !parsedData.igreja ||
          !parsedData.configuracoes ||
          !Array.isArray(parsedData.dizimistas) ||
          !Array.isArray(parsedData.movimentacoes)
        ) {
          throw new Error("Estrutura do arquivo de backup inválida ou corrompida.");
        }

        await onSaveFullDB(parsedData);
        alert("Cópia de segurança restaurada e sincronizada com sucesso!");
        window.location.reload(); // Hard reload guarantees refreshing calculations
      } catch (err: any) {
        alert(`Erro de Integridade: ${err.message || 'Arquivo corrompido ou incompatível'}`);
        console.error(err);
      } finally {
        setImporting(false);
        e.target.value = ''; // clear
      }
    };

    fileReader.onerror = () => {
      alert("Falha ao ler o arquivo selecionado.");
      setImporting(false);
      e.target.value = ''; // clear
    };

    fileReader.readAsText(file);
  };

  React.useEffect(() => {
    if (dbState) {
      setNome(dbState.igreja.nome);
      setCnpj(dbState.igreja.cnpj);
      setEndereco(dbState.igreja.endereco);
      setPastor(dbState.igreja.pastor);
      setPastorCpf(dbState.igreja.pastorCpf || "");
      setMembrosAtivos(dbState.igreja.membrosAtivos);
      const activeChTreasurer = dbState.usuarios?.find(
        (u: any) => u.perfil === 'tesoureiro' && u.igrejaId === dbState.igreja.id
      );
      setTesoureiroNome(activeChTreasurer?.nome || dbState.igreja.tesoureiroNome || "");
      setTesoureiroCpf(activeChTreasurer?.cpf || dbState.igreja.tesoureiroCpf || "");
      setTesoureiroTelefone(activeChTreasurer?.telefone || dbState.igreja.tesoureiroTelefone || "");
      setTesoureiroEmail(activeChTreasurer?.email || dbState.igreja.tesoureiroEmail || "");
      setSegundoTesoureiroNome(dbState.igreja.segundoTesoureiroNome || "");
      setSegundoTesoureiroTelefone(dbState.igreja.segundoTesoureiroTelefone || "");
      setSegundoTesoureiroEmail(dbState.igreja.segundoTesoureiroEmail || "");

      setSaldoJanBanco(dbState.configuracoes.saldoInicialBancoJan);
      setSaldoJanInvest(dbState.configuracoes.saldoInicialInvestJan);
      setSaldosMinisterios(dbState.configuracoes.saldosIniciaisMinisterios || {});
      setListaMinisterios(dbState.configuracoes.ministerios || LISTA_MINISTERIOS);

      setShowDigitalSignatures(dbState.configuracoes.showDigitalSignatures !== false);
      setSignedByTreasurer(dbState.configuracoes.signedByTreasurer !== false);
      if (dbState.configuracoes.signatureDate) {
        setSignatureDate(dbState.configuracoes.signatureDate);
      }
      if (dbState.configuracoes.signatureTime) {
        setSignatureTime(dbState.configuracoes.signatureTime);
      }
    }
  }, [dbState]);

  const handleAddMinisterio = async () => {
    if (isReadOnly) return;
    if (!novoNome.trim()) {
      alert("Por favor, preencha o nome do ministério.");
      return;
    }
    const nomeCom = novoNome.trim();
    const sigla = nomeCom;

    // Check duplicates
    if (listaMinisterios.some(m => m.nome.toLowerCase() === nomeCom.toLowerCase() || m.sigla === sigla)) {
      alert("Já existe um ministério com este nome.");
      return;
    }

    const novoItem = {
      id: nomeCom.toLowerCase().replace(/\s+/g, '-'),
      sigla,
      nome: nomeCom
    };

    const updatedLista = [...listaMinisterios, novoItem];
    const updatedSaldos = {
      ...saldosMinisterios,
      [sigla]: 0
    };

    setListaMinisterios(updatedLista);
    setSaldosMinisterios(updatedSaldos);
    setNovoNome("");

    try {
      await onSaveConfig({
        igreja: {
          nome,
          cnpj,
          endereco,
          pastor,
          pastorCpf,
          membrosAtivos: parseInt(String(membrosAtivos)) || 0,
          tesoureiroNome,
          tesoureiroCpf,
          tesoureiroTelefone,
          tesoureiroEmail,
          segundoTesoureiroNome,
          segundoTesoureiroTelefone,
          segundoTesoureiroEmail
        },
        configuracoes: {
          saldoInicialBancoJan: parseFloat(String(saldoJanBanco)) || 0,
          saldoInicialInvestJan: parseFloat(String(saldoJanInvest)) || 0,
          saldosIniciaisMinisterios: updatedSaldos,
          ministerios: updatedLista,
          showDigitalSignatures,
          signedByTreasurer,
          signatureDate,
          signatureTime
        }
      });
    } catch (err) {
      console.error("Erro ao salvar automaticamente novos ministérios:", err);
    }
  };

  const handleRemoveMinisterio = async (siglaToRemove: string) => {
    if (isReadOnly) return;
    
    if (window.confirm(`Tem certeza que deseja remover o ministério "${siglaToRemove}"?`)) {
      const updatedLista = listaMinisterios.filter(m => m.sigla !== siglaToRemove);
      const updatedSaldos = { ...saldosMinisterios };
      delete updatedSaldos[siglaToRemove];

      setListaMinisterios(updatedLista);
      setSaldosMinisterios(updatedSaldos);

      try {
        await onSaveConfig({
          igreja: {
            nome,
            cnpj,
            endereco,
            pastor,
            pastorCpf,
            membrosAtivos: parseInt(String(membrosAtivos)) || 0,
            tesoureiroNome,
            tesoureiroCpf,
            tesoureiroTelefone,
            tesoureiroEmail,
            segundoTesoureiroNome,
            segundoTesoureiroTelefone,
            segundoTesoureiroEmail
          },
          configuracoes: {
            saldoInicialBancoJan: parseFloat(String(saldoJanBanco)) || 0,
            saldoInicialInvestJan: parseFloat(String(saldoJanInvest)) || 0,
            saldosIniciaisMinisterios: updatedSaldos,
            ministerios: updatedLista,
            showDigitalSignatures,
            signedByTreasurer,
            signatureDate,
            signatureTime
          }
        });
      } catch (err) {
        console.error("Erro ao salvar automaticamente a exclusão de ministério:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    setSaving(true);
    try {
      await onSaveConfig({
        igreja: {
          nome,
          cnpj,
          endereco,
          pastor,
          pastorCpf,
          membrosAtivos: parseInt(String(membrosAtivos)) || 0,
          tesoureiroNome,
          tesoureiroCpf,
          tesoureiroTelefone,
          tesoureiroEmail,
          segundoTesoureiroNome,
          segundoTesoureiroTelefone,
          segundoTesoureiroEmail
        },
        configuracoes: {
          saldoInicialBancoJan: parseFloat(String(saldoJanBanco)) || 0,
          saldoInicialInvestJan: parseFloat(String(saldoJanInvest)) || 0,
          saldosIniciaisMinisterios: saldosMinisterios,
          ministerios: listaMinisterios,
          showDigitalSignatures,
          signedByTreasurer,
          signatureDate,
          signatureTime
        }
      });
      alert("Configurações gravadas e aplicadas ao motor de fórmulas com sucesso!");
    } catch (err) {
      alert("Falha ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  // Reset database to seed
  const handleResetDB = async () => {
    if (!isAdmin) {
      alert("Apenas Administradores podem reiniciar o banco de dados.");
      return;
    }

    if (window.confirm("ATENÇÃO: Deseja redefinir os dados para os valores de demonstração originais? Todas as alterações atuais serão descartadas.")) {
      // In a real application, the parent would dispatch a reset payload to save API.
      // Let's reload page to fetch initial state or call complete endpoint
      const res = await fetch("/api/db/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }) // Back-to-default seed or we do a clean reset in window.location.reload()
      });
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 id="settings-tab-heading" className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Configurações do Sistema</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Defina o cabeçalho timbrado oficial, o cadastro demográfico de membros e os saldos de abertura para o mês de Janeiro.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Setup Forms */}
        <div className="lg:col-span-2 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Sec A: Igreja Identity */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 border-b pb-1.5 flex items-center space-x-1">
                <span>I. Identificação Estatutária da Igreja</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">Razão Social / Nome de Exibição</label>
                  <input
                    type="text"
                    required
                    disabled={isReadOnly}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CNPJ Oficial</label>
                  <input
                    type="text"
                    required
                    disabled={isReadOnly}
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="e.g. 12.345.678/0001-99"
                    className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Membros Ativos Comungantes</label>
                  <input
                    type="number"
                    required
                    disabled={isReadOnly}
                    value={membrosAtivos}
                    onChange={(e) => setMembrosAtivos(Number(e.target.value))}
                    className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Endereço Geral Completo</label>
                  <input
                    type="text"
                    required
                    disabled={isReadOnly}
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pastor Presidente Responsável</label>
                  <input
                    type="text"
                    required
                    disabled={isReadOnly}
                    value={pastor}
                    onChange={(e) => setPastor(e.target.value)}
                    className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF do Pastor Presidente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex. 000.000.000-00"
                    disabled={isReadOnly}
                    value={pastorCpf}
                    onChange={(e) => setPastorCpf(e.target.value)}
                    className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 border-t pt-4 border-slate-150 mt-2 space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Dados do Tesoureiro Oficial da Igreja</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">Nome Completo</label>
                      <input
                        type="text"
                        required
                        disabled={isReadOnly}
                        value={tesoureiroNome}
                        placeholder="Ex. João Silva"
                        onChange={(e) => setTesoureiroNome(e.target.value)}
                        className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF do Tesoureiro</label>
                      <input
                        type="text"
                        required
                        disabled={isReadOnly}
                        value={tesoureiroCpf}
                        placeholder="Ex. 000.000.000-00"
                        onChange={(e) => setTesoureiroCpf(e.target.value)}
                        className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone Celular</label>
                      <input
                        type="text"
                        required
                        disabled={isReadOnly}
                        value={tesoureiroTelefone}
                        placeholder="Ex. (24) 99999-5555"
                        onChange={(e) => setTesoureiroTelefone(e.target.value)}
                        className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
                      <input
                        type="email"
                        required
                        disabled={isReadOnly}
                        value={tesoureiroEmail}
                        placeholder="Ex. tesoureiro@igreja.org"
                        onChange={(e) => setTesoureiroEmail(e.target.value)}
                        className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 border-t pt-4 border-slate-150 mt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Dados do Segundo Tesoureiro (Opcional)</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full select-none">Se aplicável</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">Nome Completo</label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={segundoTesoureiroNome}
                        placeholder="Ex. Maria Santos"
                        onChange={(e) => setSegundoTesoureiroNome(e.target.value)}
                        className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone Celular</label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={segundoTesoureiroTelefone}
                        placeholder="Ex. (24) 98888-4444"
                        onChange={(e) => setSegundoTesoureiroTelefone(e.target.value)}
                        className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
                      <input
                        type="email"
                        disabled={isReadOnly}
                        value={segundoTesoureiroEmail}
                        placeholder="Ex. tesoureiro2@igreja.org"
                        onChange={(e) => setSegundoTesoureiroEmail(e.target.value)}
                        className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sec B: Initial Balances */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 border-b pb-1.5">
                II. Saldos Iniciais de Caixa (Abertura de Janeiro)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contas Bancárias (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isReadOnly}
                    value={saldoJanBanco}
                    onChange={(e) => setSaldoJanBanco(Number(e.target.value))}
                    className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reservas / Investimentos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isReadOnly}
                    value={saldoJanInvest}
                    onChange={(e) => setSaldoJanInvest(Number(e.target.value))}
                    className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Sec C: Initial Balances for Ministries */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                  III. Saldos Iniciais dos Ministérios Internos (Abertura de Janeiro)
                </h3>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Defina o saldo de caixa inicial em 1º de Janeiro para cada ministério interno. 
                  Esses montantes comporão o saldo inicial de cada ministério interno no balancete e serão segregados do saldo desvinculado (geral) da Igreja.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listaMinisterios.map((item) => (
                    <div key={item.sigla} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans">
                        {item.nome}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={isReadOnly}
                        value={saldosMinisterios[item.sigla] !== undefined ? saldosMinisterios[item.sigla] : ""}
                        placeholder="0,00"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setSaldosMinisterios(prev => ({
                            ...prev,
                            [item.sigla]: val
                          }));
                        }}
                        className="bg-white text-slate-800 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sec D: Manage Ministries in Settings */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                  IV. Cadastro de Ministérios Internos
                </h3>
                <p className="text-slate-500 text-[11px] leading-relaxed font-sans">
                  Adicione ou exclua os ministérios internos da Igreja. 
                  Qualquer alteração requer clicar em "Gravar Informações" ao final da página para persistir os dados definitivamente.
                </p>

                {/* List of Ministries with Delete Button */}
                <div className="space-y-2">
                  {listaMinisterios.map((item) => (
                    <div key={item.sigla} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-150 text-xs">
                      <div>
                        <span className="text-slate-650 font-bold font-sans">{item.nome}</span>
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMinisterio(item.sigla)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg font-semibold cursor-pointer flex items-center transition-all"
                          title="Excluir Ministério"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {listaMinisterios.length === 0 && (
                    <p className="text-slate-400 text-xs italic text-center py-2">Nenhum ministério cadastrado.</p>
                  )}
                </div>

                 {/* Adding new ministry form row */}
                {!isReadOnly && (
                  <div className="bg-slate-50/50 p-4 border border-dashed border-slate-200 rounded-xl space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Mapear Novo Ministério</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 font-semibold">Nome Completo do Ministério</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Nome Completo (ex: Ministério de Casais)"
                            value={novoNome}
                            onChange={(e) => setNovoNome(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddMinisterio}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold px-4 py-2 flex items-center space-x-1 whitespace-nowrap cursor-pointer transition-colors"
                          >
                            <span>Adicionar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sec V: Assinatura Digital de Balancete Oficial */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 border-b pb-1.5 flex items-center space-x-1">
                <span>V. Assinatura Digital de Balancete Oficial</span>
              </h3>
              
              <p className="text-slate-500 text-xs font-sans mt-0">
                Configure o selo digital de autenticidade contábil e e-ICP para o relatório mensal, bem como o upload de assinatura física digitalizada do Tesoureiro.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                
                {/* Toggle show signature seal */}
                <div className="md:col-span-1 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block text-[11px]">Selo de Assinatura</span>
                    <span className="text-slate-400 text-[10px] leading-relaxed block">Estampar validadores eletrônicos e-ICP</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      disabled={isReadOnly}
                      checked={showDigitalSignatures} 
                      onChange={(e) => setShowDigitalSignatures(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 transition-colors cursor-pointer"></div>
                  </label>
                </div>

                {/* Date input */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <label className="block font-bold text-slate-500 text-[10px] uppercase tracking-wider font-mono">Data da Assinatura</label>
                  <input 
                    type="date" 
                    disabled={isReadOnly}
                    value={signatureDate}
                    onChange={(e) => setSignatureDate(e.target.value)}
                    className="bg-transparent border-none text-slate-800 text-xs font-mono p-0 w-full font-semibold focus:outline-none focus:ring-0 focus:border-none"
                  />
                </div>

                {/* Time input */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <label className="block font-bold text-slate-500 text-[10px] uppercase tracking-wider font-mono">Hora da Assinatura</label>
                  <input 
                    type="time" 
                    disabled={isReadOnly}
                    value={signatureTime}
                    onChange={(e) => setSignatureTime(e.target.value)}
                    className="bg-transparent border-none text-slate-800 text-xs font-mono p-0 w-full font-semibold focus:outline-none focus:ring-0 focus:border-none"
                  />
                </div>

              </div>

              {showDigitalSignatures && (
                <div className="space-y-4 pt-1">
                  {/* Tesoureiro item */}
                  <button 
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setSignedByTreasurer(!signedByTreasurer)}
                    className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all w-full font-sans ${
                      isReadOnly ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      signedByTreasurer 
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${signedByTreasurer ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <PenTool className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-[11px] block text-slate-800">Tesoureiro: {tesoureiroNome || dbState?.igreja?.tesoureiroNome || "Tesoureiro Cadastrado"}</span>
                        <span className="text-[10px] block text-slate-400">
                          {signedByTreasurer ? '✓ Injetar assinatura digitalizada no balancete' : '✗ Deixar linha em branco para assinar físico'}
                        </span>
                      </div>
                    </div>
                     <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                      signedByTreasurer ? 'bg-emerald-600 border-emerald-700 text-white' : 'border-slate-300 bg-slate-100'
                    }`}>
                      {signedByTreasurer && <span className="text-[8px]">✓</span>}
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Apply Button */}
            {!isReadOnly && (
              <button
                type="submit"
                disabled={saving}
                className="bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-bold py-3 px-6 cursor-pointer flex items-center justify-center space-x-1.5 shadow"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>{saving ? "Salvando..." : "Gravar Informações"}</span>
              </button>
            )}

          </form>

          {/* Admin Restraint block */}
          {isAdmin && (
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-700 block">Restaurar Banco de Dados</span>
                <span className="text-slate-400 text-[10.5px]">Limpe todas as entradas customizadas e reverte para os saldos estáticos de demonstração.</span>
              </div>
              <button
                onClick={handleResetDB}
                className="bg-white border hover:bg-slate-100 text-rose-600 border-slate-200 rounded-lg text-xs font-bold py-2 px-4 cursor-pointer"
              >
                Resetar Fichas
              </button>
            </div>
          )}

        </div>

        {/* Right Side: Security Drawer */}
        <div className="space-y-6">
          
          {/* User profile details description */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold tracking-tight uppercase font-mono text-emerald-400 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Hierarquia de Perfis</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="border-b border-slate-800 pb-2.5">
                <span className="font-semibold text-blue-300">Administrador</span>
                <p className="text-slate-400 mt-1 leading-relaxed">Acesso integral sem restrições. Permite alterar cadastros de identidade da Igreja, saldos de Janeiro, excluir ou editar quaisquer dízimos de membros e excluir relatórios.</p>
              </div>

              <div className="border-b border-slate-800 pb-2.5">
                <span className="font-semibold text-teal-400">Tesoureiro</span>
                <p className="text-slate-400 mt-1 leading-relaxed">Responsável técnico operacional. Insere e altera lançamentos contábeis e dízimos. Não possui permissão para apagar dados cruciais de abertura ou alterar membros ativos cadastrados.</p>
              </div>

              <div>
                <span className="font-semibold text-amber-400">Consulta (Read-Only)</span>
                <p className="text-slate-400 mt-1 leading-relaxed">Membro do conselho ou auditor presbiterial. Possui acesso total e irrestrito para visualização de relatórios, dízimos, matriz geral de consolidação e exportações. Edições e criações bloqueadas.</p>
              </div>
            </div>

            <div className="pt-2">
              <span className="bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono py-1.5 px-2.5 rounded-lg block text-center uppercase tracking-wide">
                Troque seu perfil no cabeçalho
              </span>
            </div>
          </div>

          {/* Current Session Banner */}
          <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider">Status da Conexão</h4>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="font-semibold text-slate-800 uppercase tracking-wide">Seguro - BD Ativo</span>
            </div>
            <p className="text-slate-450 leading-relaxed text-[11px]">Seu banco de dados local está sendo persistido de forma segura no servidor da nuvem, de modo que suas modificações estarão salvas para acessos futuros.</p>
          </div>

          {/* Backup & Safety Card */}
          <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-slate-500" />
              <span>Cópia de Segurança / Backup</span>
            </h4>
            
            <p className="text-slate-450 leading-relaxed text-[11px]">
              O tesoureiro pode baixar uma cópia local de segurança completa do banco de dados (JSON). Esse arquivo contém todo o histórico de lançamentos, dízimos e parametrizações, garantindo total integridade e rastreabilidade histórica.
            </p>

            <div className="pt-2 space-y-3">
              {/* Export Backup Button */}
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer flex items-center justify-center space-x-2 shadow-sm transition-colors"
                id="btn-export-backup-json"
              >
                <Download className="w-4 h-4 text-teal-400" />
                <span>Exportar Backup (JSON)</span>
              </button>

              {/* Import/Restore Backup Button */}
              {!isReadOnly && (
                <div className="space-y-2 border-t border-dashed border-slate-100 pt-3">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Restaurar Cópia</span>
                  <label
                    htmlFor="upload-backup-json"
                    className="w-full bg-white hover:bg-slate-50 text-slate-755 border border-slate-200 rounded-xl text-xs font-semibold py-2.5 px-4 cursor-pointer flex items-center justify-center space-x-2 transition-colors text-center"
                    id="lbl-import-backup-json"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{importing ? "Restaurando..." : "Selecionar e Restaurar"}</span>
                  </label>
                  <input
                    type="file"
                    id="upload-backup-json"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                    disabled={importing}
                  />
                  <span className="text-[9.5px] text-slate-450 block text-center leading-normal">
                    Recomendado para restabelecer os dados a um estado anterior íntegro.
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
