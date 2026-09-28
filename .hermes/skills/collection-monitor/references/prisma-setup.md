# Prisma + PostgreSQL 数据层开发指南

## Prisma 版本

本项目使用 **Prisma 6.x**（稳定版）。不要升级或降级，否则 CLI 命令不兼容：

```bash
# 锁定版本（已安装在 package.json devDependencies）
npm install -D prisma@6.7.0
npm install @prisma/client@6.7.0
```

**常见错误：**
- `npx prisma migrate dev --name init` 成功 → 正常
- `npx prisma db push` → Prisma 6 无此命令，改用 `migrate dev`
- `npx prisma generate` → Prisma 6 在 `migrate dev` 后自动执行；若需要手动则 `npx prisma generate`

## 开发环境配置

`.env` 默认使用 SQLite 开发数据库（不依赖外部数据库服务）：

```
DATABASE_URL="file:./dev.db"
```

正式生产时切换为 PostgreSQL：

```
DATABASE_URL="postgresql://user:pass@localhost:5432/collection_monitor"
```

数据库文件位置：`prisma/dev.db`（SQLite 开发用）

## 迁移命令

```bash
cd F:/runfeng/collection-monitor

# 初始化/应用迁移（推荐，同时生成 Client）
npx prisma migrate dev --name <描述>

# 仅生成 Prisma Client（不执行迁移）
npx prisma generate
```

## Schema 设计原则

所有业务表必须带 `company_id`（多租户隔离），金额字段统一用 Int（cents 分）：

```prisma
model Company {
  id     String   @id @default(cuid())
  name   String
  // ...
}

model Invoice {
  id             String   @id @default(cuid())
  company_id     String
  company        Company  @relation(fields: [company_id], references: [id])
  customer_id    String
  amount_cents   Int      // 金额用 cents，禁止 Float/Decimal
  // ...
  @@index([company_id, customer_id])
}
```

**复合唯一键示例：**

```prisma
@@unique([company_id, slug])  // Customer 表
```

## Repository 基类模式

所有 Repository 继承 `BaseRepository`，提供：

```typescript
// 强制公司归属校验
protected assertCompanyOwnership(row: { company_id: string }, companyId: string, action: string, rowId: string)

// 可选：先查再校验的便捷方法
protected async findOwnedRow<T extends { company_id: string }>(fetch: () => Promise<T | null>, companyId, action, label): Promise<T | null>
```

## 常见坑

1. **`Prisma.XGetPayload<never>` 泛型参数错误**：不要用 `<never>`，直接让 TypeScript 自动推断返回类型。
2. **`PaymentHistoryAnalysis` 类型兼容性**：确保测试 fixtures 里的字面量类型（如 `payment_behavior: 'ON_TIME'`）符合 `as const` 断言，否则 TS 推断为 `string`。
3. **Prisma 8 RC 命令不兼容**：Prisma 8 有 breaking changes，始终使用 6.x LTS。
4. **Git lock 文件**：commit 卡住时 `rm -f .git/index.lock`，先 `.gitignore` node_modules/.next/dist。
