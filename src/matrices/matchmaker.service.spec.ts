import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakerService } from './matchmaker.service';
import { PrismaService } from '../prisma/prisma.service';
import { TipoSolucion } from '@prisma/client';

const mockMatrizA = {
  id: 'uuid-a-1',
  nombreProducto: 'Curso de Gestión Pública',
  tipoSolucion: TipoSolucion.CURSO,
  urlDestino: 'https://universitas.com/curso-gestion-publica',
  categoriasKeywords: ['gestión', 'pública', 'contratos'],
  activo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMatrizB = {
  id: 'uuid-b-1',
  tituloArticulo: 'Análisis de la Ley de Contrataciones',
  autorArticulo: 'Julio Pérez',
  urlDestinoAgora: 'https://agora.universitas.com/analisis-ley',
  categoriasKeywords: ['contratos', 'licitación'],
  activo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MatchmakerService', () => {
  let service: MatchmakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakerService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              matrizA: { findMany: jest.fn().mockResolvedValue([]) },
              matrizB: { findMany: jest.fn().mockResolvedValue([]) },
            },
          },
        },
      ],
    }).compile();

    service = module.get<MatchmakerService>(MatchmakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns null matrizA and empty matrizB when no items', async () => {
    const result = await service.match(['ley', 'civil']);
    expect(result.matrizA).toBeNull();
    expect(result.matrizB).toEqual([]);
  });

  it('ranks matrizA by categoriasKeywords match score', async () => {
    const prismaService = service['prisma'];
    (prismaService.client.matrizA.findMany as jest.Mock).mockResolvedValue([mockMatrizA]);
    (prismaService.client.matrizB.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.match(['gestión', 'pública']);
    expect(result.matrizA?.id).toBe('uuid-a-1');
  });

  it('ranks matrizB by categoriasKeywords and returns max 2', async () => {
    const prismaService = service['prisma'];
    (prismaService.client.matrizA.findMany as jest.Mock).mockResolvedValue([]);
    (prismaService.client.matrizB.findMany as jest.Mock).mockResolvedValue([mockMatrizB]);

    const result = await service.match(['contratos', 'licitación']);
    expect(result.matrizB.length).toBe(1);
    expect(result.matrizB[0].id).toBe('uuid-b-1');
  });
});
