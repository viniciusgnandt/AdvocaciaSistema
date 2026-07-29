import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { DjenBuscaParams, DjenComunicacaoResponse } from './djen.types';

/**
 * Conector da fonte DJEN (Diario de Justica Eletronico Nacional).
 *
 * Esta e a fonte prioritaria: cobre publicacoes de tribunais estaduais e federais que
 * aderiram ao Diario de Justica Eletronico Nacional centralizado pelo CNJ, via API publica,
 * sem necessidade de robo/scraper. Tribunais que nao publicam no DJEN (ou publicam com atraso)
 * seguem cobertos por conectores dedicados (STF, STJ, TSE, TRTs) e, na ausencia de API, por
 * scrapers respeitando LGPD/robots.txt (modulo `scrapers/`, a implementar).
 */
@Injectable()
export class DjenConnectorService {
  private readonly logger = new Logger(DjenConnectorService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('DJEN_API_BASE_URL') ?? 'https://comunicaapi.pje.jus.br/api/v1';
  }

  async buscarComunicacoes(params: DjenBuscaParams): Promise<DjenComunicacaoResponse> {
    const query: Record<string, string | number> = {};
    if (params.numeroOab) query.numeroOab = params.numeroOab;
    if (params.ufOab) query.ufOab = params.ufOab;
    if (params.numeroProcesso) query.numeroProcesso = params.numeroProcesso;
    if (params.dataDisponibilizacaoInicio) query.dataDisponibilizacaoInicio = params.dataDisponibilizacaoInicio;
    if (params.dataDisponibilizacaoFim) query.dataDisponibilizacaoFim = params.dataDisponibilizacaoFim;
    query.pagina = params.pagina ?? 1;
    query.itensPorPagina = params.itensPorPagina ?? 100;

    try {
      const { data } = await firstValueFrom(
        this.http.get<DjenComunicacaoResponse>(`${this.baseUrl}/comunicacao`, {
          params: query,
          timeout: 15_000,
        }),
      );
      return { ...data, items: data.items ?? [] };
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `Falha ao consultar DJEN (params=${JSON.stringify(params)}): ${axiosErr.message}`,
      );
      throw err;
    }
  }
}
