# AI收款管家 (Collection Monitor) V0.1 - Phase 1 验收报告

## 项目状态

**Phase 1 验收状态: ✅ 通过（含验收期间 Bug 修复）**

- 测试套件: 5 pass, 36 tests pass
- 核心链路: Excel/CSV → Parser → Normalizer → AR Engine → Priority Engine → Report JSON ✅
- Bug 修复: `average_payment_days: 0` → `null`，确保无历史数据时 `history_score=40`（UNKNOWN）而非误判为"准时"
- 验收发现: 同一数据两条路径（直接调用 vs 经 Tasks）优先级评分不一致 → 已修复，现已一致（INV-006 = 55 MEDIUM）

---

## Phase 1 最终状态

### 已实现功能

| 模块 | 文件 | 功能 |
|------|------|------|
| 精确数值 | `src/lib/decimal.ts` | DecimalMoney 类，所有金额以 cents（整数分）存储，无浮点误差 |
| 文件解析 | `src/file-parser/index.ts` | CSV/XLSX 解析，字段自动识别，中/英文字段支持 |
| 数据标准化 | `src/data-normalizer/index.ts` | 空值过滤、重复去重、日期标准化、状态判定 |
| AR 计算 | `src/ar-engine/index.ts` | Outstanding Amount、Days Overdue、Aging Bucket、客户聚合 |
| 优先级引擎 | `src/priority-engine/index.ts` | 公式: overdue×0.35 + amount×0.25 + history×0.20 + trend×0.20 |
| 报告生成 | `src/lib/report-generator.ts` | AR Health Report + Top 5 Priority |

### 技术栈

- Node.js 24.15.0
- TypeScript 5.4.5
- Jest 29.7.0（测试框架）
- SheetJS xlsx（Excel 解析）
- Decimal.js（精确数值）

---

## 5 项检查结论

### 1. 金额精度 ✅

DecimalMoney 在所有场景均无浮点误差：

| 场景 | 输入 | 输出 cents | 验证 |
|------|------|-----------|------|
| 0.1 + 0.2 | 10 + 20 | 30 | ✅ 正确（30 cents = $0.30） |
| 大金额累计 | 123456789.99 + 987654321.01 + 500000.50 | 111161111150 | ✅ |
| 部分付款 | $5000 - $1234.56 | 376544 | ✅ ($3765.44) |
| 超付 clamp | $1000 - $1500 | -50000 | ✅ 负数由下游 clamp 为 0 |
| 多笔累计 | 4 笔发票合计 | 一致 | ✅ |

**输出格式统一**: 所有金额使用 `toString()` 输出为 `$X,XXX.XX` 格式。

### 2. 数据模型可扩展性 ⚠️

当前 `NormalizedInvoice` 结构：

```typescript
interface NormalizedInvoice {
  customer_name: string;
  invoice_number?: string;
  invoice_date: Date;
  due_date: Date;
  amount: DecimalMoney;
  paid_amount: DecimalMoney;
  outstanding_amount: DecimalMoney;
  is_overdue: boolean;
  days_overdue: number;
  status: InvoiceStatus;  // PAID | PARTIALLY_PAID | UNPAID | OVERDUE | UNKNOWN
  currency: string;
}
```

| 需求 | 当前状态 | Phase 2 需补充 |
|------|---------|---------------|
| 同一客户多张发票 | ✅ 支持 | - |
| 同一客户多次付款 | ✅ paid_amount 字段存在 | 需新增 `payment_records` 表记录历史 |
| 每张发票部分付款 | ✅ 支持 | - |
| 付款日期 | ⚠️ 缺失 | 需新增 `paid_date?: Date` 字段 |
| 客户历史平均付款天数 | ❌ 无 | 需 payment_records + 计算逻辑 |
| 最近付款速度趋势 | ❌ 无 | 需历史数据 + 趋势算法 |
| 历史逾期情况 | ❌ 无 | 需历史统计 |

**结论**: 当前结构为 Phase 1 基础设计，Phase 2 需扩展 `paid_date` 和新增 `payment_records` 表。

### 3. Priority Engine 公式 ✅

公式严格按文档保留：

```
priority_score = overdue_score × 0.35 + amount_score × 0.25 + history_score × 0.20 + trend_score × 0.20
```

- `overdue_score`: 基于逾期天数区间（0/10/30/60/80/100）
- `amount_score`: outstanding / total_outstanding × 100
- `history_score`: 无数据时默认 40（UNKNOWN）
- `trend_score`: 无数据时默认 40（UNKNOWN）

**无人为修改权重**。

### 4. 人工可核对结果 ✅

见下方「示例 Report JSON」。

### 5. 暂停开发 ✅

已完成 Phase 1 全部功能，未启动 Phase 2-4。

---

## 测试结果

```
Test Suites: 5 passed, 5 total
Tests:       36 passed, 36 total
Snapshots:   0 total
Time:        ~1.4s
```

### 测试覆盖

| 测试文件 | 测试数 | 重点 |
|---------|-------|------|
| `file-parser.test.ts` | 10 | 上传解析、字段识别、脏数据处理 |
| `ar-engine.test.ts` | 7 | AR 计算、账龄分布、客户聚合 |
| `priority-engine.test.ts` | 6 | 优先级评分、排序、确定性 |
| `report-generation.test.ts` | 5 | 报告结构、排序、AI 占位 |
| `phase1-acceptance.test.ts` | 8 | 精度验证、公式验证、完整性 |

---

## 当前核心数据结构

### NormalizedInvoice

```typescript
interface NormalizedInvoice {
  customer_name: string;           // 客户名称
  invoice_number?: string;         // 发票号（可选）
  invoice_date: Date;              // 发票日期
  due_date: Date;                  // 到期日
  amount: DecimalMoney;            // 发票总金额
  paid_amount: DecimalMoney;       // 已付金额
  outstanding_amount: DecimalMoney;// 未收金额（amount - paid_amount，>=0）
  is_overdue: boolean;             // 是否逾期
  days_overdue: number;            // 逾期天数
  status: InvoiceStatus;           // PAID | PARTIALLY_PAID | UNPAID | OVERDUE | UNKNOWN
  currency: string;                // 币种
}
```

### PriorityScore

```typescript
interface PriorityScore {
  priority_score: number;          // 0-100
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH';
  overdue_score: number;           // 0, 10, 30, 60, 80, 100
  amount_score: number;            // 0-100
  history_score: number;           // 10-90，未知时 40
  trend_score: number;             // 20/40/80，未知时 40
}
```

### ARHealthReport

```typescript
interface ARHealthReport {
  total_receivables: DecimalMoney;
  overdue_amount: DecimalMoney;
  overdue_ratio: number;           // 百分比
  aging_distribution: AgingDistribution[];
  high_priority_count: number;
  customer_aggregations: CustomerAggregation[];
}
```

---

## 示例 Report JSON

```json
{
  "metadata": {
    "generated_at": "2026-09-28T14:38:17.462Z",
    "total_invoices": 11,
    "total_customers": 10
  },
  "risk_metrics": {
    "total_receivables": "$718,300.00",
    "overdue_amount": "$208,300.00",
    "overdue_ratio": "29.0%",
    "avg_days_overdue": 33,
    "max_days_overdue": 100
  },
  "aging_distribution": [
    { "bucket": "CURRENT", "amount": "$510,000.00", "percentage": "71.0%" },
    { "bucket": "1-7", "amount": "$5,500.00", "percentage": "0.8%" },
    { "bucket": "8-30", "amount": "$37,800.00", "percentage": "5.3%" },
    { "bucket": "31-60", "amount": "$15,000.00", "percentage": "2.1%" },
    { "bucket": "61-90", "amount": "$50,000.00", "percentage": "7.0%" },
    { "bucket": "90+", "amount": "$100,000.00", "percentage": "13.9%" }
  ],
  "top_priority": {
    "total_count": 5,
    "items": [
      {
        "invoice_number": "INV-006",
        "customer_name": "Old Customer",
        "amount": "$100,000.00",
        "paid_amount": "$0.00",
        "outstanding_amount": "$100,000.00",
        "days_overdue": 100,
        "priority_level": "MEDIUM",
        "priority_score": 55,
        "reason": "逾期 100 天，未收金额 $100,000.00",
        "recommended_action": "尽快跟进，建议24小时内联系"
      },
      {
        "invoice_number": "INV-005",
        "customer_name": "Mega Industries",
        "amount": "$50,000.00",
        "paid_amount": "$0.00",
        "outstanding_amount": "$50,000.00",
        "days_overdue": 75,
        "priority_level": "LOW",
        "priority_score": 46,
        "reason": "逾期 75 天，未收金额 $50,000.00",
        "recommended_action": "常规跟进，可在本周内处理"
      },
      {
        "invoice_number": "INV-004",
        "customer_name": "Tech Solutions",
        "amount": "$15,000.00",
        "paid_amount": "$0.00",
        "outstanding_amount": "$15,000.00",
        "days_overdue": 45,
        "priority_level": "LOW",
        "priority_score": 38,
        "reason": "逾期 45 天，未收金额 $15,000.00",
        "recommended_action": "常规跟进，可在本周内处理"
      },
      {
        "invoice_number": "INV-011",
        "customer_name": "Big Client",
        "amount": "$500,000.00",
        "paid_amount": "$0.00",
        "outstanding_amount": "$500,000.00",
        "days_overdue": 0,
        "priority_level": "LOW",
        "priority_score": 34,
        "reason": "未收金额 $500,000.00",
        "recommended_action": "常规跟进，可在本周内处理"
      },
      {
        "invoice_number": "INV-003",
        "customer_name": "Global Trading",
        "amount": "$25,000.00",
        "paid_amount": "$0.00",
        "outstanding_amount": "$25,000.00",
        "days_overdue": 15,
        "priority_level": "LOW",
        "priority_score": 27,
        "reason": "逾期 15 天，未收金额 $25,000.00",
        "recommended_action": "常规跟进，可在本周内处理"
      }
    ]
  },
  "ai_analysis": {
    "summary": "当前应收账款$718,300.00，逾期29.0%。建议重点关注0个高风险账户和1个中风险账户。",
    "risk_assessment": "中风险：逾期比例超过15%，建议加强催收力度",
    "key_findings": [
      "逾期金额: $208,300.00",
      "当前到期金额: $510,000.00",
      "90天以上逾期: $100,000.00"
    ],
    "recommendations": [
      "本周内处理1个中风险账户",
      "定期检查应收账款账龄分布",
      "与客户建立良好的沟通机制"
    ]
  }
}
```

---

## 当前项目目录

```
F:/runfeng/collection-monitor/
├── src/
│   ├── lib/
│   │   ├── decimal.ts              # 精确数值（DecimalMoney）
│   │   └── report-generator.ts     # 报告生成
│   ├── file-parser/
│   │   └── index.ts                # CSV/XLSX 解析
│   ├── data-normalizer/
│   │   └── index.ts                # 数据标准化
│   ├── ar-engine/
│   │   └── index.ts                # AR 计算 + 账龄
│   ├── priority-engine/
│   │   └── index.ts                # 优先级引擎
│   └── types/                      # （预留）
├── tests/
│   ├── test-data.ts                # 测试数据生成器
│   ├── phase1-report.ts            # 人工核对报告
│   ├── phase1-sample-report.ts     # 示例 JSON 输出
│   ├── unit/
│   │   ├── file-parser.test.ts
│   │   ├── ar-engine.test.ts
│   │   ├── priority-engine.test.ts
│   │   ├── report-generation.test.ts
│   │   └── phase1-acceptance.test.ts
│   └── integration/
│       └── report-generation.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## Git 状态

```
fatal: not a git repository (or any of the parent directories): .git
```

**尚未初始化 Git**。如需提交，可执行：
```bash
cd F:/runfeng/collection-monitor
git init
git add .
git commit -m "Phase 1: 核心业务层完成，36/36 测试通过"
```

---

## 已知问题

| 问题 | 影响 | 状态 |
|------|------|------|
| `paid_date` 字段缺失 | Phase 2 支付历史分析需补充 | 待 Phase 2 |
| 支付历史数据未存储 | history_score/trend_score 使用默认值 40 | 待 Phase 2 |
| 暂无 Git | 版本追溯 | 待初始化 |

---

## 下一步

等待 Phase 2 指令：
- 补充 `paid_date` 字段
- 新增 `payment_records` 表结构（Prisma Schema）
- 实现支付历史分析（average_payment_days, median_payment_days）
- 实现 Payment Trend 计算
- 更新 Priority Engine 使用真实历史数据
