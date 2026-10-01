/**
 * 测试环境准备脚本
 * 
 * 安全原则：
 * 1. 只设置环境变量，不修改 schema.prisma
 * 2. 测试使用独立 schema (schema.test.prisma)
 * 3. 生产 schema 保持原样
 */
const { execSync } = require('child_process');
const path = require('path');

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');

function setup() {
  console.log('Setting up test environment...');
  
  // 只设置环境变量
  process.env.NODE_ENV = 'test';
  
  // 使用测试 schema 生成 Prisma Client
  try {
    execSync('npx prisma generate --schema=prisma/schema.test.prisma', {
      stdio: 'inherit',
      cwd: projectRoot
    });
    console.log('✓ Prisma Client generated for SQLite (test)');
  } catch (err) {
    console.error('✗ Prisma generate failed:', err.message);
    process.exit(1);
  }
}

function cleanup() {
  console.log('Cleaning up test environment...');
  
  // 恢复生产 schema 并重新生成
  try {
    execSync('npx prisma generate --schema=prisma/schema.prisma', {
      stdio: 'inherit',
      cwd: projectRoot
    });
    console.log('✓ Prisma Client restored for PostgreSQL (production)');
  } catch (err) {
    console.error('⚠ Prisma generate restore failed:', err.message);
  }
}

const cmd = process.argv[2];
if (cmd === 'cleanup') {
  cleanup();
} else {
  setup();
}
