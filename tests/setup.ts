/**
 * Jest 测试环境初始化
 *
 * ⚠️ 关键：必须在所有测试文件 import 之前设置环境变量
 * 这样 Prisma Client lazy init 时就能拿到正确的 SQLite URL
 */
import dotenv from 'dotenv';

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

/**
 * 网络护栏：阻止所有真实网络请求
 *
 * 目的：确保 AI Provider 测试不会意外调用真实 API
 * 实现：拦截 global.fetch，只对测试内部 URL 放行
 */
const originalFetch = globalThis.fetch;
let fetchMockEnabled = true;

// 允许的内网/测试 URL（如果有）
const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
];

// 覆盖 fetch
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!fetchMockEnabled) {
    return originalFetch(input, init);
  }

  const url = typeof input === 'string' ? input : (input as Request).url;

  // 检查是否是内网/测试 URL
  if (ALLOWED_HOSTS.some(host => url.includes(host))) {
    return originalFetch(input, init);
  }

  // 阻止外部请求
  throw new Error(`[Test Security] 禁止在测试中发起外部网络请求: ${url}`);
};

// 导出控制函数（供测试按需启用真实请求）
export function enableRealNetwork(): void {
  fetchMockEnabled = false;
}

export function disableRealNetwork(): void {
  fetchMockEnabled = true;
}
