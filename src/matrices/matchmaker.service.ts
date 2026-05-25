import { Injectable } from '@nestjs/common';
import { MatrizA, MatrizB } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MatchmakerResult {
  matrizA: MatrizA | null;
  matrizB: MatrizB[];
}

@Injectable()
export class MatchmakerService {
  constructor(private prisma: PrismaService) {}

  private scoreKeywords(itemKeywords: string[], query: string[]): number {
    const normalizedQuery = query.map(k => k.toLowerCase().trim());
    return itemKeywords.filter(k => normalizedQuery.includes(k.toLowerCase().trim())).length;
  }

  async match(palabrasClave: string[]): Promise<MatchmakerResult> {
    const [matricesA, matricesB] = await Promise.all([
      this.prisma.client.matrizA.findMany({ where: { activo: true } }),
      this.prisma.client.matrizB.findMany({ where: { activo: true } }),
    ]);

    const rankedA = matricesA
      .map(m => ({ m, score: this.scoreKeywords(m.palabrasClave, palabrasClave) }))
      .sort((a, b) => b.score - a.score);

    const rankedB = matricesB
      .map(m => ({ m, score: this.scoreKeywords(m.palabrasClave, palabrasClave) }))
      .sort((a, b) => b.score - a.score);

    const matrizA = rankedA[0]?.m ?? matricesA[0] ?? null;
    const matrizB = rankedB.slice(0, 2).map(r => r.m);

    if (matrizB.length < 2 && matricesB.length >= 2) {
      const extras = matricesB
        .filter(m => !matrizB.find(x => x.id === m.id))
        .slice(0, 2 - matrizB.length);
      matrizB.push(...extras);
    }

    return { matrizA, matrizB: matrizB.slice(0, 2) };
  }
}
