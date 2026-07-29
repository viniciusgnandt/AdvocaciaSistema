/**
 * Tipos do payload retornado pela API publica do DJEN (Diario de Justica Eletronico
 * Nacional / "Comunica", mantida pelo CNJ - https://comunica.pje.jus.br).
 *
 * Nao ha autenticacao para consulta publica de comunicacoes. O shape abaixo reflete
 * os campos observados no uso publico do endpoint; deve ser validado/ajustado contra
 * a resposta real antes de ir a producao (ver nota em djen-connector.service.ts).
 */
export interface DjenAdvogadoDestinatario {
  advogado?: {
    nome?: string;
    numero_oab?: string | number;
    uf_oab?: string;
  };
  // alguns endpoints/versoes podem achatar os campos direto no item; mantido como fallback
  nome?: string;
  numero_oab?: string | number;
  uf_oab?: string;
}

export interface DjenComunicacaoItem {
  id: number | string;
  data_disponibilizacao: string; // 'YYYY-MM-DD'
  siglaTribunal?: string;
  tribunal?: string;
  tipoComunicacao?: string;
  tipo_comunicacao?: string;
  nomeOrgao?: string;
  nome_orgao?: string;
  numero_processo: string;
  texto?: string;
  link?: string;
  tipoDocumento?: string;
  nomeClasse?: string;
  codigoClasse?: number;
  numeroComunicacao?: number;
  meio?: string;
  destinatarioadvogados?: DjenAdvogadoDestinatario[];
  destinatarios_advogados?: DjenAdvogadoDestinatario[];
}

export interface DjenComunicacaoResponse {
  status?: string;
  message?: string;
  count?: number;
  items: DjenComunicacaoItem[];
}

export interface DjenBuscaParams {
  numeroOab?: string;
  ufOab?: string;
  numeroProcesso?: string;
  dataDisponibilizacaoInicio?: string; // YYYY-MM-DD
  dataDisponibilizacaoFim?: string; // YYYY-MM-DD
  pagina?: number;
  itensPorPagina?: number;
}
