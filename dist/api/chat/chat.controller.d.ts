import { ChatService } from './chat.service';
import { IncomingMessageDto } from '../dto/incoming-message.dto';
export declare class ChatController {
    private readonly chatService;
    private readonly logger;
    constructor(chatService: ChatService);
    incoming(dto: IncomingMessageDto): Promise<{
        reply: string;
    }>;
}
