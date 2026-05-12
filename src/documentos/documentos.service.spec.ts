import { Test, TestingModule } from '@nestjs/testing';
import { DocumentosService } from './documentos.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DocumentosService', () => {
  let service: DocumentosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosService,
        {
          provide: StorageService,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {
            client: {
              documento: {
                findFirst: jest.fn(),
                create: jest.fn(),
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<DocumentosService>(DocumentosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
