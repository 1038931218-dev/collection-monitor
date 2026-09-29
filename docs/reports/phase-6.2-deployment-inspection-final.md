# Phase 6.2 正式部署环境勘察报告

**日期**：2026-09-29
**项目**：Collection Monitor V0.1
**状态**：勘察完成，等待部署执行

---

## 🔴 阻塞问题（已修复）

| # | 问题 | 状态 | 修复方式 |
|---|------|------|----------|
| 1 | `next.config.js` ESM 语法错误 | ✅ 已修复 | 改为 CommonJS `module.exports` |
| 2 | `analyze/route.ts` 类型错误 | ✅ 已修复 | 补充 `DateUtils` 导入 + 完整字段计算 |
| 3 | `ai/index.ts` 类型重导出错误 | ✅ 已修复 | 拆分 `export type` 和 `export` |
| 4 | `report/page.tsx` 重复函数定义 | ✅ 已修复 | 删除第 215 行重复的 `timingTag` |
| 5 | API 错误信息泄露 `err.message` | ✅ 已修复 | 替换为通用错误文案 |
| 6 | 无文件大小限制 | ✅ 已修复 | 添加 10MB 限制，返回 413 |
| 7 | `.gitignore` 未排除 `.env` | ✅ 已修复 | 添加敏感文件排除规则 |

---

## 🟠 上线前建议解决（已完成）

| # | 项目 | 状态 | 说明 |
|---|------|------|------|
| 1 | 数据库 PostgreSQL 切换 | ⚠️ 待执行 | 需生产数据库 + `prisma migrate deploy` |
| 2 | AI Provider 配置 | ⚠️ 待配置 | 需设置 `AI_PROVIDER=openrouter` + `OPENROUTER_API_KEY` |
| 3 | 环境变量模板 | ✅ 已创建 | `.env.example` 已提交 |
| 4 | 安全测试 | ✅ 已新增 | 2 个新测试：错误信息泄露 + 文件大小限制 |

---

## 🟡 可以上线后处理

| # | 项目 | 建议 |
|---|------|------|
| 1 | CORS 配置 | 如有 CDN/独立前端需配置 |
| 2 | Rate Limiting | 建议添加请求频率限制 |
| 3 | 文件上传大小限制 | ✅ 已实现 10MB |
| 4 | HTTPS / 域名 | Vercel 自动 HTTPS；自定义服务器需配 Nginx/Cloudflare |

---

## 🟢 已确认没问题

| 项目 | 状态 | 说明 |
|------|------|------|
| Build 成功率 | ✅ | `npm run build` 成功 |
| 测试通过率 | ✅ | **216/216**（新增 2 个安全测试） |
| 多租户隔离 | ✅ | CRITICAL 0，所有 getById 绑定 company_id |
| AI Fallback | ✅ | API 失败自动降级 Mock |
| Secret 管理 | ✅ | API Key 仅服务端，不进 Git |
| 日志安全 | ✅ | console.error 只打错误类别 |
| Debug 模式 | ✅ | 无 process.env.NODE_ENV === 'development' 泄露逻辑 |
| Stack Trace | ✅ | 前端只显示通用错误文案 |
| Prisma Migration | ✅ | 标准 SQL，PG 兼容，无 destructive 操作 |
| 无文件持久化 | ✅ | V0.1 无需对象存储 |

---

## 推荐部署架构

### 方案 A：Vercel + Supabase/Neon（推荐）

```
优点：免费额度充足、自动 HTTPS、Git 集成、环境变量界面管理
缺点：冷启动 ~5s、无持久文件存储（但 V0.1 不需要）
```

**需要提供的东西**：
1. Vercel 账号（github.com 登录即可）
2. Supabase 或 Neon 账号 → 获取 PostgreSQL 连接串
3. OpenRouter API Key（已有）

**预计耗时**：30 分钟内可上线第一个公网 URL

---

## 环境变量清单

### 必需（生产环境）

| 变量名 | 用途 | 示例值 | 存入 Git？ |
|--------|------|--------|-----------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://user:pass@host:5432/db` | ❌ 绝对禁止 |
| `OPENROUTER_API_KEY` | AI 分析 API Key | `sk-or-v1-xxxxx` | ❌ 绝对禁止 |
| `AI_PROVIDER` | 选择 AI 提供商 | `openrouter` | ✅ 可提交 |

### 可选

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | `AI收款管家` |

---

## 生产数据库初始化步骤

```bash
# 1. 在 Supabase/Neon 控制台创建 PostgreSQL 数据库
# 2. 获取连接字符串 DATABASE_URL
# 3. 本地测试迁移是否兼容
npx prisma migrate deploy --schema prisma/schema.prisma
# 4. 推送到生产环境并执行
#    Vercel: 在 Project Settings → Functions → 添加 postbuild 脚本
#    或手动执行一次
```

---

## 上线验收清单

在"陌生用户可以安全上传真实 Excel"之前，必须全部通过：

- [ ] 数据库迁移成功，表结构完整
- [ ] 用户上传 CSV/XLSX 成功返回解析结果
- [ ] AR 报告正确生成（金额、逾期、优先级）
- [ ] AI 分析正常（有 API Key）或 fallback（无 API Key）
- [ ] 催款消息草稿生成
- [ ] 多租户隔离验证（A 看不到 B 的数据）
- [ ] 错误信息不泄露内部路径或 stack trace
- [ ] HTTPS 已启用
- [ ] 无 DEBUG 模式泄露
- [ ] 文件上传有大小限制（10MB）

---

## 建议行动顺序

1. **立即**：创建 Supabase/Neon 数据库 → 获取 DATABASE_URL
2. **立即**：将代码推送到 GitHub
3. **执行**：Vercel 导入项目 → 配置环境变量 → Deploy
4. **验证**：跑通上线验收清单
5. **小范围**：给 3-5 个测试用户试用

---

*勘察完成时间：2026-09-29*
*下次会议：Phase 6.3 部署执行会*
