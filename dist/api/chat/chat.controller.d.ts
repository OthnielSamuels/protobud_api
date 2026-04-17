import { ChatService } from './chat.service';
import { LlmService } from '../llm/llm.service';
import { ClientService } from '../client/client.service';
import { ProjectService } from '../project/project.service';
import { EstimateService } from '../estimate/estimate.service';
import { IncomingMessageDto } from '../dto/incoming-message.dto';
export declare class ChatController {
    private readonly chatService;
    private readonly llmService;
    private readonly clientService;
    private readonly projectService;
    private readonly estimateService;
    private readonly logger;
    constructor(chatService: ChatService, llmService: LlmService, clientService: ClientService, projectService: ProjectService, estimateService: EstimateService);
    incoming(dto: IncomingMessageDto): Promise<{
        reply: string;
    }>;
}
