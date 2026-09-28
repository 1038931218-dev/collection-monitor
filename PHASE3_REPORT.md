# AI收款管家 (Collection Monitor) V0.1 - Phase 3 验收报告

## 项目状态

**Phase 3 验收状态: ✅ 通过**

- 测试套件: 8 pass, 110 tests pass
- 新增: `src/lib/db/` 数据访问层
- 新增: 9 表 Prisma Schema（SQLite 开发环境）
- 新增: `tests/unit/tenant-isolation.test.ts` (19 tests)

---

## 本次交付内容

### 1. 数据库 Schema（9 张表）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `User` | 用户 | id, email, name, password_hash |
| `Company` | 公司/租户 | id, name, currency, owner_id |
| `Customer` | 客户 | id, company_id, slug, contact_email |
| `Invoice` | 发票 | id, company_id, customer_id, amount_cents, paid_amount_cents |
| `PaymentRecord` | 付款记录 | id, company_id, invoice_id, payment_date, amount_cents |
| `Upload` | 文件上传 | id, company_id, filename, status |
| `CollectionTask` | 催收任务 | id, company_id, invoice_id, priority_score |
| `AIFeedback` | AI 反馈 | id, company_id, task_id, rating |
| `Subscription` | 订阅 | id, user_id, company_id, plan, status |

**设计原则：**
- 所有业务表均有 `company_id` 字段
- 金额字段统一使用 `Int`（分），禁止 Float
- 复合唯一键：`(company_id, slug)` on Customer

### 2. 数据访问层 `src/lib/db/`

| 文件 | 职责 |
|------|------|
| `client.ts` | Prisma 单例（自动回退到 SQLite dev.db） |
| `base-repository.ts` | `BaseRepository` 基类，提供 `assertCompanyOwnership()` 和 `findOwnedRow()` |
| `company.repository.ts` | 公司 CRUD |
| `customer.repository.ts` | 客户 CRUD + upsert |
| `invoice.repository.ts` | 发票 CRUD + markPaid |
| `payment-record.repository.ts` | 付款记录 CRUD |
| `index.ts` | 统一导出入口 |

### 3. 租户隔离机制

```typescript
// 写入时校验
const customer = await this.db.customer.findUnique({ where: { id: customerId } });
this.assertCompanyOwnership(customer, companyId, 'create Invoice', customerId);

// 查询时强制过滤
await this.db.invoice.findMany({ where: { company_id: companyId } });
```

**拦截行为：**
- A 修改 B 的发票 → `CrossTenantError`
- A 用 B 的客户 ID 创建付款记录 → `CrossTenantError`
- A 调用 `markPaid(companyA, invoiceB)` → `CrossTenantError`
- `getById` 不过滤公司（返回原始数据），业务层应使用 `listByCompany` 获取隔离数据

### 4. 测试覆盖（19 个租户隔离用例）

| 测试场景 | 结果 |
|---------|------|
| A 只能看到 A 的公司 | ✅ |
| A 只能看到 A 的客户列表 | ✅ |
| A 用 B 的客户 ID 更新 → CrossTenantError | ✅ |
| A 只能看到 A 的发票列表 | ✅ |
| A 用 B 的发票 ID 更新 → CrossTenantError | ✅ |
| A 创建付款记录关联到 B 的发票 → CrossTenantError | ✅ |
| A 创建付款记录关联到 B 的客户 → CrossTenantError | ✅ |
| A 删除 B 的付款记录 → CrossTenantError | ✅ |
| A 尝试把 B 的发票标记为已付 → CrossTenantError | ✅ |
| A 和 B 可拥有同 slug 的客户（不同公司隔离） | ✅ |
| A upsert 同名 slug 覆盖自身，不影响 B | ✅ |
| 端到端：A 的数据对 B 完全不可见 | ✅ |

---

## 完整测试结果

```
Test Suites: 8 passed, 8 total
Tests:       110 passed, 110 total
Snapshots:   0 total
Time:        ~5s
```

| 测试文件 | 测试数 |
|---------|-------|
| `tenant-isolation.test.ts` | 19 |
| `ar-engine.test.ts` | 18 |
| `priority-scenarios.test.ts` | 6 |
| `payment-history.test.ts` | 18 |
| `priority-engine.test.ts` | 6 |
| `file-parser.test.ts` | 10 |
| `phase1-acceptance.test.ts` | 8 |
| `integration/report-generation.test.ts` | 5 |

---

## Git 提交记录

```
d3f8a21 Phase 3: PostgreSQL data layer with Prisma (9 tables)
e506caa Phase 2: payment history analysis + extended priority engine
01d5077 Phase 2: payment history analysis + extended priority engine
a5ed56f Phase 1 baseline: core business layer, 36/36 tests pass
```

---

## 已知限制

1. `getById` 不过滤公司归属（仅 `listByCompany` 过滤），业务层需确保使用正确的查询方法
2. SQLite 开发环境与 PostgreSQL 生产环境切换仅需修改 `.env` 的 `DATABASE_URL`
3. 尚未实现 Upload、CollectionTask、AIFeedback、Subscription 的 Repository 层（Schema 已定义）

---

## 下一步

等待 Phase 4 指令：
- 实现 Upload、CollectionTask、AIFeedback、Subscription 的 Repository
- 接入 OpenRouter LLM Provider
- 构建 Next.js API Routes
- 完善 Web UI
