import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentosService } from './documentos.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { ValidarDuplicidadService } from './services/validar-duplicidad.service';
import { AsignacionRevisorService } from './services/asignacion-revisor.service';
import { CategoriasService } from '../categorias/categorias.service';

describe('DocumentosService', () => {
  let service: DocumentosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosService,
        { provide: StorageService, useValue: { uploadDocument: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            client: {
              documento: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
              $transaction: jest.fn(),
            },
          },
        },
        { provide: ValidarDuplicidadService, useValue: { validar: jest.fn() } },
        { provide: AsignacionRevisorService, useValue: { asignarPorTema: jest.fn() } },
        { provide: CategoriasService, useValue: { validarIdsAprobadas: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<DocumentosService>(DocumentosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
