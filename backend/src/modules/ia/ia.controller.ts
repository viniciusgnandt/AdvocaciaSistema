import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IaService } from './ia.service';
import { GerarDocumentoDto } from './dto/gerar-documento.dto';
import { CopilotoDto } from './dto/copiloto.dto';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

const LIMITE_MODELO_BYTES = 10 * 1024 * 1024; // 10MB

@ApiTags('ia')
@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Post('gerar-documento')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Gera uma minuta de documento juridico com IA a partir de instrucoes do advogado, opcionalmente ' +
      'usando um arquivo-modelo (.docx/.pdf/.txt) como referencia de estrutura',
  })
  @UseInterceptors(FileInterceptor('modelo', { storage: memoryStorage(), limits: { fileSize: LIMITE_MODELO_BYTES } }))
  async gerarDocumento(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: GerarDocumentoDto,
    @UploadedFile() modelo?: Express.Multer.File,
  ) {
    const modeloTexto = modelo ? await this.iaService.extrairTextoModelo(modelo) : undefined;
    return this.iaService.gerarDocumento(usuario.tenantId, { ...dto, modelo_texto: modeloTexto });
  }

  @Post('copiloto')
  @ApiOperation({ summary: 'Responde uma pergunta do advogado com contexto opcional de um processo' })
  async copiloto(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CopilotoDto) {
    return this.iaService.copiloto(usuario.tenantId, dto);
  }
}
