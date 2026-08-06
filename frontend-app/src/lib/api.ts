export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const TOKEN_KEY = 'trilva_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function limparSessao() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('trilva_usuario');
  localStorage.removeItem('trilva_tenant');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    limparSessao();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada, faça login novamente.');
  }
  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${texto || res.statusText}`);
  }
  return res.json();
}

export type PerfilUsuario = 'admin' | 'advogado' | 'assistente';

export type SessaoUsuario = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  oab?: string;
  foto_url?: string;
};
export type SessaoTenant = { id: string; nome_escritorio: string; status: string };
export type Sessao = { token: string; usuario: SessaoUsuario; tenant: SessaoTenant };

export function registrarEscritorio(dto: {
  nome_escritorio: string;
  cnpj?: string;
  nome_admin: string;
  email: string;
  senha: string;
}) {
  return request<Sessao>('/auth/registro', { method: 'POST', body: JSON.stringify(dto) });
}

export function login(email: string, senha: string) {
  return request<Sessao>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
}

export function usuarioLogado(): SessaoUsuario | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('trilva_usuario');
  return raw ? JSON.parse(raw) : null;
}

export function tenantLogado(): SessaoTenant | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('trilva_tenant');
  return raw ? JSON.parse(raw) : null;
}

export function salvarSessao(sessao: Sessao) {
  setToken(sessao.token);
  localStorage.setItem('trilva_usuario', JSON.stringify(sessao.usuario));
  localStorage.setItem('trilva_tenant', JSON.stringify(sessao.tenant));
}

export type Usuario = {
  _id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  oab?: string;
  status: 'ativo' | 'inativo' | 'convidado';
  grupo_id?: string;
  time_id?: string;
  foto_url?: string;
  especialidades?: string[];
};

export function listarUsuarios() {
  return request<Usuario[]>('/usuarios');
}

export function convidarUsuario(dto: { nome: string; email: string; senha: string; perfil: PerfilUsuario; oab?: string }) {
  return request<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(dto) });
}

export function atualizarUsuario(
  id: string,
  dto: Partial<Pick<Usuario, 'nome' | 'perfil' | 'oab' | 'status'>> & { grupo_id?: string | null; time_id?: string | null },
) {
  return request<Usuario>(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export const CATALOGO_PERMISSOES = [
  'financeiro.gerenciar',
  'processos.excluir',
  'clientes.excluir',
  'tarefas.gerenciar_todas',
  'equipe.gerenciar',
  'escritorio.editar',
  'terceirizacao.gerenciar',
] as const;

export type PermissaoChave = (typeof CATALOGO_PERMISSOES)[number];

export const LABEL_PERMISSAO: Record<PermissaoChave, string> = {
  'financeiro.gerenciar': 'Gerenciar Financeiro',
  'processos.excluir': 'Excluir processos',
  'clientes.excluir': 'Excluir clientes',
  'tarefas.gerenciar_todas': 'Gerenciar tarefas de todos',
  'equipe.gerenciar': 'Gerenciar equipe (convidar/editar/desativar)',
  'escritorio.editar': 'Editar dados do escritório',
  'terceirizacao.gerenciar': 'Gerenciar terceirização',
};

export type Grupo = {
  _id: string;
  nome: string;
  permissoes: PermissaoChave[];
};

export function listarGrupos() {
  return request<Grupo[]>('/grupos');
}

export function criarGrupo(dto: { nome: string; permissoes?: PermissaoChave[] }) {
  return request<Grupo>('/grupos', { method: 'POST', body: JSON.stringify(dto) });
}

export function atualizarGrupo(id: string, dto: { nome?: string; permissoes?: PermissaoChave[] }) {
  return request<Grupo>(`/grupos/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function excluirGrupo(id: string) {
  return request<{ ok: boolean }>(`/grupos/${id}`, { method: 'DELETE' });
}

export type TimeTrabalho = {
  _id: string;
  nome: string;
  cor?: string;
  membros: string[];
};

export function listarTimes() {
  return request<TimeTrabalho[]>('/times');
}

export function criarTime(dto: { nome: string; cor?: string; membros?: string[] }) {
  return request<TimeTrabalho>('/times', { method: 'POST', body: JSON.stringify(dto) });
}

export function atualizarTime(id: string, dto: { nome?: string; cor?: string; membros?: string[] }) {
  return request<TimeTrabalho>(`/times/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function excluirTime(id: string) {
  return request<{ ok: boolean }>(`/times/${id}`, { method: 'DELETE' });
}

export function removerUsuario(id: string) {
  return request<Usuario>(`/usuarios/${id}`, { method: 'DELETE' });
}

export type TenantStatus = 'trial' | 'ativo' | 'suspenso' | 'cancelado';

export type Tenant = {
  _id: string;
  nome_escritorio: string;
  cnpj?: string;
  status: TenantStatus;
  trial_expires_at?: string;
};

export function buscarTenant() {
  return request<Tenant>('/auth/tenant');
}

export function exportarMeusDados() {
  return request<{
    geradoEm: string;
    clientes: unknown[];
    processos: unknown[];
    tarefas: unknown[];
    lancamentos: unknown[];
  }>('/exportacao/meus-dados');
}

export function atualizarTenant(dto: { nome_escritorio?: string; cnpj?: string }) {
  return request<Tenant>('/auth/tenant', { method: 'PATCH', body: JSON.stringify(dto) });
}

export function buscarPerfil() {
  return request<Usuario>('/auth/perfil');
}

export function atualizarPerfil(dto: { nome?: string; oab?: string; foto_url?: string; especialidades?: string[] }) {
  return request<Usuario>('/auth/perfil', { method: 'PATCH', body: JSON.stringify(dto) });
}

export function alterarSenha(senhaAtual: string, novaSenha: string) {
  return request<{ ok: boolean }>('/auth/senha', { method: 'PATCH', body: JSON.stringify({ senhaAtual, novaSenha }) });
}

export type Classificacao =
  | 'audiencia'
  | 'sentenca'
  | 'decisao'
  | 'despacho'
  | 'citacao'
  | 'prazo'
  | 'embargos'
  | 'recurso'
  | 'penhora_bloqueio'
  | 'outro';

export type Publicacao = {
  _id: string;
  tribunal?: string;
  numero_processo: string;
  data_disponibilizacao: string;
  tipo_comunicacao?: string;
  nome_orgao?: string;
  inteiro_teor_texto?: string;
  inteiro_teor_pdf_url?: string;
  classe_processual?: string;
  numero_comunicacao?: number;
  meio?: string;
  advogados_destinatarios: { nome: string; numero_oab?: string; uf_oab?: string }[];
  status: 'nao_lida' | 'lida' | 'triada' | 'vinculada' | 'arquivada';
  urgencia: 'baixa' | 'media' | 'alta' | 'critica';
  classificacao: Classificacao;
  prazo_dias?: number;
  prazo_data_limite?: string;
  audiencia_data?: string;
  parte_ativa?: string;
  parte_passiva?: string;
  tags: string[];
};

export type AgendaEvento = {
  tipo: 'audiencia' | 'prazo';
  data: string;
  publicacao_id: string;
  numero_processo: string;
  tribunal?: string;
  nome_orgao?: string;
  titulo: string;
  urgencia: string;
  status: string;
  resumo?: string;
  advogados: string[];
};

export type ListaPublicacoesResposta = {
  itens: Publicacao[];
  total: number;
  pagina: number;
  totalPaginas: number;
  filtrosDisponiveis: { tribunais: string[]; tipos: string[] };
};

export type ResumoPublicacoes = {
  total: number;
  naoLidas: number;
  urgentes: number;
  hoje: number;
  semana: number;
};

export type FiltrosPublicacoes = {
  status?: string;
  urgencia?: string;
  tribunal?: string;
  tipoComunicacao?: string;
  classificacao?: string;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  limite?: number;
};

export function listarPublicacoes(filtros: FiltrosPublicacoes) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== '') params.set(chave, String(valor));
  });
  return request<ListaPublicacoesResposta>(`/publicacoes?${params.toString()}`);
}

export function buscarResumo() {
  return request<ResumoPublicacoes>('/publicacoes/resumo');
}

export function puxarNovasPublicacoes() {
  return request<unknown>('/publicacoes/pull-todos', { method: 'POST' });
}

export type Movimentacao = { data: string; descricao: string; codigo?: number };

export type TipoHonorario = 'fixo' | 'percentual' | 'exito' | 'misto';

export type Honorarios = {
  tipo?: TipoHonorario;
  valor_fixo?: number;
  percentual?: number;
  observacoes?: string;
};

export type Processo = {
  _id: string;
  numero_cnj: string;
  tribunal?: string;
  grau?: string;
  classe?: string;
  assuntos: string[];
  orgao_julgador?: string;
  parte_ativa?: string;
  parte_passiva?: string;
  cliente_id?: string;
  data_ajuizamento?: string;
  valor_causa?: number;
  status: string;
  movimentacoes: Movimentacao[];
  datajud_atualizado_em?: string;
  provisorio: boolean;
  proxima_audiencia?: string;
  fase_processual?: string;
  advogado_parte_contraria?: string;
  observacoes?: string;
  honorarios?: Honorarios;
};

export type AtualizarProcesso = {
  fase_processual?: string;
  advogado_parte_contraria?: string;
  observacoes?: string;
  honorarios?: Honorarios;
};

export type FiltrosProcessos = {
  tribunal?: string;
  classe?: string;
  status?: string;
  busca?: string;
  ordenacao?: string;
};

export type ListaProcessosResposta = {
  itens: Processo[];
  filtrosDisponiveis: { tribunais: string[]; classes: string[] };
};

export function listarProcessos(filtros: FiltrosProcessos = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) params.set(chave, valor);
  });
  const query = params.toString();
  return request<ListaProcessosResposta>(`/processos${query ? `?${query}` : ''}`);
}

export function buscarProcesso(numeroCnj: string) {
  return request<Processo>(`/processos/${numeroCnj}`);
}

export function atualizarProcesso(numeroCnj: string, dto: AtualizarProcesso) {
  return request<Processo>(`/processos/${numeroCnj}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export type DocumentoProcesso = {
  _id: string;
  nome: string;
  tipo: string;
  mime: string;
  tamanho_bytes: number;
  created_at: string;
};

/** Escopo de arquivos: um processo OU um cliente (documentos do cliente nascem antes
 * de existir processo, entao os dois precisam funcionar de forma independente). */
export type EscopoArquivos = { numeroProcesso: string; clienteId?: never } | { clienteId: string; numeroProcesso?: never };

function paramsDoEscopo(escopo: EscopoArquivos): Record<string, string> {
  return escopo.numeroProcesso ? { numeroProcesso: escopo.numeroProcesso } : { clienteId: escopo.clienteId! };
}

export function listarDocumentos(
  escopo: EscopoArquivos,
  opcoes: { movimentacaoChave?: string; pastaId?: string } = {},
) {
  const params = new URLSearchParams(paramsDoEscopo(escopo));
  if (opcoes.movimentacaoChave) params.set('movimentacaoChave', opcoes.movimentacaoChave);
  if (opcoes.pastaId !== undefined) params.set('pastaId', opcoes.pastaId);
  return request<DocumentoProcesso[]>(`/documentos?${params.toString()}`);
}

export type Pasta = { _id: string; nome: string; pasta_pai_id?: string };

export function listarPastas(escopo: EscopoArquivos, pastaPaiId?: string) {
  const params = new URLSearchParams(paramsDoEscopo(escopo));
  if (pastaPaiId) params.set('pastaPaiId', pastaPaiId);
  return request<Pasta[]>(`/pastas?${params.toString()}`);
}

export function criarPasta(escopo: EscopoArquivos, nome: string, pastaPaiId?: string) {
  return request<Pasta>('/pastas', {
    method: 'POST',
    body: JSON.stringify({ ...escopo, nome, pastaPaiId }),
  });
}

export function excluirPasta(id: string) {
  return request<{ ok: boolean } | { erro: string }>(`/pastas/${id}`, { method: 'DELETE' });
}

export type Endereco = {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

export type EstadoCivil = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel';

export type Cliente = {
  _id: string;
  tipo: 'pf' | 'pj';
  nome: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  status: 'ativo' | 'inativo' | 'prospect';
  profissao?: string;
  estado_civil?: EstadoCivil;
  razao_social?: string;
  nome_fantasia?: string;
  observacoes?: string;
  origem_lead?: string;
  endereco?: Endereco;
};

export type NovoCliente = {
  tipo: 'pf' | 'pj';
  nome: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  profissao?: string;
  estado_civil?: EstadoCivil;
  razao_social?: string;
  nome_fantasia?: string;
  observacoes?: string;
  origem_lead?: string;
  endereco?: Endereco;
};

export function listarClientes(busca?: string) {
  const params = new URLSearchParams();
  if (busca) params.set('busca', busca);
  const query = params.toString();
  return request<Cliente[]>(`/clientes${query ? `?${query}` : ''}`);
}

export function criarCliente(dto: NovoCliente) {
  return request<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(dto) });
}

export function verificarConflitosCliente(id: string) {
  return request<{ numeroCnj: string; clienteConflitante: { id: string; nome: string } }[]>(`/clientes/${id}/conflitos`);
}

export function buscarCliente(id: string) {
  return request<Cliente>(`/clientes/${id}`);
}

export function atualizarCliente(id: string, dto: Partial<NovoCliente & { status: Cliente['status'] }>) {
  return request<Cliente>(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function excluirCliente(id: string) {
  return request<{ ok: boolean } | { erro: string }>(`/clientes/${id}`, { method: 'DELETE' });
}

export type StatusTarefa = 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';

export type Tarefa = {
  _id: string;
  titulo: string;
  descricao?: string;
  publicacao_id?: string;
  numero_processo?: string;
  responsavel_id?: string;
  data_vencimento: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  status: StatusTarefa;
  origem: 'manual' | 'prazo_publicacao' | 'audiencia_publicacao';
  concluida_em?: string;
};

export function calcularPrazo(dto: { data_inicial: string; dias: number; tipo: 'uteis' | 'corridos'; considerar_recesso?: boolean }) {
  return request<{ data_fatal: string }>('/prazos/calcular', { method: 'POST', body: JSON.stringify(dto) });
}

export function listarTarefas(
  filtros: { status?: string; responsavelId?: string; numeroProcesso?: string; atrasadas?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.responsavelId) params.set('responsavelId', filtros.responsavelId);
  if (filtros.numeroProcesso) params.set('numeroProcesso', filtros.numeroProcesso);
  if (filtros.atrasadas) params.set('atrasadas', 'true');
  const query = params.toString();
  return request<Tarefa[]>(`/tarefas${query ? `?${query}` : ''}`);
}

export function minhasTarefas() {
  return request<Tarefa[]>('/tarefas/minhas');
}

export function criarTarefa(dto: {
  titulo: string;
  descricao?: string;
  data_vencimento: string;
  prioridade?: string;
  responsavel_id?: string;
  numero_processo?: string;
}) {
  return request<Tarefa>('/tarefas', { method: 'POST', body: JSON.stringify(dto) });
}

export function atualizarTarefa(
  id: string,
  dto: {
    titulo?: string;
    descricao?: string;
    data_vencimento?: string;
    status?: string;
    prioridade?: string;
    responsavel_id?: string;
    numero_processo?: string;
  },
) {
  return request<Tarefa>(`/tarefas/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function excluirTarefa(id: string) {
  return request<{ ok: boolean }>(`/tarefas/${id}`, { method: 'DELETE' });
}

export function processosDoCliente(clienteId: string) {
  return request<Processo[]>(`/clientes/${clienteId}/processos`);
}

export function documentosDosProcessosDoCliente(clienteId: string) {
  return request<DocumentoProcesso[]>(`/clientes/${clienteId}/documentos`);
}

export function vincularProcessoAoCliente(clienteId: string, numeroCnj: string) {
  return request<Processo>(`/clientes/${clienteId}/processos`, {
    method: 'POST',
    body: JSON.stringify({ numeroCnj }),
  });
}

export function desvincularProcessoDoCliente(clienteId: string, numeroCnj: string) {
  return request<Processo>(`/clientes/${clienteId}/processos/${numeroCnj}`, { method: 'DELETE' });
}

/** Chave estavel de uma movimentacao (nao tem id proprio - vem de um array reescrito
 * a cada enriquecimento do DataJud), usada para anexar documentos a ela especificamente. */
export function chaveMovimentacao(m: { data: string; descricao: string }): string {
  return `${m.data}|${m.descricao}`;
}

export async function enviarDocumento(
  escopo: EscopoArquivos,
  arquivo: File,
  opcoes: { movimentacaoChave?: string; pastaId?: string } = {},
): Promise<DocumentoProcesso> {
  const form = new FormData();
  form.append('arquivo', arquivo);
  const params = new URLSearchParams(paramsDoEscopo(escopo));
  if (opcoes.movimentacaoChave) params.set('movimentacaoChave', opcoes.movimentacaoChave);
  if (opcoes.pastaId) params.set('pastaId', opcoes.pastaId);
  const token = getToken();
  const res = await fetch(`${API_URL}/documentos/upload?${params.toString()}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) throw new Error(`Falha no upload (${res.status})`);
  return res.json();
}

export async function baixarDocumento(id: string): Promise<{ url: string; nome: string }> {
  return request(`/documentos/${id}/download`);
}

export function excluirDocumento(id: string) {
  return request<{ ok: boolean }>(`/documentos/${id}`, { method: 'DELETE' });
}

export function buscarPublicacao(id: string) {
  return request<Publicacao>(`/publicacoes/${id}`);
}

export type TipoMonitoramento = 'oab' | 'cpf' | 'cnpj' | 'processo';

export type Monitoramento = {
  _id: string;
  tipo: TipoMonitoramento;
  valor: string;
  oab_uf?: string;
  ativo: boolean;
  ultima_execucao_em?: string;
  ultima_execucao_status?: 'sucesso' | 'erro';
  ultima_execucao_mensagem?: string;
};

export function listarMonitoramentos() {
  return request<Monitoramento[]>('/publicacoes/monitoramentos');
}

export function criarMonitoramentoOab(numeroOab: string, ufOab: string) {
  return request<Monitoramento>('/publicacoes/monitoramentos', {
    method: 'POST',
    body: JSON.stringify({ tipo: 'oab', valor: numeroOab, oab_uf: ufOab }),
  });
}

export function atualizarMonitoramento(id: string, dto: { ativo?: boolean }) {
  return request<Monitoramento>(`/publicacoes/monitoramentos/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function excluirMonitoramento(id: string) {
  return request<{ ok: boolean }>(`/publicacoes/monitoramentos/${id}`, { method: 'DELETE' });
}

export function puxarMonitoramento(id: string) {
  return request<unknown>(`/publicacoes/monitoramentos/${id}/pull`, { method: 'POST' });
}

export function buscarAgenda(dataInicio: string, dataFim: string) {
  const params = new URLSearchParams({ dataInicio, dataFim });
  return request<{ eventos: AgendaEvento[] }>(`/publicacoes/agenda?${params.toString()}`);
}

export function atualizarPublicacao(id: string, dados: Partial<Pick<Publicacao, 'status' | 'urgencia' | 'tags'>>) {
  return request<Publicacao>(`/publicacoes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export function atualizarPublicacoesEmMassa(ids: string[], dados: { status?: string; urgencia?: string }) {
  return request<{ atualizadas: number }>('/publicacoes/em-massa/atualizar', {
    method: 'PATCH',
    body: JSON.stringify({ ids, ...dados }),
  });
}

export type TipoLancamento = 'receita' | 'despesa';
export type StatusLancamento = 'pendente' | 'pago' | 'atrasado' | 'cancelado';

export type Lancamento = {
  _id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  categoria?: string;
  cliente_id?: string;
  numero_processo?: string;
  data_vencimento: string;
  data_pagamento?: string;
  status: StatusLancamento;
  grupo_parcelamento_id?: string;
  parcela_atual?: number;
  parcela_total?: number;
};

export type ResumoFinanceiro = {
  aReceber: number;
  aPagar: number;
  recebido: number;
  pago: number;
  atrasados: number;
};

export function listarLancamentos(
  filtros: { tipo?: string; status?: string; clienteId?: string; numeroProcesso?: string; mes?: string } = {},
) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) params.set(chave, valor);
  });
  const query = params.toString();
  return request<Lancamento[]>(`/financeiro${query ? `?${query}` : ''}`);
}

export function resumoFinanceiro(mes?: string) {
  const query = mes ? `?mes=${mes}` : '';
  return request<ResumoFinanceiro>(`/financeiro/resumo${query}`);
}

export function criarLancamento(dto: {
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  categoria?: string;
  clienteId?: string;
  numero_processo?: string;
  data_vencimento: string;
  parcelas?: number;
}) {
  return request<Lancamento | Lancamento[]>('/financeiro', { method: 'POST', body: JSON.stringify(dto) });
}

export function atualizarLancamento(id: string, dto: Partial<Pick<Lancamento, 'descricao' | 'valor' | 'categoria' | 'data_vencimento' | 'status'>>) {
  return request<Lancamento>(`/financeiro/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function excluirLancamento(id: string, todasParcelas = false) {
  return request<{ ok: boolean }>(`/financeiro/${id}${todasParcelas ? '?todasParcelas=true' : ''}`, { method: 'DELETE' });
}

export type EtapaOportunidade = 'novo' | 'contato' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

export type Oportunidade = {
  _id: string;
  titulo: string;
  cliente_id?: string;
  cliente_nome?: string;
  valor_estimado?: number;
  etapa: EtapaOportunidade;
  responsavel_id?: string;
  notas?: string;
  updated_at: string;
};

export function listarOportunidades(etapa?: string) {
  const params = new URLSearchParams();
  if (etapa) params.set('etapa', etapa);
  const query = params.toString();
  return request<Oportunidade[]>(`/crm/oportunidades${query ? `?${query}` : ''}`);
}

export function criarOportunidade(dto: {
  titulo: string;
  clienteId?: string;
  cliente_nome?: string;
  valor_estimado?: number;
  responsavel_id?: string;
  notas?: string;
}) {
  return request<Oportunidade>('/crm/oportunidades', { method: 'POST', body: JSON.stringify(dto) });
}

export function atualizarOportunidade(id: string, dto: Partial<Pick<Oportunidade, 'titulo' | 'valor_estimado' | 'etapa' | 'notas'>>) {
  return request<Oportunidade>(`/crm/oportunidades/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function excluirOportunidade(id: string) {
  return request<{ ok: boolean }>(`/crm/oportunidades/${id}`, { method: 'DELETE' });
}

export type TipoServicoTerceirizado = 'correspondente' | 'peticao' | 'sustentacao_oral' | 'audiencia' | 'outro';
export type StatusTerceirizacao = 'pendente' | 'concluido' | 'cancelado';

export type Terceirizacao = {
  _id: string;
  tipo_servico: TipoServicoTerceirizado;
  contratante: string;
  descricao: string;
  numero_processo?: string;
  data_compromisso: string;
  valor?: number;
  status: StatusTerceirizacao;
};

export function listarTerceirizacoes(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const query = params.toString();
  return request<Terceirizacao[]>(`/terceirizacoes${query ? `?${query}` : ''}`);
}

export function criarTerceirizacao(dto: {
  tipo_servico: TipoServicoTerceirizado;
  contratante: string;
  descricao: string;
  numero_processo?: string;
  data_compromisso: string;
  valor?: number;
}) {
  return request<Terceirizacao>('/terceirizacoes', { method: 'POST', body: JSON.stringify(dto) });
}

export function atualizarTerceirizacao(id: string, dto: Partial<Pick<Terceirizacao, 'descricao' | 'data_compromisso' | 'valor' | 'status'>>) {
  return request<Terceirizacao>(`/terceirizacoes/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
}

export function excluirTerceirizacao(id: string) {
  return request<{ ok: boolean }>(`/terceirizacoes/${id}`, { method: 'DELETE' });
}
