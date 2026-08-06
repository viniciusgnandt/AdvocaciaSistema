import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChecklistTemplate } from './schemas/checklist-template.schema';
import { Tarefa } from '../tarefas/schemas/tarefa.schema';
import { Processo } from '../processos/schemas/processo.schema';
import { SalvarChecklistTemplateDto } from './dto/salvar-checklist-template.dto';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('checklists')
@Controller('checklists')
export class ChecklistsController {
  constructor(
    @InjectModel(ChecklistTemplate.name) private readonly templateModel: Model<ChecklistTemplate>,
    @InjectModel(Tarefa.name) private readonly tarefaModel: Model<Tarefa>,
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os templates de checklist do escritorio' })
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.templateModel.find({ tenant_id: new Types.ObjectId(usuario.tenantId) }).sort({ nome: 1 });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Cria um template de checklist - somente admin' })
  async criar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: SalvarChecklistTemplateDto) {
    return this.templateModel.create({ ...dto, tenant_id: new Types.ObjectId(usuario.tenantId) });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Atualiza um template de checklist - somente admin' })
  async atualizar(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string, @Body() dto: SalvarChecklistTemplateDto) {
    const template = await this.templateModel.findOneAndUpdate(
      { _id: id, tenant_id: new Types.ObjectId(usuario.tenantId) },
      { $set: dto },
      { new: true },
    );
    return template ?? { erro: 'template nao encontrado' };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Remove um template de checklist - somente admin' })
  async excluir(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    const resultado = await this.templateModel.deleteOne({ _id: id, tenant_id: new Types.ObjectId(usuario.tenantId) });
    return resultado.deletedCount > 0 ? { ok: true } : { erro: 'template nao encontrado' };
  }

  @Post(':id/aplicar/:numeroCnj')
  @ApiOperation({ summary: 'Aplica um template a um processo, criando uma tarefa para cada item do checklist' })
  async aplicar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Param('numeroCnj') numeroCnj: string,
  ) {
    const tenant = new Types.ObjectId(usuario.tenantId);
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    const [template, processo] = await Promise.all([
      this.templateModel.findOne({ _id: id, tenant_id: tenant }),
      this.processoModel.findOne({ tenant_id: tenant, numero_cnj: numeroLimpo }),
    ]);
    if (!template) throw new NotFoundException('template nao encontrado');
    if (!processo) throw new NotFoundException('processo nao encontrado');

    const agora = Date.now();
    const tarefas = await this.tarefaModel.insertMany(
      template.itens.map((item) => ({
        tenant_id: tenant,
        titulo: item.titulo,
        numero_processo: processo.numero_cnj,
        data_vencimento: new Date(agora + item.dias_prazo * 86_400_000),
        prioridade: 'media',
        origem: 'manual',
      })),
    );
    return tarefas;
  }
}
