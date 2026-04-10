import {
  IsUUID,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  ValidateNested,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FinalizeItemDto {
  @IsUUID()
  itemId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalPrice!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class FinalizeEstimateRequestDto {
  @IsUUID()
  estimateId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinalizeItemDto)
  items!: FinalizeItemDto[];

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  subtotal!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax!  : number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  total!: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class NotifyClientRequestDto {
  @IsUUID()
  conversationId!: string;

  @IsString()
  @Length(1, 4000)
  message!  : string;
}

export class RejectEstimateRequestDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}
