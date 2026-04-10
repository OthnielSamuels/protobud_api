import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { IsString, IsNotEmpty, Length } from 'class-validator';

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @Length(7, 30)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 4000)
  message!: string;
}

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /**
   * GET /whatsapp/health
   * Returns bot connection status — useful for monitoring.
   */
  @Get('health')
  health() {
    return this.whatsappService.getHealth();
  }

  /**
   * POST /whatsapp/send
   * Operator sends a message to a client's WhatsApp number.
   * Used when a quote is finalized and needs to be communicated.
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() dto: SendMessageDto) {
    const sent = await this.whatsappService.sendMessage(dto.phone, dto.message);
    return { sent };
  }
}
