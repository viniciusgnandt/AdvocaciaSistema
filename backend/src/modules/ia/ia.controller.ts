import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IaService } from './ia.service';
import { GerarDocumentoDto } from './dto/gerar-documento.dto';
import { CopilotoDto } from './dto/copiloto.dto';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

@ApiTags('ia')
@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Post('gerar-documento')
  @ApiOperation({ summary: 'Gera uma minuta de documento juridico com IA a partir de instrucoes do advogado' })
  async gerarDocumento(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: GerarDocumentoDto) {
    return this.iaService.gerarDocumento(usuario.tenantId, dto);
  }

  @Post('copiloto')
  @ApiOperation({ summary: 'Responde uma pergunta do advogado com contexto opcional de um processo' })
  async copiloto(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CopilotoDto) {
    return this.iaService.copiloto(usuario.tenantId, dto);
  }
}
