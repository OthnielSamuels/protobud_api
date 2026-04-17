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
import { ClientService } from './client.service';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // -----------------------------------------------------------
  // CREATE
  // POST /clients
  // -----------------------------------------------------------
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientService.create(dto);
  }

  // -----------------------------------------------------------
  // FIND ALL
  // GET /clients
  // Optional: ?phone=123456
  // -----------------------------------------------------------
  @Get()
  findAll(@Query('phone') phone?: string) {
    if (phone) {
      return this.clientService.findByPhone(phone);
    }
    return this.clientService.findAll();
  }

  // -----------------------------------------------------------
  // FIND ONE
  // GET /clients/:id
  // -----------------------------------------------------------
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientService.findOne(id);
  }

  // -----------------------------------------------------------
  // UPDATE
  // PATCH /clients/:id
  // -----------------------------------------------------------
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientService.update(id, dto);
  }

  // -----------------------------------------------------------
  // DELETE
  // DELETE /clients/:id
  // -----------------------------------------------------------
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientService.remove(id);
  }

  // -----------------------------------------------------------
  // FIND OR CREATE (useful for WhatsApp / automation)
  // POST /clients/find-or-create
  // -----------------------------------------------------------
  @Post('find-or-create')
  findOrCreate(@Body() dto: CreateClientDto) {
    return this.clientService.findOrCreate(dto);
  }
}
