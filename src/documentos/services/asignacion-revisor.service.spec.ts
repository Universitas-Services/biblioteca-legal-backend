import { Test, TestingModule } from '@nestjs/testing';
import { AsignacionRevisorService } from './asignacion-revisor.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AsignacionRevisorService', () => {
  let service: AsignacionRevisorService;
  const findFirst = jest.fn();

  beforeEach(async () => {
    findFirst.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsignacionRevisorService,
        {
          provide: PrismaService,
          useValue: {
            client: { user: { findFirst } },
          },
        },
      ],
    }).compile();

    service = module.get(AsignacionRevisorService);
  });

  it('prioriza revisor con tema específico', async () => {
    findFirst.mockResolvedValueOnce({ id: 'rev-especifico' });

    const id = await service.asignarPorTema('Derecho Civil');

    expect(id).toBe('rev-especifico');
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('asigna revisor General si no hay coincidencia específica', async () => {
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'rev-general' });

    const id = await service.asignarPorTema('Derecho Penal');

    expect(id).toBe('rev-general');
    expect(findFirst).toHaveBeenCalledTimes(2);
  });
});
