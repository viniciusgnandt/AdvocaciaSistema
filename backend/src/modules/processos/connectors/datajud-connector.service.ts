import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { DatajudSearchResponse, DatajudSource } from './datajud.types';

/**
 * Conector da API Publica DataJud (CNJ) - complementa o DJEN com os dados completos
 * do processo (classe, assuntos, orgao julgador, valor da causa, movimentacoes).
 *
 * Exige uma API Key publica e gratuita do CNJ, obtida em
 * https://datajud-wiki.cnj.jus.br/api-publica/acesso e configurada em DATAJUD_API_KEY.
 * Sem a chave configurada, o metodo lanca erro explicito em vez de falhar silenciosamente.
 */
@Injectable()
export class DatajudConnectorService {
  private readonly logger = new Logger(DatajudConnectorService.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('DATAJUD_BASE_URL') ?? 'https://api-publica.datajud.cnj.jus.br';
    this.apiKey = this.config.get<string>('DATAJUD_API_KEY');
  }

  get habilitado(): boolean {
    return !!this.apiKey;
  }

  /**
   * Busca o processo pelo numero CNJ (20 digitos, sem mascara) num tribunal especifico.
   * `siglaTribunal` no formato usado pelo DJEN (ex.: "TJSP", "TRF3") vira o alias de
   * indice esperado pelo DataJud (ex.: "api_publica_tjsp").
   */
  async buscarProcesso(numeroProcesso: string, siglaTribunal: string): Promise<DatajudSource | null> {
    if (!this.apiKey) {
      throw new Error(
        'DATAJUD_API_KEY nao configurada. Solicite uma chave publica gratuita em ' +
          'https://datajud-wiki.cnj.jus.br/api-publica/acesso e defina no .env',
      );
    }

    const numeroLimpo = numeroProcesso.replace(/\D/g, '');
    const alias = `api_publica_${siglaTribunal.toLowerCase()}`;

    try {
      const { data } = await firstValueFrom(
        this.http.post<DatajudSearchResponse>(
          `${this.baseUrl}/${alias}/_search`,
          // numeroProcesso e campo "keyword" no indice - term (busca exata) e o correto,
          // match usa analyzer padrao e pode nao casar com numeros longos sem espacos.
          { query: { term: { numeroProcesso: numeroLimpo } } },
          {
            headers: { Authorization: `APIKey ${this.apiKey}`, 'Content-Type': 'application/json' },
            timeout: 25_000,
          },
        ),
      );
      return data.hits.hits[0]?._source ?? null;
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `Falha ao consultar DataJud (processo=${numeroLimpo}, tribunal=${siglaTribunal}): ${axiosErr.message}`,
      );
      throw err;
    }
  }
}
