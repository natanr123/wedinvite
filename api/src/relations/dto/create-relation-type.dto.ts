import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRelationTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;
}
