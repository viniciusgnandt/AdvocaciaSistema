import { IsInt, Min } from 'class-validator';

export class AdicionarCreditosDto {
  @IsInt()
  @Min(1)
  quantidade: number;
}
