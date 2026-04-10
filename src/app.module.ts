import { Module } from '@nestjs/common';
import { DatabaseModule } from './prisma/database.module';
import { ChatModule } from './api/chat/chat.module';
import { ClientModule } from './api/client/client.module';
import { ProjectModule } from './api/project/project.module';
import { EstimateModule } from './api/estimate/estimate.module';
import { InvoiceModule } from './api/invoice/invoice.module';
import { LlmModule } from './api/llm/llm.module';
import { WhatsappModule } from './api/whatsapp/whatsapp.module';
import { PipelineModule } from './api/pipeline/pipeline.module';
import { HealthModule } from './api/health/health.module';

@Module({
  imports: [
    DatabaseModule,   // Global — single PrismaClient shared everywhere
    LlmModule,        // Single-queue Ollama client
    ChatModule,       // Orchestration hub — imports LlmModule + pipeline modules
    ClientModule,
    ProjectModule,
    EstimateModule,
    InvoiceModule,
    WhatsappModule,   // Bot health check + operator send endpoint
    PipelineModule,   // Operator workflow: review → price → notify → complete
    HealthModule,   
  ],
})
export class AppModule {}
