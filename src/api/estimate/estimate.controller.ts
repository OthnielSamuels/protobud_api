import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EstimateService } from './estimate.service';
import {
  CreateEstimateDto,
  UpdateEstimateDto,
  UpdateEstimateItemDto,
} from '../dto/estimate.dto';

@Controller('estimates')
export class EstimateController {
  constructor(private readonly estimateService: EstimateService) {}

  @Post()
  create(@Body() dto: CreateEstimateDto) {
    return this.estimateService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estimateService.findOne(id);
  }

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    return this.estimateService.findByProject(projectId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEstimateDto,
  ) {
    return this.estimateService.update(id, dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateEstimateItemDto,
  ) {
    return this.estimateService.updateItem(itemId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.estimateService.remove(id);
  }
}