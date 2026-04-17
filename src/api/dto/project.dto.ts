import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { PrintMaterial, PrintQuality, ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsEnum(PrintMaterial)
  material?: PrintMaterial;

  @IsOptional()
  @IsEnum(PrintQuality)
  quality?: PrintQuality;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  weightGrams?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  printHours?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(PrintMaterial)
  material?: PrintMaterial;

  @IsOptional()
  @IsEnum(PrintQuality)
  quality?: PrintQuality;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  weightGrams?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  printHours?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
