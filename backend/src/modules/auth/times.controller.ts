import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { TimesService } from './times.service';
import { CriarTimeDto } from './dto/criar-time.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser, UsuarioAutenticado } from './decorators/current-user.decorator';

@ApiTags('times')
@Controller('times')
export class TimesController {
  constructor(private readonly timesService: TimesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os times de trabalho do escritorio' })
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.timesService.listar(new Types.ObjectId(usuario.tenantId));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Cria um time de trabalho' })
  async criar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CriarTimeDto) {
    return this.timesService.criar(new Types.ObjectId(usuario.tenantId), dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Atualiza nome/cor/membros de um time' })
  async atualizar(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string, @Body() dto: Partial<CriarTimeDto>) {
    return this.timesService.atualizar(new Types.ObjectId(usuario.tenantId), new Types.ObjectId(id), dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Remove um time' })
  async excluir(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    const ok = await this.timesService.excluir(new Types.ObjectId(usuario.tenantId), new Types.ObjectId(id));
    return ok ? { ok: true } : { erro: 'time nao encontrado' };
  }
}
