import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { memoryStorage } from 'multer';
import { Documento } from './schemas/documento.schema';
import { StorageService } from '../storage/storage.service';

const LIMITE_TAMANHO_BYTES = 50 * 1024 * 1024; // 50MB por arquivo

@ApiTags('documentos')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('documentos')
export class DocumentosController {
  constructor(
    @InjectModel(Documento.name) private readonly documentoModel: Model<Documento>,
    private readonly storage: StorageService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envia um arquivo (PDF, imagem etc.) para o bucket do escritorio, vinculado a um processo' })
  @UseInterceptors(
    FileInterceptor('arquivo', { storage: memoryStorage(), limits: { fileSize: LIMITE_TAMANHO_BYTES } }),
  )
  async upload(
    @Headers('x-tenant-id') tenantId: string,
    @UploadedFile() arquivo: Express.Multer.File,
    @Query('processoId') processoId?: string,
    @Query('numeroProcesso') numeroProcesso?: string,
    @Query('clienteId') clienteId?: string,
    @Query('tipo') tipo?: string,
    @Query('movimentacaoChave') movimentacaoChave?: string,
    @Query('pastaId') pastaId?: string,
  ) {
    if (!arquivo) {
      return { erro: 'nenhum arquivo enviado (campo "arquivo" no multipart/form-data)' };
    }

    const chave = this.storage.montarChave(tenantId, arquivo.originalname);
    await this.storage.upload(chave, arquivo.buffer, arquivo.mimetype);

    return this.documentoModel.create({
      tenant_id: new Types.ObjectId(tenantId),
      processo_id: processoId ? new Types.ObjectId(processoId) : undefined,
      numero_processo: numeroProcesso,
      cliente_id: clienteId ? new Types.ObjectId(clienteId) : undefined,
      movimentacao_chave: movimentacaoChave,
      pasta_id: pastaId ? new Types.ObjectId(pastaId) : undefined,
      nome: arquivo.originalname,
      tipo: tipo ?? inferirTipo(arquivo.mimetype, arquivo.originalname),
      storage_key: chave,
      mime: arquivo.mimetype,
      tamanho_bytes: arquivo.size,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Lista documentos, opcionalmente filtrados por processo, cliente e/ou movimentacao' })
  async listar(
    @Headers('x-tenant-id') tenantId: string,
    @Query('processoId') processoId?: string,
    @Query('numeroProcesso') numeroProcesso?: string,
    @Query('clienteId') clienteId?: string,
    @Query('movimentacaoChave') movimentacaoChave?: string,
    @Query('pastaId') pastaId?: string,
  ) {
    const filtro: Record<string, unknown> = { tenant_id: new Types.ObjectId(tenantId) };
    if (processoId) filtro.processo_id = new Types.ObjectId(processoId);
    if (numeroProcesso) filtro.numero_processo = numeroProcesso;
    if (clienteId) filtro.cliente_id = new Types.ObjectId(clienteId);
    if (movimentacaoChave) filtro.movimentacao_chave = movimentacaoChave;
    // pastaId ausente do query = nao filtra por pasta (usado pelos anexos de movimentacao);
    // pastaId="" = raiz do processo; pastaId="<id>" = dentro daquela pasta
    if (pastaId !== undefined) {
      filtro.pasta_id = pastaId ? new Types.ObjectId(pastaId) : { $exists: false };
    }
    return this.documentoModel.find(filtro).sort({ created_at: -1 }).exec();
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Gera uma URL assinada (5 min) para download direto do bucket' })
  async download(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const documento = await this.documentoModel.findOne({
      _id: new Types.ObjectId(id),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!documento) return { erro: 'documento nao encontrado' };

    const url = await this.storage.gerarUrlDownload(documento.storage_key);
    return { url, nome: documento.nome, mime: documento.mime };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um documento (bucket + metadados)' })
  async excluir(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const documento = await this.documentoModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!documento) return { erro: 'documento nao encontrado' };

    await this.storage.excluir(documento.storage_key);
    return { ok: true };
  }
}

function inferirTipo(mime: string, nomeArquivo: string): string {
  const extensao = nomeArquivo.toLowerCase().split('.').pop();
  if (extensao === 'eml' || extensao === 'msg' || mime === 'message/rfc822') return 'email';
  if (mime === 'application/pdf') return 'peca';
  if (mime.startsWith('image/')) return 'imagem';
  return 'outro';
}
