import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';
export declare class ProjectController {
    private readonly projectService;
    constructor(projectService: ProjectService);
    create(dto: CreateProjectDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("@prisma/client").$Enums.PrintMaterial | null;
        quality: import("@prisma/client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: import("@prisma/client/runtime/client").Decimal | null;
        printHours: import("@prisma/client/runtime/client").Decimal | null;
    }>;
    findAll(clientId?: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("@prisma/client").$Enums.PrintMaterial | null;
        quality: import("@prisma/client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: import("@prisma/client/runtime/client").Decimal | null;
        printHours: import("@prisma/client/runtime/client").Decimal | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("@prisma/client").$Enums.PrintMaterial | null;
        quality: import("@prisma/client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: import("@prisma/client/runtime/client").Decimal | null;
        printHours: import("@prisma/client/runtime/client").Decimal | null;
    }>;
    update(id: string, dto: UpdateProjectDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("@prisma/client").$Enums.PrintMaterial | null;
        quality: import("@prisma/client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: import("@prisma/client/runtime/client").Decimal | null;
        printHours: import("@prisma/client/runtime/client").Decimal | null;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
