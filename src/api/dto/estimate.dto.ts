import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstimateStatus } from '@prisma/client';

export class CreateEstimateItemDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 500)
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  // Nullable — operator fills these later
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice?: number;
}

export class CreateEstimateDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEstimateItemDto)
  items!: CreateEstimateItemDto[];
}

export class UpdateEstimateDto {
  @IsOptional()
  @IsEnum(EstimateStatus)
  status?: EstimateStatus;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  // Operator fills pricing
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  subtotal?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  total?: number;
}

export class UpdateEstimateItemDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
