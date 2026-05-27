import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StorageService', () => {
  let service: StorageService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      GCP_PROJECT_ID: 'test-project',
      GCP_KEY_FILE_PATH: './test-key.json',
      GCP_STORAGE_BUCKET_NAME: 'test-bucket',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              temaPrincipal: {
                findUnique: jest.fn(),
                create: jest.fn(),
                findMany: jest.fn(),
              },
              subcarpetaNorma: {
                findUnique: jest.fn(),
                create: jest.fn(),
                findMany: jest.fn(),
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
