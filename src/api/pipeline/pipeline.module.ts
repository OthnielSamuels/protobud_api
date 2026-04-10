import { Module } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { EstimateModule } from '../estimate/estimate.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { ChatModule } from '../chat/chat.module';
import { WhatsappModule } from '../whatsapp-bot/whatsapp.module';

@Module({
  imports: [
    EstimateModule,
    InvoiceModule,
    ChatModule,
    WhatsappModule,
  ],
  controllers: [PipelineController],
  providers: [PipelineService],
})
export class PipelineModule {}
