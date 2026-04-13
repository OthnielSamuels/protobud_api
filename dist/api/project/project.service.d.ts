import { PrismaService } from '../../prisma/database.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';
export declare class ProjectService {
    private readonly db;
    private readonly logger;
    constructor(db: PrismaService);
    create(dto: CreateProjectDto): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
        quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: any;
        printHours: any;
    }>;
    findAll(): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
        quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: any;
        printHours: any;
    }[]>;
    findByClient(clientId: string): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
        quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: any;
        printHours: any;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
        quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: any;
        printHours: any;
    }>;
    update(id: string, dto: UpdateProjectDto): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.ProjectStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
        description: string | null;
        material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
        quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
        fileUrl: string | null;
        weightGrams: any;
        printHours: any;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    private ensureExists;
}
