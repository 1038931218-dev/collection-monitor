# Phase 6.5 真实用户验证计划

**目标**: 找到第一个真实陌生用户，验证产品核心价值

---

## 一、测试准备

### 1. 示例数据集 ✅
- 文件: `public/demo-invoices.csv`
- 内容: 50 张虚拟发票
- 覆盖场景:
  - 当前未逾期
  - 1-7 天逾期
  - 8-30 天
  - 31-60 天
  - 90+ 天
  - 部分付款
  - 全额付款
  - 不同金额 ($3,200 - $28,000)
  - 不同客户名称

### 2. 用户测试任务
```
请上传您的发票列表，告诉我们报告是否帮助您决定应该先追收哪个客户的账款。
```

### 3. 最小反馈问题
1. Did the report make sense? (是/否)
2. Would you use this again? (是/否/看情况)
3. What was confusing? (开放题)
4. Would you pay for this? (是/否/多少)

---

## 二、目标渠道

### 首选渠道
- **Reddit**: r/smallbusiness, r/Entrepreneur, r/freelance
- **Hacker News**: Show HN
- **LinkedIn**: 小型企业主群组

### 发帖模板
```
Title: I built a tool that tells small business owners which invoice to chase today

Body:
Hey, I built Collection Monitor - a simple tool that helps small business owners 
decide which invoice to chase first.

Upload your AR Excel/CSV, get a priority report with AI-powered insights.

Would love feedback from actual business owners:
https://collection-monitor-nine.vercel.app

What would make this useful for you?
```

---

## 三、成功标准（第一阶段）

### 不强求
- 用户数量（1-3 个即可）
- 付费转化
- 功能完整度

### 要求
- 至少 1 个用户完成完整闭环（上传 → 报告 → 查看 Priority → 生成 Message）
- 至少 1 个用户明确表示"有用"
- 收集到真实用户原话

---

## 四、执行步骤

### Step 1: 发帖测试
- 选择 1 个渠道发帖
- 等待 24-48 小时
- 记录访问数据

### Step 2: 收集反馈
- 回复评论中的反馈
- 记录用户行为数据
- 保存用户原话

### Step 3: 分析结果
- 是否有用户完成完整闭环？
- 主要卡在哪里？
- 用户反馈是否符合预期？

### Step 4: 决策
- 如果获得强信号 → 进入 Phase 6.6（扩大验证）
- 如果信号模糊 → 调整产品定位或目标用户
- 如果无信号 → 重新评估市场需求

---

## 五、数据追踪（手动记录）

由于没有集成 Analytics，使用以下方法记录：

### 用户行为记录表
| 时间 | 来源 | 行为 | 备注 |
|------|------|------|------|
| 10:30 | Reddit | 访问首页 | 看到标题 |
| 10:32 | Reddit | 点击 Upload | 开始上传 |
| 10:35 | Reddit | 上传成功 | 使用 demo 文件 |
| 10:38 | Reddit | 查看报告 | 停留 2 分钟 |
| 10:40 | Reddit | 复制 Message | 完成闭环 |

### 反馈收集
- 评论区回复
- DM 私信
- 邮件（如有）

---

## 六、关键问题

### 核心验证问题
**"这个产品有没有帮你决定今天应该先收哪笔钱？"**

### 回答分级
- **强信号**: "有，帮我节省了时间" / "这就是我需要的"
- **中信号**: "挺有意思" / "可以用"
- **弱信号**: "不错" / "看看"
- **无信号**: "没用" / "不需要"

### 付费信号
- "我愿意付多少钱？"
- "什么功能值得付费？"
- "会推荐给其他人吗？"

---

## 七、注意事项

1. **不要解释太多**: 让用户自己理解产品
2. **记录原话**: 不要翻译或美化
3. **关注行为**: 行动比语言更真实
4. **接受负面**: 负面反馈更有价值
5. **不要加功能**: 除非是阻塞性 bug

---

**现在可以开始发帖测试了！** 🚀
