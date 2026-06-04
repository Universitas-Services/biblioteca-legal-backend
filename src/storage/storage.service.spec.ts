import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StorageService', () => {
  let service: StorageService;
  let createFolderSpy: jest.SpiedFunction<StorageService['createFolder']>;
  const originalEnv = process.env;

  const subcarpetaFindFirst = jest.fn();
  const carpetaInternaFindFirst = jest.fn();
  const carpetaInternaFindUnique = jest.fn();
  const carpetaInternaCreate = jest.fn();
  const carpetaInternaFindMany = jest.fn();

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      GCP_PROJECT_ID: 'test-project',
      GCP_KEY_FILE_PATH: './test-key.json',
      GCP_STORAGE_BUCKET_NAME: 'test-bucket',
    };

    subcarpetaFindFirst.mockReset();
    carpetaInternaFindFirst.mockReset();
    carpetaInternaFindUnique.mockReset();
    carpetaInternaCreate.mockReset();
    carpetaInternaFindMany.mockReset();

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
                findFirst: subcarpetaFindFirst,
                create: jest.fn(),
                findMany: jest.fn(),
              },
              carpetaInterna: {
                findFirst: carpetaInternaFindFirst,
                findUnique: carpetaInternaFindUnique,
                findMany: carpetaInternaFindMany,
                create: carpetaInternaCreate,
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    createFolderSpy = jest
      .spyOn(service, 'createFolder')
      .mockResolvedValue('gs://test-bucket/tema-principal/tema/sub/carpeta/');
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCarpetaInternaRaiz', () => {
    it('crea carpeta nivel 1 con path GCS bajo subcarpeta', async () => {
      subcarpetaFindFirst.mockResolvedValue({
        id: 'sub-1',
        slug: 'ley-organica',
        temaPrincipal: { slug: 'derecho-civil' },
      });
      carpetaInternaFindFirst.mockResolvedValue(null);
      carpetaInternaCreate.mockResolvedValue({
        id: 'c1',
        nombre: 'Sección A',
        slug: 'seccion-a',
        descripcion: null,
        gcsUri: 'gs://test-bucket/tema-principal/derecho-civil/ley-organica/seccion-a/',
        nivel: 1,
        parentId: null,
        subcarpetaNormaId: 'sub-1',
        eliminado: false,
        fechaEliminacion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        subcarpetaNorma: {
          slug: 'ley-organica',
          temaPrincipal: { slug: 'derecho-civil' },
        },
      });

      const result = await service.createCarpetaInternaRaiz('sub-1', 'Sección A', 'seccion-a');

      expect(createFolderSpy).toHaveBeenCalledWith(
        'tema-principal/derecho-civil/ley-organica/seccion-a/',
      );
      expect(carpetaInternaCreate).toHaveBeenCalledTimes(1);
      expect(result.nivel).toBe(1);
      expect(result.parentId).toBeNull();
      expect(result.path).toBe('tema-principal/derecho-civil/ley-organica/seccion-a/');
    });
  });

  describe('createCarpetaInternaHija', () => {
    it('incrementa nivel y extiende path GCS', async () => {
      carpetaInternaFindFirst.mockResolvedValueOnce({
        id: 'padre-1',
        slug: 'seccion-a',
        nivel: 1,
        subcarpetaNormaId: 'sub-1',
        subcarpetaNorma: {
          slug: 'ley-organica',
          temaPrincipal: { slug: 'derecho-civil' },
        },
      });
      carpetaInternaFindFirst.mockResolvedValueOnce(null);
      carpetaInternaFindUnique.mockResolvedValue({
        slug: 'seccion-a',
        parentId: null,
      });
      carpetaInternaCreate.mockResolvedValue({
        id: 'c2',
        nombre: 'Sección A.1',
        slug: 'seccion-a-1',
        descripcion: null,
        gcsUri: 'gs://test-bucket/tema-principal/derecho-civil/ley-organica/seccion-a/seccion-a-1/',
        nivel: 2,
        parentId: 'padre-1',
        subcarpetaNormaId: 'sub-1',
        eliminado: false,
        fechaEliminacion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        subcarpetaNorma: {
          slug: 'ley-organica',
          temaPrincipal: { slug: 'derecho-civil' },
        },
      });

      const result = await service.createCarpetaInternaHija(
        'padre-1',
        'Sección A.1',
        'seccion-a-1',
      );

      expect(createFolderSpy).toHaveBeenCalledWith(
        'tema-principal/derecho-civil/ley-organica/seccion-a/seccion-a-1/',
      );
      expect(result.nivel).toBe(2);
    });

    it('rechaza crear hijo si el padre está en nivel 10', async () => {
      carpetaInternaFindFirst.mockResolvedValue({
        id: 'padre-10',
        slug: 'nivel-10',
        nivel: 10,
        subcarpetaNormaId: 'sub-1',
        subcarpetaNorma: {
          slug: 'ley',
          temaPrincipal: { slug: 'tema' },
        },
      });

      await expect(service.createCarpetaInternaHija('padre-10', 'Hijo', 'hijo')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza slug duplicado entre hermanos', async () => {
      carpetaInternaFindFirst.mockResolvedValueOnce({
        id: 'padre-1',
        slug: 'seccion-a',
        nivel: 1,
        subcarpetaNormaId: 'sub-1',
        subcarpetaNorma: {
          slug: 'ley',
          temaPrincipal: { slug: 'tema' },
        },
      });
      carpetaInternaFindFirst.mockResolvedValueOnce({ id: 'existente' });

      await expect(service.createCarpetaInternaHija('padre-1', 'Dup', 'dup')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
