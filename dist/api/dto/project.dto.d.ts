import { PrintMaterial, PrintQuality, ProjectStatus } from '../../../generated/prisma-client/client';
export declare class CreateProjectDto {
    clientId: string;
    name: string;
    description?: string;
    material?: PrintMaterial;
    quality?: PrintQuality;
    fileUrl?: string;
    weightGrams?: number;
    printHours?: number;
    notes?: string;
}
export declare class UpdateProjectDto {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    material?: PrintMaterial;
    quality?: PrintQuality;
    fileUrl?: string;
    weightGrams?: number;
    printHours?: number;
    notes?: string;
}
