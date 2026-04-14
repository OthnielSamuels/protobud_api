import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/database.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';

const PROJECT_SELECT = {
  id: true,
  clientId: true,
  name: true,
  description: true,
  status: true,
  material: true,
  quality: true,
  fileUrl: true,
  weightGrams: true,
  printHours: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private readonly db: PrismaService) {}

  async create(dto: CreateProjectDto) {
    return this.db.project.create({
      data: {
        clientId: dto.clientId,
        name: dto.name,
        description: dto.description,
        material: dto.material,
        quality: dto.quality,
        fileUrl: dto.fileUrl,
        weightGrams: dto.weightGrams,
        printHours: dto.printHours,
        notes: dto.notes,
      },
      select: PROJECT_SELECT,
    });
  }

  async findAll() {
    return this.db.project.findMany({
      select: PROJECT_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findByClient(clientId: string) {
    return this.db.project.findMany({
      where: { clientId },
      select: PROJECT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.db.project.findUnique({
      where: { id },
      select: PROJECT_SELECT,
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.ensureExists(id);
    return this.db.project.update({
      where: { id },
      data: dto,
      select: PROJECT_SELECT,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.db.project.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.db.project.count({ where: { id } });
    if (!count) throw new NotFoundException(`Project ${id} not found`);
  }
}
