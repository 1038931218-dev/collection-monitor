/**
 * 测试环境准备脚本 - 切换到 SQLite schema 并生成 Client
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 项目根目录（脚本所在目录的父目录）
const projectRoot = path.resolve(__dirname, '..');
const prismaDir = path.join(projectRoot, 'prisma');
const originalSchema = path.join(prismaDir, 'schema.prisma');
const testSchema = path.join(prismaDir, 'schema.test.prisma');
const backupSchema = path.join(prismaDir, 'schema.original.prisma');

function setup() {
  console.log('Setting up test environment...');
  
  // 备份原始 schema（如果还没有备份）
  if (!fs.existsSync(backupSchema)) {
    fs.copyFileSync(originalSchema, backupSchema);
    console.log('✓ Backed up original schema');
  }
  
  // 复制测试 schema 到 active schema
  fs.copyFileSync(testSchema, originalSchema);
  console.log('✓ Switched to SQLite schema');
  
  // 设置环境变量
  process.env.PRISMA_PROVIDER = 'sqlite';
  
  // 重新生成 Prisma Client
  try {
    execSync('npx prisma generate --schema=prisma/schema.test.prisma', {
      stdio: 'inherit',
      cwd: projectRoot
    });
    console.log('✓ Prisma Client generated for SQLite');
  } catch (err) {
    console.error('✗ Prisma generate failed:', err.message);
    process.exit(1);
  }
}

function cleanup() {
  console.log('Cleaning up test environment...');
  
  // 恢复原始 schema
  if (fs.existsSync(backupSchema)) {
    fs.copyFileSync(backupSchema, originalSchema);
    console.log('✓ Restored original schema');
  }
  
  // 重新生成 Prisma Client
  process.env.PRISMA_PROVIDER = 'postgresql';
  try {
    execSync('npx prisma generate --schema=prisma/schema.prisma', {
      stdio: 'inherit',
      cwd: projectRoot
    });
    console.log('✓ Prisma Client restored for PostgreSQL');
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
