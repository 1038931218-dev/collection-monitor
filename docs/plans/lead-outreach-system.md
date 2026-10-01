# Collection Monitor - 客户线索接收与转化系统

**执行时间**: 2026-09-30  
**状态**: 等待客户线索输入

---

## 一、系统已就绪

### 核心模块
- ✅ 线索录入系统 (`scripts/lead-manager.py`)
- ✅ 二次审核逻辑
- ✅ 客户分级 (A/B/C)
- ✅ 个性化触达模板生成
- ✅ 响应追踪系统
- ✅ 数据统计报表

### 数据目录
```
docs/leads/
├── leads.jsonl          # 线索数据库
├── campaign_stats.json  # 活动统计
└── outreach_log.jsonl   # 触达日志
```

---

## 二、线索输入格式

请提供以下格式的线索数据（CSV、Excel 或 JSON）：

```csv
company_name, website, industry, company_size, country, contact_name, contact_role, public_email, linkedin, source, why_fit, pain_signal, lead_score
```

**示例**:
```csv
ABC Wholesale,https://abcwholesale.com,Wholesale Distribution,25-50,US,John Smith,CFO,john@abcwholesale.com,,LinkedIn,B2B wholesale with Net-30 terms,Net 30 payment terms,85
```

---

## 三、执行流程

### 第一步：接收线索
- 从市场部获取候选客户名单
- 验证字段完整性
- 缺失字段通过公开信息补充

### 第二步：二次审核
对每条线索检查：
1. 公司是否真实存在
2. 是否存在B2B/AR相关信号
3. 联系方式是否有效

### 第三步：客户分级
- **A级**: 高匹配度 (B2B Wholesale/Industrial + 明确AR信号)
- **B级**: 中匹配度 (IT/Software + 潜在AR需求)
- **C级**: 低匹配度

### 第四步：生成个性化触达
为每个A类客户生成：
- Company Summary
- Why This Company Likely AR Pain
- Contact Person
- Contact Channel
- Personalized Opening
- CTA

### 第五步：执行触达
- 发送个性化邮件/消息
- 核心CTA: Free AR Health Report
- 记录发送时间、渠道、内容

### 第六步：追踪响应
- 接收客户回复
- 标记状态 (INTERESTED/PRICING_INTENT/PAYMENT_INTENT等)
- 更新下一步行动

---

## 四、状态追踪

### Lead Status
| 状态 | 说明 |
|------|------|
| NEW | 新线索 |
| QUALIFIED | 通过审核 |
| CONTACTED | 已触达 |
| REPLIED | 已回复 |
| INTERESTED | 有兴趣 |
| TRIAL | 正在试用 |
| PRICING_INTENT | 询问价格 |
| PAYMENT_INTENT | 付费意向 |
| PAID | 已付费 |
| NOT_INTERESTED | 不感兴趣 |
| NO_RESPONSE | 无回复 |
| INVALID | 无效线索 |
| DO_NOT_CONTACT | 禁止联系 |

---

## 五、KPI 追踪

### 核心指标
```
触达10 → 回复X → 访问X → 上传X → 感兴趣X → 询价X → 付费意向X → 付款X
```

### A组 vs B组对比
| 指标 | A组 (Wholesale) | B组 (IT/Software) |
|------|-----------------|-------------------|
| 触达数 | 5 | 5 |
| 回复率 | ?% | ?% |
| 访问率 | ?% | ?% |
| 上传率 | ?% | ?% |
| 兴趣率 | ?% | ?% |
| 询价率 | ?% | ?% |
| 付费意向 | ?% | ?% |

---

## 六、触达模板

### 首次触达（邮件/LinkedIn）
```
Subject: Quick question about your AR process

Hi [Name],

I noticed [Company] works with [Industry] clients on [Net 30/60] terms.

We built a free tool that shows which invoice to chase first. 
Upload your AR Excel/CSV → get a priority report → see AI insights.

No signup required. Try it here: https://collection-monitor-nine.vercel.app

Worth a 30-second look?

[Your Name]
```

### 价格询问回复
```
We're currently validating the product, so we're offering the AR report for free while we learn how businesses would use it.

If you'd like to continue using it regularly, we'll have pricing tiers soon. Would you like me to send you a demo link?
```

---

## 七、立即开始

**请提供客户线索数据**，我将立即开始执行第一轮触达。

支持格式：
- CSV 文件
- Excel (.xlsx) 文件
- JSON 文件
- 直接粘贴数据

---

**执行原则**：
- 🚫 不购买数据库
- 🚫 不群发垃圾邮件
- 🚫 不绕过验证码
- ✅ 使用公开信息
- ✅ 个性化触达
- ✅ 成本控制在 $0
