/**
 * Jest 测试环境初始化脚本（setupFiles）
 *
 * ⚠️ 关键：此文件在 jest 环境初始化之前执行，不能用 beforeAll/afterAll
 * 必须在所有测试文件 import 之前设置环境变量，这样 Prisma Client lazy init
 * 时就能拿到正确的 SQLite URL
 */
const path = require('path');

// 确保关键环境变量已设置（兜底保护）
process.env.NODE_ENV = 'test';
// 使用项目根目录的 prisma/dev.db
process.env.DATABASE_URL = 'file:./prisma/dev.db';
