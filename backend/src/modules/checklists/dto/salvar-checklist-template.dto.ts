import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemChecklistDto {
  @ApiProperty()
  @IsString()
  titulo: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  dias_prazo: number;
}

export class SalvarChecklistTemplateDto {
  @ApiProperty()
  @IsString()
  nome: string;

  @ApiProperty({ type: [ItemChecklistDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemChecklistDto)
  itens: ItemChecklistDto[];
}
