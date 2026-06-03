import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EspecialidadService } from '../common/especialidad/especialidad.service';

describe('UsersService', () => {
  let service: UsersService;
  const findMany = jest.fn();
  const count = jest.fn();
  const ensureTemaGeneralEnCatalogo = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    findMany.mockReset();
    count.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: { client: { temaPrincipal: { findMany, count } } },
        },
        {
          provide: EspecialidadService,
          useValue: { ensureTemaGeneralEnCatalogo, listarEspecialidadesDisponibles: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('listarTemasConPersonal', () => {
    it('agrupa curadores y revisores por tema', async () => {
      findMany.mockResolvedValue([
        {
          id: 'tema-1',
          nombre: 'Derecho Civil',
          slug: 'derecho-civil',
          gcsUri: 'gs://bucket/tema-principal/derecho-civil/',
          revisores: [
            {
              id: 'c1',
              email: 'c@x.com',
              nombre: 'Ana',
              apellido: 'López',
              role: Role.CURADOR,
            },
            {
              id: 'r1',
              email: 'r@x.com',
              nombre: 'Luis',
              apellido: 'Pérez',
              role: Role.REVISOR,
            },
          ],
        },
      ]);

      count.mockResolvedValue(15);

      const result = await service.listarTemasConPersonal({ page: 2, limit: 10 });

      expect(ensureTemaGeneralEnCatalogo).toHaveBeenCalled();
      expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(15);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(result.items[0].curadores).toHaveLength(1);
      expect(result.items[0].revisores).toHaveLength(1);
      expect(result.items[0].curadores[0].email).toBe('c@x.com');
    });
  });
});
