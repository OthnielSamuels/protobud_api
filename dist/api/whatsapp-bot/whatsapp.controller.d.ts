import { WhatsappService } from './whatsapp.service';
declare class SendMessageDto {
    phone: string;
    message: string;
}
export declare class WhatsappController {
    private readonly whatsappService;
    constructor(whatsappService: WhatsappService);
    health(): Promise<{
        connected: boolean;
        status: string;
    }>;
    send(dto: SendMessageDto): Promise<{
        sent: boolean;
    }>;
}
export {};
