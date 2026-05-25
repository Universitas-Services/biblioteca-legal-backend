import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakerService } from './matchmaker.service';
import { PrismaService } from '../prisma/prisma.service';

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

  it('returns null matrizA when no items', async () => {
    const result = await service.match(['ley', 'civil']);
    expect(result.matrizA).toBeNull();
    expect(result.matrizB).toEqual([]);
  });
});
