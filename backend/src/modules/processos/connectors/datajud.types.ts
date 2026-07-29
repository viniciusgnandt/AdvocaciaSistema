/**
 * Tipos do payload da API Publica DataJud (CNJ) - base Elasticsearch com metadados
 * processuais de praticamente todos os tribunais do pais.
 * Docs: https://datajud-wiki.cnj.jus.br/api-publica/
 *
 * Requer uma API Key publica do CNJ (gratuita, solicitada no proprio portal acima) -
 * configurada em DATAJUD_API_KEY. Sem a chave, o conector fica inativo (ver connector).
 */
export interface DatajudMovimento {
  codigo?: number;
  nome?: string;
  dataHora: string;
  complementosTabelados?: { nome?: string; descricao?: string }[];
}

export interface DatajudClasse {
  codigo?: number;
  nome?: string;
}

export interface DatajudAssunto {
  codigo?: number;
  nome?: string;
}

export interface DatajudOrgaoJulgador {
  codigo?: number;
  nome?: string;
}

export interface DatajudSource {
  numeroProcesso: string;
  tribunal?: string;
  grau?: string;
  classe?: DatajudClasse;
  assuntos?: DatajudAssunto[];
  orgaoJulgador?: DatajudOrgaoJulgador;
  dataAjuizamento?: string;
  valorCausa?: number;
  movimentos?: DatajudMovimento[];
}

export interface DatajudSearchResponse {
  hits: {
    total: { value: number };
    hits: { _source: DatajudSource }[];
  };
}
