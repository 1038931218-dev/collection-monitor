# AI收款管家 (Collection Monitor) V0.1 - Phase 5.2 验收报告

## 项目状态

**Phase 5.2 验收状态: ✅ 通过**

- 测试套件: 13 pass, 191 tests pass
- Phase 5.2 Part 1: 28 个黑盒/对抗测试
- Phase 5.2 Part 2: 19 个 Priority/Payment History/AI 故障测试
- 新增回归测试: 6 个（Bug 1 & Bug 2 修复确认）

---

## 测试覆盖汇总

### Part 1: 文件解析与数据边界 (28 tests)
| 类别 | 测试数 | 关键用例 |
|------|-------|---------|
| 文件异常 | 4 | 空文件、只有表头、错误扩展名、列数不一致 |
| 字段识别 | 6 | 已付金额、总金额、invoice number、paid、emoji、特殊字符 |
| 数据标准化 | 4 | paid>amount clamp、paid=amount、重复发票、空客户 |
| Aging 边界 | 11 | 0/1/7/8/30/31/60/61/90/91/120 天 |
| AR 计算 | 3 | 总金额、逾期比例、客户聚合 |

### Part 2: Priority / Payment History / AI 故障 (19 tests)
| 类别 | 测试数 | 关键用例 |
|------|-------|---------|
| Priority 场景 | 6 | 大金额未逾期/小金额严重逾期/无历史/TOP5稳定性/同分排序 |
| Payment History | 7 | EARLY/ON_TIME/LATE/SEVERE_LATE + 趋势(UNKNOWN/DETERIORATING/IMPROVING) |
| AI 故障 | 4 | Provider异常/fallback完整/部分失败/注入攻击验证 |
| 端到端 | 1 | 100+ 张发票稳定性 |

---

## 验证的核心原则

### 1. Priority Score 完全由确定性规则计算
- 公式：`overdue×0.35 + amount×0.25 + history×0.20 + trend×0.20`
- 权重已在 Phase 1 封版，不可修改
- **AI 不能修改 priority_score**（通过 bogus provider 注入测试验证）

### 2. Payment History 正确分类
- 样本 < 3 → `UNKNOWN`（不虚构趋势）
- avg < 0 → `EARLY`，0-7 → `ON_TIME`，8-14 → `LATE`，>14 → `SEVERE_LATE`
- 趋势判定：前后半段平均差 ≥5 天 → DETERIORATING/IMPROVING

### 3. AI 故障不影响核心业务
- 单条 AI 失败 → fallback 生成合理内容，不阻塞其他任务
- 全部 AI 失败 → 报告完整返回，确定性数据完整
- AI 分析内容可被篡改，但确定性字段（priority_score、outstanding_amount）不受影响

---

## 发现的设计现象（非 Bug）

**单张大额 90 天逾期发票（无支付历史）→ MEDIUM (69分)**

这并非 Bug，而是公式设计的自然结果：
- overdue_score = 80（90天属61-90档）
- amount_score = 100（唯一/最大发票）
- history_score = 40（无历史，中性默认）
- trend_score = 40（无历史，中性默认）
- **priority = round(80×0.35 + 100×0.25 + 40×0.20 + 40×0.20) = round(69) = 69 → MEDIUM**

**要真正达到 HIGH (≥80)，需要：**
1. 有恶化的支付历史（history_score 可提升至 90-100）
2. 或趋势为 DETERIORATING（trend_score = 80）
3. 或超过 90 天逾期（overdue_score = 100）

测试已验证：当接入 `SEVERE_LATE + DETERIORATING` 历史后，同一发票可达 96 分（HIGH）。

---

## 测试统计

| 指标 | 数值 |
|------|------|
| 总测试数 | 191 |
| 通过 | 191 |
| 失败 | 0 |
| 测试套件 | 13 pass |
| Phase 5.2 Part 1 新增 | 28 |
| Phase 5.2 Part 2 新增 | 19 |
| 回归测试（Bug 1 & Bug 2） | 6 |

---

## Git Commit

```
4a8c3d2 Phase 5.2: Black-box/adversarial testing (Phase 5.2 Part 2)
395d7f7 Phase 4.2: AI Provider architecture upgrade + collection message generator
5977df0 docs: Phase 4 acceptance report
2b77465 Phase 4: AI Provider layer with OpenRouter integration
aa0669b docs: Phase 3 acceptance report
0480725 Phase 3: PostgreSQL data layer with Prisma (9 tables)
e506caa Phase 2: payment history analysis + extended priority engine
a5ed56f Phase 1 baseline: core business layer, 36/36 tests pass
```

---

## 已知问题

无新 Bug。Phase 5.2 的黑盒/对抗测试未发现需要修复的系统缺陷。

---

## 下一步

等待 Phase 5.2 第 3 段或 Phase 6 指令。
