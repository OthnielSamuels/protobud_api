import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmModule } from '../llm/llm.module';
import { ClientModule } from '../client/client.module';
import { ProjectModule } from '../project/project.module';
import { EstimateModule } from '../estimate/estimate.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [
    LlmModule,
    ClientModule,
    ProjectModule,
    EstimateModule,
    InvoiceModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService], // WhatsappModule needs this
})
export class ChatModule {}
