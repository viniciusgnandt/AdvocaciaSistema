import { Body, Controller, Delete, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IaService } from './ia.service';
import { GerarDocumentoDto } from './dto/gerar-documento.dto';
import { CopilotoDto } from './dto/copiloto.dto';
import { SalvarModeloDto } from './dto/salvar-modelo.dto';
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
    const modeloTexto = modelo ? await this.iaService.extrairTexto(modelo) : undefined;
    return this.iaService.gerarDocumento(usuario.tenantId, { ...dto, modelo_texto: modeloTexto });
  }

  @Post('copiloto')
  @ApiOperation({ summary: 'Responde uma pergunta do advogado com contexto opcional de um processo e historico da conversa' })
  async copiloto(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CopilotoDto) {
    return this.iaService.copiloto(usuario.tenantId, dto);
  }

  @Get('resumo-processo/:processoId')
  @ApiOperation({ summary: 'Resumo do processo gerado por IA (cacheado) - use ?regenerar=true para forcar novo resumo' })
  async resumoProcesso(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('processoId') processoId: string,
    @Query('regenerar') regenerar?: string,
  ) {
    return this.iaService.resumoProcesso(usuario.tenantId, processoId, regenerar === 'true');
  }

  @Get('sugerir-tarefas/:processoId')
  @ApiOperation({ summary: 'Sugere proximos passos do processo como uma lista de possiveis tarefas' })
  async sugerirTarefas(@CurrentUser() usuario: UsuarioAutenticado, @Param('processoId') processoId: string) {
    return this.iaService.sugerirTarefas(usuario.tenantId, processoId);
  }

  @Post('revisar-documento')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Revisa um documento existente (.docx/.pdf/.txt) e aponta inconsistencias e pontos de atencao' })
  @UseInterceptors(FileInterceptor('arquivo', { storage: memoryStorage(), limits: { fileSize: LIMITE_MODELO_BYTES } }))
  async revisarDocumento(
    @CurrentUser() usuario: UsuarioAutenticado,
    @UploadedFile() arquivo: Express.Multer.File,
    @Body('processo_id') processoId?: string,
  ) {
    return this.iaService.revisarDocumento(usuario.tenantId, arquivo, processoId);
  }

  @Get('modelos')
  @ApiOperation({ summary: 'Lista os modelos de documento salvos pelo escritorio, opcionalmente filtrados por tipo' })
  async listarModelos(@CurrentUser() usuario: UsuarioAutenticado, @Query('tipo') tipo?: string) {
    return this.iaService.listarModelos(usuario.tenantId, tipo);
  }

  @Get('modelos/:id')
  @ApiOperation({ summary: 'Retorna um modelo de documento salvo, incluindo o conteudo' })
  async obterModelo(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.iaService.obterModelo(usuario.tenantId, id);
  }

  @Post('modelos')
  @ApiOperation({ summary: 'Salva um texto como modelo reutilizavel de documento' })
  async salvarModelo(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: SalvarModeloDto) {
    return this.iaService.salvarModelo(usuario.tenantId, usuario.sub, dto);
  }

  @Delete('modelos/:id')
  @ApiOperation({ summary: 'Exclui um modelo de documento salvo' })
  async excluirModelo(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.iaService.excluirModelo(usuario.tenantId, id);
  }
}
