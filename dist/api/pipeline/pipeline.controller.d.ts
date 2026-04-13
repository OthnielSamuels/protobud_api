import { PipelineService } from './pipeline.service';
import { FinalizeEstimateRequestDto, NotifyClientRequestDto, RejectEstimateRequestDto } from '../dto/pipeline.dto';
export declare class PipelineController {
    private readonly pipelineService;
    constructor(pipelineService: PipelineService);
    getPending(): Promise<{
        id: string;
        phone: string;
        status: import("../../../generated/prisma-client").$Enums.ConversationStatus;
        updatedAt: Date;
        client: {
            id: string;
            phone: string;
            name: string;
            company: string | null;
        } | null;
    }[]>;
    getDetail(id: string): Promise<{
        conversation: {
            id: string;
            phone: string;
            status: import("../../../generated/prisma-client").$Enums.ConversationStatus;
            createdAt: Date;
            updatedAt: Date;
            client: {
                id: string;
                phone: string;
                name: string;
                email: string | null;
                company: string | null;
            } | null;
            messages: {
                createdAt: Date;
                role: import("../../../generated/prisma-client").$Enums.MessageRole;
                content: string;
            }[];
        };
        projects: any;
    }>;
    finalize(dto: FinalizeEstimateRequestDto): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
        subtotal: any;
        tax: any;
        total: any;
        invoice: {
            id: string;
            status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        } | null;
    } | null>;
    notify(dto: NotifyClientRequestDto): Promise<{
        completed: boolean;
        whatsappSent: boolean;
    }>;
    reject(id: string, dto: RejectEstimateRequestDto): Promise<{
        rejected: boolean;
    }>;
}
