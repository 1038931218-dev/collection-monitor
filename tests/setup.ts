/**
 * Jest 测试环境初始化
 *
 * ⚠️ 关键：必须在所有测试文件 import 之前设置环境变量
 * 这样 Prisma Client lazy init 时就能拿到正确的 SQLite URL
 */
beforeAll(() => {
  // 必须在这里设置，而不是在 beforeEach
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.env as any).NODE_ENV = 'test';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.env as any).DATABASE_URL = 'file:./prisma/dev.db';
});

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (process.env as any).NODE_ENV;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (process.env as any).DATABASE_URL;
});
