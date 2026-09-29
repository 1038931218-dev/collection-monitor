# Phase 6.5 市场验证执行记录

**项目**: Collection Monitor V0.1  
**测试开始时间**: 2026-09-29  
**目标**: 验证真实用户是否愿意使用产品

---

## 一、测试准备完成

### 1. Analytics 追踪已添加 ✅
```
/ Analytics.ts 已添加以下事件追踪：
✓ page_view        - 页面访问
✓ upload_started   - 开始上传
✓ upload_completed - 上传完成
✓ report_generated - 报告生成
✓ priority_viewed  - 查看 Priority
✓ message_generated - 生成催款消息
✓ message_copied   - 复制消息
```

**数据存储**: localStorage（仅客户端，无后端）

### 2. 示例数据集 ✅
```
文件: public/demo-invoices.csv
内容: 50 张虚拟发票
覆盖:
- 当前未逾期
- 1-7 天逾期
- 8-30 天
- 31-60 天
- 90+ 天
- 部分付款
- 全额付款
- 不同金额 ($3,200 - $28,000)
- 不同客户名称
```

### 3. 用户测试任务 ✅
```
"Upload your invoice list and tell us whether the report 
helps you decide which customer to chase first."
```

### 4. 最小反馈问题 ✅
1. Did the report make sense?
2. Would you use this again?
3. What was confusing?
4. Would you pay for this?

---

## 二、测试渠道选择

**首选渠道**: Reddit r/smallbusiness

**原因**:
- 用户画像匹配：小型企业主
- 讨论主题相关：AR、催款、现金流
- 社区活跃：经常有人问类似问题

**备选渠道**:
- Hacker News (Show HN)
- LinkedIn 小型企业主群组

---

## 三、发帖计划

### Reddit 帖子模板
```
Title: I built a tool that tells small business owners which invoice to chase today

Body:
Hey r/smallbusiness,

I built Collection Monitor - a simple tool that helps small business owners 
decide which invoice to chase first.

Upload your AR Excel/CSV, get a priority report with AI-powered insights.
No finance background needed.

Would love feedback from actual business owners:
https://collection-monitor-nine.vercel.app

What would make this useful for you?
```

### 发帖时间
- 最佳时间：工作日 9-11 AM (目标用户活跃时间)
- 避免：周末、节假日

---

## 四、成功标准（第一阶段）

### 不强求
- 用户数量（1-3 个即可）
- 付费转化
- 功能完整度

### 要求
- [ ] 至少 1 个用户完成完整闭环（上传 → 报告 → Priority → Message）
- [ ] 至少 1 个用户明确表示"有用"
- [ ] 收集到真实用户原话
- [ ] 记录用户在哪个步骤流失

---

## 五、数据追踪方法

### 手动记录（因为无后端 Analytics）
```
用户 #1
来源：Reddit
进入时间：____
行为路径：
  □ 访问首页 → _____
  □ 点击 Upload → _____
  □ 上传文件 → _____ (是否使用 demo: 是/否)
  □ 字段映射 → _____
  □ 查看报告 → _____
  □ 查看 Priority → _____
  □ 生成 Message → _____
  □ 复制 Message → _____
  □ 离开网站 → _____

核心反馈：
  "_________________________"

商业信号强度：
  ○ 强信号：明确说"有用"
  ○ 中信号："挺有意思"
  ○ 弱信号："不错"
  ○ 无信号：未反馈
```

---

## 六、执行步骤

### Step 1: 发帖测试
- [ ] 选择 1 个渠道发帖
- [ ] 等待 24-48 小时
- [ ] 记录访问数据

### Step 2: 收集反馈
- [ ] 回复评论区反馈
- [ ] 记录用户行为数据
- [ ] 保存用户原话

### Step 3: 分析结果
- [ ] 是否有用户完成完整闭环？
- [ ] 主要卡在哪里？
- [ ] 用户反馈是否符合预期？

### Step 4: 决策
- [ ] 如果获得强信号 → 进入 Phase 6.6（扩大验证）
- [ ] 如果信号模糊 → 调整产品定位或目标用户
- [ ] 如果无信号 → 重新评估市场需求

---

## 七、注意事项

1. **不要解释太多**：让用户自己理解产品
2. **记录原话**：不要翻译或美化
3. **关注行为**：行动比语言更真实
4. **接受负面**：负面反馈更有价值
5. **不要加功能**：除非是阻塞性 bug

---

## 八、关键问题

**核心验证问题**：
> "这个产品有没有帮你决定今天应该先收哪笔钱？"

**回答分级**：
- **强信号**: "有，帮我节省了时间" / "这就是我需要的"
- **中信号**: "挺有意思" / "可以用"
- **弱信号**: "不错" / "看看"
- **无信号**: "没用" / "不需要"

**付费信号**：
- "我愿意付多少钱？"
- "什么功能值得付费？"
- "会推荐给其他人吗？"

---

**测试准备就绪，可以开始发帖！** 🚀
