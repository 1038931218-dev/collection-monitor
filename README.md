# AI收款管家 (Collection Monitor) - V0.1

帮企业老板判断「今天最应该收哪几笔钱」的应收账款分析工具。

## 技术栈

- **Frontend**: Next.js + React + TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma (Phase 1-3 核心逻辑独立于DB)
- **AI**: OpenRouter (Provider Abstraction)
- **Validation**: Zod

## 开发阶段

- **Phase 1**: 上传 → 解析 → 字段识别 → 数据标准化
- **Phase 2**: AR计算 → 账龄 → 优先级引擎
- **Phase 3**: AR Health Report → Top Priority
- **Phase 4**: AI 解释 + 话术生成
- **Phase 5**: 认证 + Dashboard
- **Phase 6**: 订阅 + Stripe
- **Phase 7**: 安全测试 + 部署

## 核心原则

1. **Sell the decision, not the AI** - 回答「今天该收哪笔钱」
2. **LLM只是增强层** - AI失败不影响核心功能
3. **精确数值计算** - 金额使用 Decimal，禁止浮点
4. **数据隔离** - 所有业务数据通过 company_id 隔离
5. **Prompt Injection防护** - Excel数据视为不可信数据

## 快速开始

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 运行测试
npm test
```

## 项目结构

```
src/
├── lib/              # 核心库
├── file-parser/      # 文件解析 (CSV/XLSX)
├── data-normalizer/  # 数据标准化
├── ar-engine/        # AR计算引擎
├── priority-engine/  # 优先级引擎
├── ai/               # AI服务抽象
├── zod-schemas/      # Zod Schema定义
├── prompts/          # AI Prompt模板
├── types/            # TypeScript类型定义
```

## 限制 (V0.1)

禁止功能:
- ❌ 银行对接
- ❌ 自动付款/收款
- ❌ 自动发送邮件/WhatsApp
- ❌ ERP/CRM集成
- ❌ 发票创建
- ❌ 原生App
- ❌ Multi-Agent
- ❌ 复杂工作流
- ❌ 高级ML预测
- ❌ 法律催收
- ❌ 语音助手
