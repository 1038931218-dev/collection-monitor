# Commit 28b753f 落地状态核实报告

**核实时间**: 2026-10-01
**核实人**: 润颖 (Hermes Agent)

---

## 一、Git 状态

```
HEAD:        28b753f P0第三轮：PT-01/PT-04深度修复+安全闸门+Prisma配置修复
Working Dir: CLEAN (仅 prisma/dev.db 和报告文件有未提交修改，属预期行为)
Commit 内容: 9 files changed, 632 insertions(+), 56 deletions(-)
```

**文件清单**:
- `prisma/schema.prisma` - provider 硬编码修复
- `scripts/test-setup.js` - 不再修改生产 schema
- `src/app/api/analyze/route.ts` - 使用 StrictDate.parse()
- `src/lib/ai/openrouter-provider.ts` - 添加 sanitizeString()
- `src/lib/db/client.ts` - 增强安全闸门 FAIL CLOSED
- `src/lib/strict-date.ts` - **新增**严格日期解析
- `tests/unit/pt01-date-injection.test.ts` - **新增** PT-01 回归测试
- `tests/unit/pt04-prompt-injection.test.ts` - **新增** PT-04 回归测试

---

## 二、关键文件核实

### ✅ PT-01 修复

**src/lib/strict-date.ts** (已确认存在):
- 拒绝不存在日期：2026-02-30、2026-02-29 → null
- 拒绝非法格式：13/02/2026、32/13/2026 → null
- 拒绝 NaN/Infinity/空字符串/null → null
- 验证解析后日期与输入一致（防止 JS 自动滚动）

**src/app/api/analyze/route.ts** (已确认修改):
```typescript
const invoiceDate = StrictDate.parse(inv.invoice_date);
const dueDate = StrictDate.parse(inv.due_date);
if (!invoiceDate || !dueDate) return null; // 拒绝非法日期
```
- **不再**使用 `new Date(inv.due_date)` 直接解析

### ✅ PT-04 修复

**src/lib/ai/openrouter-provider.ts** (已确认修改):
```typescript
function sanitizeString(str: string, maxLength: number): string {
  const sanitized = str.replace(/[\r\n\t]/g, ' ').slice(0, maxLength);
  return sanitized.replace(/#/g, '\\#').replace(/`/g, '\\`')...
}
```
- 客户名限制 100 字符
- 发票号限制 50 字符
- 原因限制 500 字符
- 转义 `#`、`` ` ``、`*`、`_` 防止 markdown 注入
- 移除换行符防止形成新 section

### ✅ P0-04 修复

**prisma/schema.prisma**:
```prisma
datasource db {
  provider = "postgresql"  // 硬编码，不再依赖 env("PRISMA_PROVIDER")
  url      = env("DATABASE_URL")
}
```

### ✅ P0-05 修复

**scripts/test-setup.js**:
- 只设置 `process.env.NODE_ENV = 'test'`
- 使用 `prisma generate --schema=prisma/schema.test.prisma` 生成测试 Client
- cleanup 时恢复生产 schema
- **不再**修改 `prisma/schema.prisma`

### ✅ P1-01 修复

**src/lib/db/client.ts**:
```typescript
function assertSafeDatabaseUrl(url: string): void {
  if (process.env.NODE_ENV !== 'test') {
    // 生产环境检测到 postgresql://... → 抛错
    throw new Error('[P0-SAFETY] 生产环境检测到生产数据库连接！');
  }
  
  // 测试环境：检测 neon.tech / postgres:// → 抛错
  if (url.toLowerCase().includes('neon.tech')) {
    throw new Error('[P0-SAFETY] 测试环境检测到生产数据库连接！');
  }
  
  // 测试环境必须使用 SQLite
  const isSQLite = url.includes('sqlite') || url.endsWith('.db');
  if (!isSQLite) {
    throw new Error('[P0-SAFETY] 测试环境必须使用 SQLite！');
  }
}
```

---

## 三、测试验证

```
总测试数: 255 (原 230 + 新增 25)
通过: 255
失败: 0
通过率: 100%

Test Suites: 18 passed, 18 total

Build: PASS
```

---

## 四、jest.config.js 说明

**状态**: 未修改（本 commit 不包含 jest.config.js 变更）

**现有警告**:
- `hookTimeout: 60000` - Jest 识别为无效配置项，但非致命错误
- `serial: true` - 同上

**实际生效的串行配置**:
- `maxWorkers: 1` - 禁用并发测试，确保测试间无数据竞争

---

## 五、安全原则保留验证

| 原则 | 状态 |
|------|------|
| AI 不能修改 priority_score | ✅ 保留 |
| AI 不能修改 priority_level | ✅ 保留 |
| AI 不能修改金额 | ✅ 保留 |
| AI 不能修改逾期天数 | ✅ 保留 |
| AI 不能修改日期 | ✅ 保留 |
| AI 不能制造财务数据 | ✅ 保留 |
| 非法日期不能进入 AR 计算 | ✅ 已修复 |
| AI 失败不能影响确定性计算 | ✅ 已修复 |
| 用户数据不能成为 System Instruction | ✅ 已修复 |
| 测试不能触碰生产数据库 | ✅ 已修复 |
| 测试不能修改生产 schema | ✅ 已修复 |
| 不允许跨租户访问 | ✅ 保留 |

---

## 六、待确认问题

### ⚠️ 需要补充：安全闸门专项测试

**现状**: `assertSafeDatabaseUrl()` 已实现 FAIL CLOSED 逻辑，但缺少专项测试证明其在真实危险场景下会抛出错误。

**建议补充测试**:
```typescript
test('生产 DATABASE_URL 在测试环境应触发安全闸门', () => {
  process.env.NODE_ENV = 'test';
  expect(() => assertSafeDatabaseUrl('postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/db'))
    .toThrow('[P0-SAFETY]');
});
```

---

## 七、结论

| 项目 | 状态 |
|------|------|
| PT-01 修复落地 | ✅ 确认 |
| PT-04 修复落地 | ✅ 确认 |
| P0-03 新增测试 | ✅ 25 项 |
| P0-04 Prisma 配置 | ✅ 已修复 |
| P0-05 test-setup | ✅ 已修复 |
| P1-01 安全闸门 | ✅ 已实现，缺专项测试 |
| 全量测试通过 | ✅ 255/255 |
| Build 通过 | ✅ |
| Git 状态 | ✅ clean |

**整体状态**: 除 P1-01 安全闸门专项测试外，所有 P0 修复已正确落地。

---

**建议**: 可以先提交给润行复测 PT-01/PT-04，同时补充安全闸门专项测试后一并复测。
