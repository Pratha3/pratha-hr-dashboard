import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/database';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await prisma.$disconnect();
});
