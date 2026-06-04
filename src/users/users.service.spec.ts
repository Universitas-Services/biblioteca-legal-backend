import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EspecialidadService } from '../common/especialidad/especialidad.service';

describe('UsersService', () => {
  let service: UsersService;
  const temaFindMany = jest.fn();
  const temaCount = jest.fn();
  const userFindMany = jest.fn();
  const userCount = jest.fn();
  const ensureTemaGeneralEnCatalogo = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    temaFindMany.mockReset();
    temaCount.mockReset();
    userFindMany.mockReset();
    userCount.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              temaPrincipal: { findMany: temaFindMany, count: temaCount },
              user: { findMany: userFindMany, count: userCount },
            },
          },
        },
        {
          provide: EspecialidadService,
          useValue: { ensureTemaGeneralEnCatalogo, listarEspecialidadesDisponibles: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('listarUsuariosAdmin', () => {
    it('devuelve nombre, apellido, correo, rol y temas para curador/revisor', async () => {
      userFindMany.mockResolvedValue([
        {
          id: 'c1',
          nombre: 'Ana',
          apellido: 'López',
          email: 'ana@x.com',
          role: Role.CURADOR,
          temasAsignados: [{ id: 't1', nombre: 'General', slug: 'general' }],
        },
        {
          id: 'a1',
          nombre: 'María',
          apellido: 'García',
          email: 'maria@x.com',
          role: Role.AUDITOR,
          temasAsignados: [],
        },
      ]);
      userCount.mockResolvedValue(2);

      const result = await service.listarUsuariosAdmin({ page: 1, limit: 10 });

      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: { in: [Role.CURADOR, Role.REVISOR, Role.AUDITOR, Role.ADMIN] } },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 'c1',
        nombre: 'Ana',
        apellido: 'López',
        correo: 'ana@x.com',
        rol: Role.CURADOR,
        temasPrincipales: [{ id: 't1', nombre: 'General', slug: 'general' }],
      });
      expect(result.items[1].temasPrincipales).toBeNull();
    });

    it('filtra por rol cuando se envía en query', async () => {
      userFindMany.mockResolvedValue([]);
      userCount.mockResolvedValue(0);

      await service.listarUsuariosAdmin({ role: Role.ADMIN });

      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: Role.ADMIN } }),
      );
    });
  });

  describe('listarTemasConPersonal', () => {
    it('agrupa curadores y revisores por tema', async () => {
      temaFindMany.mockResolvedValue([
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

      temaCount.mockResolvedValue(15);

      const result = await service.listarTemasConPersonal({ page: 2, limit: 10 });

      expect(ensureTemaGeneralEnCatalogo).toHaveBeenCalled();
      expect(temaFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
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
