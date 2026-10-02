module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // 支持 Next.js 的 @/ 路径别名
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // 增加超时时间以支持 PostgreSQL 远程连接
  testTimeout: 60000,
  hookTimeout: 60000,
  // 测试前加载 .env.test（必须在模块 import 之前）
  setupFiles: ['<rootDir>/tests/setup.js'],
  // 禁用并发，避免测试间数据竞争
  maxWorkers: 1,
  serial: true,
  // 测试前重新生成 Prisma Client（使用 SQLite schema）
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
      },
    }],
  },
};
