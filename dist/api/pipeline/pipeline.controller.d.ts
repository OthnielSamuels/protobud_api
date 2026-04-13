import { PipelineService } from './pipeline.service';
import { FinalizeEstimateRequestDto, NotifyClientRequestDto, RejectEstimateRequestDto } from '../dto/pipeline.dto';
export declare class PipelineController {
    private readonly pipelineService;
    constructor(pipelineService: PipelineService);
    getPending(): Promise<{
        client: {
            phone: string;
            id: string;
            name: string;
            company: string | null;
        } | null;
        phone: string;
        id: string;
        status: import("../../../generated/prisma-client").$Enums.ConversationStatus;
        updatedAt: Date;
    }[]>;
    getDetail(id: string): Promise<{
        conversation: {
            client: {
                phone: string;
                id: string;
                name: string;
                email: string | null;
                company: string | null;
            } | null;
            phone: string;
            id: string;
            status: import("../../../generated/prisma-client").$Enums.ConversationStatus;
            createdAt: Date;
            updatedAt: Date;
            messages: {
                createdAt: Date;
                role: import("../../../generated/prisma-client").$Enums.MessageRole;
                content: string;
            }[];
        };
        projects: any;
    }>;
    finalize(dto: FinalizeEstimateRequestDto): Promise<{
        invoice: {
            id: string;
            status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        } | null;
        id: string;
        status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
        subtotal: any;
        tax: any;
        total: any;
    } | null>;
    notify(dto: NotifyClientRequestDto): Promise<{
        completed: boolean;
        whatsappSent: boolean;
    }>;
    reject(id: string, dto: RejectEstimateRequestDto): Promise<{
        rejected: boolean;
    }>;
}
