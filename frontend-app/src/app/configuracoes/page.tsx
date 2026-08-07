'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  Clock,
  Download,
  Gavel,
  Info,
  KeyRound,
  ListChecks,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  UserCircle,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { EquipeAba } from '@/components/configuracoes/EquipeAba';
import { ChecklistsAba } from '@/components/configuracoes/ChecklistsAba';
import { DecisoesAba } from '@/components/configuracoes/DecisoesAba';
import { OabsMonitoradasCartao } from '@/components/configuracoes/OabsMonitoradasCartao';
import {
  alterarSenha,
  atualizarPerfil,
  atualizarTenant,
  buscarPerfil,
  buscarTenant,
  enviarFotoPerfil,
  enviarLogoEscritorio,
  exportarMeusDados,
  usoMesIa,
  listarAuditoria,
  salvarSessao,
  tenantLogado,
  usuarioLogado,
  type PerfilUsuario,
  type LogAuditoria,
  type Tenant,
} from '@/lib/api';
import { cn } from '@/lib/cn';

type SecaoConfig = 'conta' | 'escritorio' | 'equipe' | 'checklists' | 'decisoes' | 'auditoria' | 'aparencia' | 'sobre';

const LABEL_PERFIL: Record<PerfilUsuario, string> = { admin: 'Admin', advogado: 'Advogado(a)', assistente: 'Assistente' };

export default function ConfiguracoesPage() {
  const [secao, setSecao] = useState<SecaoConfig>('conta');
  const usuario = usuarioLogado();
  const ehAdmin = usuario?.perfil === 'admin';

  const NAV: { id: SecaoConfig; icon: typeof UserCircle; label: string; adminOnly: boolean }[] = [
    { id: 'conta', icon: UserCircle, label: 'Conta', adminOnly: false },
    { id: 'escritorio', icon: Building2, label: 'Escritório', adminOnly: true },
    { id: 'equipe', icon: UsersIcon, label: 'Equipe', adminOnly: true },
    { id: 'checklists', icon: ListChecks, label: 'Checklists', adminOnly: true },
    { id: 'decisoes', icon: Gavel, label: 'Aprovações', adminOnly: false },
    { id: 'auditoria', icon: ShieldCheck, label: 'Auditoria', adminOnly: true },
    { id: 'aparencia', icon: Palette, label: 'Aparência', adminOnly: false },
    { id: 'sobre', icon: Info, label: 'Sobre', adminOnly: false },
  ];
  const visiveis = NAV.filter((n) => !n.adminOnly || ehAdmin);

  return (
    <>
      <Topbar titulo="Configurações" subtitulo="Conta, escritório e preferências" />

      <main className="flex-1 px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-48 shrink-0">
            <nav className="space-y-0.5">
              {visiveis.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setSecao(id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                    secao === id
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 min-w-0 max-w-2xl">
            {secao === 'conta' && <ContaSecao />}
            {secao === 'escritorio' && ehAdmin && <EscritorioSecao />}
            {secao === 'equipe' && ehAdmin && <EquipeAba />}
            {secao === 'checklists' && ehAdmin && <ChecklistsAba />}
            {secao === 'decisoes' && <DecisoesAba />}
            {secao === 'auditoria' && ehAdmin && <AuditoriaSecao />}
            {secao === 'aparencia' && <AparenciaSecao />}
            {secao === 'sobre' && <SobreSecao />}
          </div>
        </div>
      </main>
    </>
  );
}

function Cartao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</p>
      {subtitulo && <p className="text-xs text-gray-400 mt-0.5 mb-4">{subtitulo}</p>}
      {!subtitulo && <div className="mb-4" />}
      {children}
    </div>
  );
}

function ContaSecao() {
  const sessao = usuarioLogado();
  const [nome, setNome] = useState(sessao?.nome ?? '');
  const [oab, setOab] = useState(sessao?.oab ?? '');
  const [fotoUrl, setFotoUrl] = useState(sessao?.foto_url ?? '');
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [novaEspecialidade, setNovaEspecialidade] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [okPerfil, setOkPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);

  useEffect(() => {
    buscarPerfil()
      .then((u) => {
        setEspecialidades(u.especialidades ?? []);
        if (u.foto_url) setFotoUrl(u.foto_url);
      })
      .catch(() => undefined);
  }, []);

  const escolherFoto = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setEnviandoFoto(true);
    setErroFoto(null);
    try {
      const atualizado = await enviarFotoPerfil(arquivo);
      setFotoUrl(atualizado.foto_url ?? '');
      const tenant = tenantLogado();
      const token = localStorage.getItem('trilva_token');
      if (tenant && token && sessao) {
        salvarSessao({ token, usuario: { ...sessao, foto_url: atualizado.foto_url }, tenant });
      }
    } catch (err) {
      setErroFoto(err instanceof Error ? err.message : 'erro ao enviar foto');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const adicionarEspecialidade = () => {
    const valor = novaEspecialidade.trim();
    if (!valor || especialidades.includes(valor)) return;
    setEspecialidades([...especialidades, valor]);
    setNovaEspecialidade('');
  };

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [okSenha, setOkSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  const salvarPerfil = async () => {
    setSalvandoPerfil(true);
    setErroPerfil(null);
    setOkPerfil(false);
    try {
      await atualizarPerfil({ nome, oab: oab || undefined, especialidades });
      const tenant = tenantLogado();
      const token = localStorage.getItem('trilva_token');
      if (tenant && token) {
        salvarSessao({ token, usuario: { ...(sessao!), nome, oab, foto_url: fotoUrl || undefined }, tenant });
      }
      setOkPerfil(true);
      setTimeout(() => setOkPerfil(false), 2500);
    } catch (err) {
      setErroPerfil(err instanceof Error ? err.message : 'erro ao salvar perfil');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const salvarSenha = async () => {
    if (novaSenha.length < 8) {
      setErroSenha('Nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setSalvandoSenha(true);
    setErroSenha(null);
    setOkSenha(false);
    try {
      await alterarSenha(senhaAtual, novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setOkSenha(true);
      setTimeout(() => setOkSenha(false), 2500);
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : 'erro ao trocar senha');
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <div className="space-y-5">
      <Cartao titulo="Perfil">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt="" className="w-14 h-14 rounded-full object-cover shrink-0 border border-gray-100 dark:border-gray-800" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                {nome.charAt(0).toUpperCase() || '—'}
              </div>
            )}
            <div className="flex-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Foto de perfil</span>
              <label className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                {enviandoFoto ? 'Enviando…' : 'Escolher imagem'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => escolherFoto(e.target.files?.[0])}
                  disabled={enviandoFoto}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-gray-400 mt-1">PNG, JPEG, WEBP ou GIF — até 5MB</p>
              {erroFoto && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{erroFoto}</p>}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">E-mail</span>
              <input
                value={sessao?.email ?? ''}
                disabled
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-gray-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">OAB</span>
              <input
                value={oab}
                onChange={(e) => setOab(e.target.value)}
                placeholder="123456/SP"
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>
          <p className="text-xs text-gray-400">
            Perfil: <span className="font-medium text-gray-600 dark:text-gray-300">{sessao ? LABEL_PERFIL[sessao.perfil] : ''}</span>
          </p>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Especialidades</span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {especialidades.map((esp) => (
                <span
                  key={esp}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                >
                  {esp}
                  <button
                    onClick={() => setEspecialidades(especialidades.filter((e) => e !== esp))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={novaEspecialidade}
                onChange={(e) => setNovaEspecialidade(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarEspecialidade();
                  }
                }}
                placeholder="Ex.: Direito Trabalhista"
                className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={adicionarEspecialidade}
                className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Adicionar
              </button>
            </div>
          </label>

          {erroPerfil && <p className="text-xs text-red-600 dark:text-red-400">{erroPerfil}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={salvarPerfil}
              disabled={salvandoPerfil}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            >
              {salvandoPerfil ? 'Salvando…' : 'Salvar'}
            </button>
            {okPerfil && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check size={13} /> Salvo
              </span>
            )}
          </div>
        </div>
      </Cartao>

      <Cartao titulo="Senha" subtitulo="Troque sua senha de acesso">
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Senha atual</span>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nova senha (mín. 8 caracteres)</span>
            <input
              type="password"
              minLength={8}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          {erroSenha && <p className="text-xs text-red-600 dark:text-red-400">{erroSenha}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={salvarSenha}
              disabled={salvandoSenha || !senhaAtual || !novaSenha}
              className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            >
              <KeyRound size={14} /> {salvandoSenha ? 'Trocando…' : 'Trocar senha'}
            </button>
            {okSenha && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check size={13} /> Senha alterada
              </span>
            )}
          </div>
        </div>
      </Cartao>

      <OabsMonitoradasCartao />
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  trial: { label: 'Período de teste', cor: 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800' },
  ativo: { label: 'Ativo', cor: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
  suspenso: { label: 'Suspenso', cor: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  cancelado: { label: 'Cancelado', cor: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
};

const LABEL_ACAO: Record<string, string> = { criar: 'Criou', atualizar: 'Atualizou', excluir: 'Excluiu' };
const LABEL_ENTIDADE: Record<string, string> = {
  cliente: 'cliente',
  processo: 'processo',
  lancamento: 'lançamento',
  usuario: 'usuário',
  tarefa: 'tarefa',
};
const COR_ACAO: Record<string, string> = {
  criar: 'text-green-600 dark:text-green-400',
  atualizar: 'text-brand-600 dark:text-brand-400',
  excluir: 'text-red-600 dark:text-red-400',
};

function AuditoriaSecao() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [entidadeFiltro, setEntidadeFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listarAuditoria({ entidade: entidadeFiltro || undefined })
      .then(setLogs)
      .catch((err) => setErro(err instanceof Error ? err.message : 'erro ao carregar auditoria'))
      .finally(() => setLoading(false));
  }, [entidadeFiltro]);

  return (
    <Cartao titulo="Trilha de auditoria" subtitulo="Quem criou, editou ou excluiu registros neste escritório">
      <div className="mb-4">
        <select
          value={entidadeFiltro}
          onChange={(e) => setEntidadeFiltro(e.target.value)}
          className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-700 dark:text-gray-300"
        >
          <option value="">Todos os tipos</option>
          <option value="cliente">Clientes</option>
          <option value="processo">Processos</option>
          <option value="lancamento">Financeiro</option>
          <option value="usuario">Usuários</option>
        </select>
      </div>

      {erro && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{erro}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum registro de auditoria ainda.</p>
      ) : (
        <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
          {logs.map((log) => (
            <li key={log._id} className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2.5 text-sm">
              <span className={cn('font-medium shrink-0', COR_ACAO[log.acao])}>{LABEL_ACAO[log.acao] ?? log.acao}</span>
              <span className="text-gray-600 dark:text-gray-300 truncate flex-1">
                {LABEL_ENTIDADE[log.entidade] ?? log.entidade}
                {log.descricao ? ` — ${log.descricao}` : ''}
              </span>
              <span className="text-xs text-gray-400 shrink-0">{log.usuario_email}</span>
              <span className="text-xs text-gray-400 shrink-0">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

function EscritorioSecao() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [nomeEscritorio, setNomeEscritorio] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

  useEffect(() => {
    buscarTenant()
      .then((t) => {
        setTenant(t);
        setNomeEscritorio(t.nome_escritorio);
        setCnpj(t.cnpj ?? '');
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'erro ao carregar escritório'))
      .finally(() => setLoading(false));
  }, []);

  const escolherLogo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setEnviandoLogo(true);
    setErroLogo(null);
    try {
      const atualizado = await enviarLogoEscritorio(arquivo);
      setTenant(atualizado);
    } catch (err) {
      setErroLogo(err instanceof Error ? err.message : 'erro ao enviar logo');
    } finally {
      setEnviandoLogo(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    setOk(false);
    try {
      const atualizado = await atualizarTenant({ nome_escritorio: nomeEscritorio, cnpj: cnpj || undefined });
      setTenant(atualizado);
      localStorage.setItem(
        'trilva_tenant',
        JSON.stringify({ id: atualizado._id, nome_escritorio: atualizado.nome_escritorio, status: atualizado.status }),
      );
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar escritório');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Carregando…</p>;

  const statusInfo = tenant ? STATUS_LABEL[tenant.status] : undefined;

  return (
    <div className="space-y-5">
      <Cartao titulo="Dados do escritório">
        <div className="space-y-4">
          {statusInfo && (
            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', statusInfo.cor)}>
              {statusInfo.label}
            </span>
          )}

          {tenant?.status === 'trial' && tenant.trial_expires_at && (
            <p className="text-xs text-gray-400">
              Teste expira em {new Date(tenant.trial_expires_at).toLocaleDateString('pt-BR')}
            </p>
          )}

          <div className="flex items-center gap-4">
            {tenant?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-800" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-brand-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                {nomeEscritorio.charAt(0).toUpperCase() || '—'}
              </div>
            )}
            <div className="flex-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Logo do escritório</span>
              <label className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                {enviandoLogo ? 'Enviando…' : 'Escolher imagem'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => escolherLogo(e.target.files?.[0])}
                  disabled={enviandoLogo}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-gray-400 mt-1">PNG, JPEG, WEBP ou GIF — até 5MB</p>
              {erroLogo && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{erroLogo}</p>}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nome do escritório</span>
            <input
              value={nomeEscritorio}
              onChange={(e) => setNomeEscritorio(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">CNPJ (opcional)</span>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={salvar}
              disabled={salvando}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            {ok && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check size={13} /> Salvo
              </span>
            )}
          </div>
        </div>
      </Cartao>

      <ExportarDadosCartao />
      <UsoIaCartao />
    </div>
  );
}

function UsoIaCartao() {
  const [uso, setUso] = useState<{ contagem: number; limite: number } | null>(null);

  useEffect(() => {
    usoMesIa()
      .then(setUso)
      .catch(() => setUso(null));
  }, []);

  if (!uso) return null;

  const percentual = Math.min(100, Math.round((uso.contagem / uso.limite) * 100));
  const perto = percentual >= 80;

  return (
    <Cartao titulo="Uso de IA este mês" subtitulo="Chamadas ao Copiloto IA (Claude) usadas pelo escritório no mês atual">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-700 dark:text-gray-300">
          {uso.contagem} / {uso.limite} chamadas
        </span>
        <span className={perto ? 'text-critical-600 dark:text-critical-400' : 'text-gray-400'}>{percentual}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${perto ? 'bg-critical-500' : 'bg-brand-500'}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </Cartao>
  );
}

function ExportarDadosCartao() {
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const exportar = async () => {
    setExportando(true);
    setErro(null);
    try {
      const dados = await exportarMeusDados();
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trilva-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao exportar dados');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Cartao titulo="Exportar meus dados" subtitulo="LGPD — baixe uma cópia de todos os dados do escritório em JSON">
      <div className="flex items-center gap-2">
        <button
          onClick={exportar}
          disabled={exportando}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
        >
          <Download size={14} /> {exportando ? 'Gerando…' : 'Baixar dados (.json)'}
        </button>
        {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Inclui clientes, processos, tarefas e lançamentos financeiros cadastrados neste escritório.
      </p>
    </Cartao>
  );
}

type ModoTema = 'light' | 'dark' | 'auto';

function ehHorarioNoturno() {
  const hora = new Date().getHours();
  return hora >= 19 || hora < 7;
}

function AparenciaSecao() {
  const [modo, setModo] = useState<ModoTema>('light');

  useEffect(() => {
    const salvo = localStorage.getItem('trilva-theme');
    setModo(salvo === 'dark' || salvo === 'auto' ? salvo : 'light');
  }, []);

  const escolher = (novoModo: ModoTema) => {
    setModo(novoModo);
    const escuro = novoModo === 'dark' || (novoModo === 'auto' && ehHorarioNoturno());
    document.documentElement.classList.toggle('dark', escuro);
    localStorage.setItem('trilva-theme', novoModo);
  };

  const opcoes: { valor: ModoTema; label: string; icone: typeof Sun }[] = [
    { valor: 'light', label: 'Claro', icone: Sun },
    { valor: 'dark', label: 'Escuro', icone: Moon },
    { valor: 'auto', label: 'Automático', icone: Clock },
  ];

  return (
    <Cartao titulo="Tema" subtitulo="Escolha entre claro, escuro ou automático por horário">
      <div className="grid grid-cols-3 gap-3 max-w-md">
        {opcoes.map(({ valor, label, icone: Icone }) => (
          <button
            key={valor}
            onClick={() => escolher(valor)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors',
              modo === valor ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-800',
            )}
          >
            <Icone size={20} className={modo === valor ? 'text-brand-600' : 'text-gray-400'} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          </button>
        ))}
      </div>
      {modo === 'auto' && (
        <p className="text-xs text-gray-400 mt-3">Fica escuro automaticamente das 19h às 7h.</p>
      )}
    </Cartao>
  );
}

function SobreSecao() {
  return (
    <Cartao titulo="Sobre o Trilva">
      <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
        <p>Plataforma de gestão para escritórios de advocacia.</p>
        <p className="text-xs text-gray-400">Versão 1.0.0</p>
      </div>
    </Cartao>
  );
}
