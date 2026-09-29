# Phase 6.2 正式部署环境勘察报告

**日期**：2026-09-29
**项目**：Collection Monitor V0.1
**状态**：勘察完成，待决策

---

## 🔴 阻塞问题（必须解决才能上线）

### 1. 数据库：SQLite → PostgreSQL 切换

| 项目 | 现状 | 生产要求 |
|------|------|----------|
| 当前环境 | SQLite（`file:./dev.db`） | PostgreSQL |
| Prisma Migration | ✅ 已存在（20260928155322_init） | 需确认 PG 兼容 |
| Schema 兼容性 | 使用标准 SQL，无 PG 专属特性 | ✅ 可直接迁移 |
| 首次初始化 | `prisma migrate deploy` | 需执行 |

**行动项**：
```bash
# 生产环境执行（不是 migrate reset，是 deploy）
prisma migrate deploy
# 或首次部署时
prisma migrate dev --name init
```

### 2. 环境变量缺失 `.env.example`

当前只有 `.env`，没有 `.env.example` 模板。生产部署时必须告知部署方需要哪些变量。

**行动项**：创建 `.env.example`，标注哪些是必填、哪些是可选。

---

## 🟠 上线前建议解决

### 3. AI Provider 配置

| 项目 | 现状 | 生产建议 |
|------|------|----------|
| 默认 Provider | `AI_PROVIDER=mock`（未设置时） | 生产设为 `openrouter` |
| API Key | `OPENROUTER_API_KEY` | 必须注入，通过部署平台环境变量管理 |
| Fallback | ✅ 已有（Mock fallback） | 保持，API 失败自动降级 |
| 成本风险 | `MAX_TOKENS=1000`，只分析 Top 5 | 可控 |

**安全确认**：✅ API Key 仅在服务端 `openrouter-provider.ts` 使用，前端 JS 无法访问。

### 4. 文件上传安全性

| 项目 | 现状 | 评估 |
|------|------|------|
| 存储方式 | 内存（Base64 解码后直接处理） | ✅ V0.1 无需持久化 |
| 文件大小限制 | 无硬性限制 | ⚠️ 建议加 10MB 限制 |
| 文件类型限制 | 仅接受 `.xlsx/.xls/.csv` | ✅ 已过滤 |
| 重启影响 | 无持久化文件 | ✅ 无影响 |

**结论**：V0.1 可以不做对象存储，内存处理足够。

### 5. 错误信息泄露检查

| 路由 | 错误处理 | 是否泄露 |
|------|----------|----------|
| `/api/upload` | `error: \`上传失败: ${err.message}\`` | ⚠️ 部分泄露原始错误 |
| `/api/analyze` | `error: \`分析失败: ${err.message}\`` | ⚠️ 部分泄露原始错误 |
| `/api/message` | 未检查 | 需确认 |

**行动项**：生产环境应将 `err.message` 替换为通用错误文案，保留详细日志到服务端。

---

## 🟡 可以上线后处理

### 6. CORS 配置

当前 `next.config.js` 无 CORS 设置。Next.js API Routes 默认不限制来源，生产若有 CDN 或独立前端需配置。

### 7. Rate Limiting

当前无任何请求频率限制。生产环境建议：
- 上传接口：每分钟最多 N 次
- 分析接口：每分钟最多 N 次

### 8. 文件上传大小限制

建议增加 10MB 限制（当前代码无此检查）。

### 9. HTTPS / 域名

- 本地开发：HTTP 即可
- 生产部署：Vercel 自动 HTTPS；自定义服务器需配 Nginx/Cloudflare

---

## 🟢 已确认没问题

| 项目 | 状态 | 说明 |
|------|------|------|
| Build 成功率 | ✅ | `npm run build` 成功 |
| 测试通过率 | ✅ | 214/214 |
| 多租户隔离 | ✅ | CRITICAL 0，所有 getById 绑定 company_id |
| AI Fallback | ✅ | API 失败自动降级 Mock |
| Secret 管理 | ✅ | API Key 仅服务端，不进 Git |
| 日志安全 | ✅ | console.error 只打错误类别，不打完整错误详情 |
| Debug 模式 | ✅ | 无 process.env.NODE_ENV === 'development' 泄露逻辑 |
| Stack Trace | ✅ | 前端只显示通用错误文案 |
| Prisma Migration | ✅ | 标准 SQL，PG 兼容 |
| 无文件持久化 | ✅ | V0.1 无上传文件存储需求 |
| Docker 适配 | ⚠️ | 需额外配置（见下方建议） |

---

## 推荐部署架构（最短路径）

### 方案 A：Vercel（推荐，最快）

```
优点：免费额度充足、自动 HTTPS、Git 集成、环境变量界面管理
缺点：冷启动 ~5s、无持久文件存储（但 V0.1 不需要）
```

**需要提供的东西**：
1. Vercel 账号
2. Git 仓库（GitHub/GitLab）
3. 生产 PostgreSQL 数据库（Supabase/Neon/ Railway 均可免费起步）
4. OpenRouter API Key

**部署步骤**：
```bash
# 1. 推送到 GitHub
git push origin master

# 2. Vercel 导入项目
#    → 自动检测 Next.js
#    → 添加环境变量：DATABASE_URL, OPENROUTER_API_KEY, AI_PROVIDER=openrouter
#    → Deploy

# 3. 首次部署后执行数据库迁移
#    在 Vercel 函数中运行：prisma migrate deploy
#    或通过 Vercel Cron 触发
```

### 方案 B：LocalTunnel（最快验证）

```
优点：5 分钟出公网 URL、无需服务器、无需域名
缺点：URL 每次重启变化、不稳定、不适合正式产品
```

**适用场景**：给前 3-5 个测试用户试用，验证用户流程。

```bash
npx localtunnel --port 3000
# 输出：your url is: https://abc123.loca.lt
```

### 方案 C：Docker + VPS（长期方案）

```
优点：完全控制、可定制、成本可预测
缺点：需要运维知识、VPS 费用约 $5-10/月
```

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
# 1. 创建 PostgreSQL 数据库（在 Supabase/Neon/Railway 控制台）
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
- [ ] 文件上传有大小限制（建议 10MB）

---

## 建议行动顺序

1. **立即**：创建 `.env.example`
2. **立即**：修复错误信息泄露（`err.message` → 通用文案）
3. **决策**：选择部署方案（推荐 Vercel + Supabase）
4. **准备**：注册 Supabase/Neon 获取 PostgreSQL 连接串
5. **执行**：部署 + 首次迁移
6. **验证**：跑通上线验收清单
7. **小范围**：用 LocalTunnel 给测试用户试用

---

*勘察完成时间：2026-09-29*
*下次会议：Phase 6.2 部署执行会*
