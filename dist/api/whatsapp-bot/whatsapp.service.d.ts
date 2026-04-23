export declare class WhatsappService {
    private readonly logger;
    private readonly botUrl;
    constructor();
    sendMessage(phone: string, text: string): Promise<boolean>;
    getHealth(): Promise<{
        connected: boolean;
        status: string;
    }>;
    private normalizeWhatsappPhone;
}
