import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  Length,
} from 'class-validator';
import { InvoiceStatus } from '../../../generated/prisma-client/client';

export class CreateInvoiceDto {
  @IsUUID()
  estimateId!: string;

  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
