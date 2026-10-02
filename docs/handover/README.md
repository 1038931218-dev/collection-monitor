# 润锋团队 · 交接协议

> **本文件是润行（DSH）与润颖（Hermes）之间的交接约定。双方都必须遵守。**
> 建立日期：2026-10-02 ｜ 建立方：润行

---

## 一、为什么有这个目录

以前我们之间的交接**要靠润锋人工转发**。这有三个问题：

1. 润锋成了瓶颈 —— 我们俩都卡在他的空闲时间
2. 内容会被转述 —— 转述必然失真
3. 没有留痕 —— 交接过程不可审计

**从现在起，交接一律落盘到本目录，双方自己扫描、自己读取。**

---

## 二、目录约定

```
F:\runfeng\collection-monitor\docs\handover\
├── README.md                 ← 本文件（协议，只读不改）
├── _state-润行.json           ← 润行的已读状态（润行维护，他人勿改）
├── _state-润颖.json           ← 润颖的已读状态（润颖维护，他人勿改）
├── _PENDING-润行.md           ← 提示润行有新件的标记（可删）
├── _PENDING-润颖.md           ← 提示润颖有新件的标记（可删）
├── archive\                   ← 已处理完的交接件归档
└── <交接件>.md                ← 见下方命名规范
```

---

## 三、命名规范（**必须遵守，否则扫描会漏**）

```
YYYY-MM-DD-HHMM-<发出方>给<接收方>-<主题>.md
```

**示例**：

```
2026-10-02-1330-润行给润颖-P0修复交接.md
2026-10-03-0900-润颖给润行-P0-03完成报告.md
2026-10-05-1800-润行给润颖-复测结果.md
```

**硬性规则**：
- 扩展名必须是 `.md`（Markdown —— 双方都能直接读）
- `<发出方>` 和 `<接收方>` 只能是 `润行` / `润颖`
- 中间用 `给` 字分隔（半角 `-` 分隔各段）
- 不要用空格、括号、特殊符号（避免路径问题）
- **一个主题一个文件**，不要追加修改已发出的件 —— 要补充就发新件

---

## 四、交接件必须包含的六段

为保证接收方能**独立接手**，每份交接件必须写清：

```markdown
# <标题>

**发出方**：润行 / 润颖
**接收方**：润颖 / 润行
**日期**：YYYY-MM-DD
**基准**：<git commit / 版本号 / 无>

## 1. 一页速览
   状态表：做完了什么、没做什么、当前是否放行

## 2. 我改了什么
   文件级明细 + 每处改动的原因
   ⚠ 区分「我改的」和「接手前就脏的」

## 3. 我发现了什么
   ⚠ 最重要的一段：发现的漏洞/风险，含证据
   ⚠ 尤其是「发现了但没修」的 —— 必须显式标出

## 4. 我没做什么
   明确列出未完成项 + 建议的接手顺序

## 5. 验证证据
   可复现的命令 + 实际输出
   ⚠ 禁止只写结论，必须附命令

## 6. 给接收方的话
   坑、教训、必须知道的事实
```

---

## 五、交接纪律（红队定的四条）

这四条来自我们踩过的坑，**不是形式主义**：

| # | 纪律 | 来自哪次教训 |
|---|---|---|
| 1 | **「测试全绿」不是安全结论** | 「255/255 全绿」实际是 280/285、5 个失败 |
| 2 | **修一个入口必查另一个入口** | 同一项目栽过两次：API/文件日期、openrouter/agnes 净化 |
| 3 | **必须写「我发现了但没修什么」** | 只说修了什么，接收方会漏掉活漏洞 |
| 4 | **结论必须配可复现命令** | 无法复现的结论等于没结论 |

---

## 六、扫描方式

### 6.1 DSH 原生定时任务（推荐）

DSH 有原生的**自动化任务**（Automation tasks）功能，支持「**Every N minutes**」。

**创建位置**：DSH 侧栏 → **自动化任务** → 新建

**任务指令（直接复制）**：

```
扫描 F:\runfeng\collection-monitor\docs\handover\ 目录，
找出所有 <日期>-<发出方>给润行-*.md 且不在 _state-润行.json 里的新交接件。
如果有：逐份读取并按其中的「我没做什么」继续工作，处理完后把文件名追加进
_state-润行.json，并把该件移动到 archive\ 子目录。
如果没有新件：简短回一句「无新交接件」即可，不要做别的事。
```

润颖侧的对应指令（把 `润行` 换成 `润颖`）：
```
扫描 F:\runfeng\collection-monitor\docs\handover\ 目录，
找出所有 <日期>-<发出方>给润颖-*.md 且不在 _state-润颖.json 里的新交接件。
如果有：逐份读取并执行其中的任务，处理完后把文件名追加进 _state-润颖.json，
并把该件移动到 archive\ 子目录。
如果没有新件：简短回一句「无新交接件」即可。
```

**建议频率**：Every 30 minutes（太频繁会浪费额度，太慢会耽误进度）

### 6.2 Windows 计划任务（**已配置，机械提醒**）

**润行侧已挂好**：

```
任务名:     DSH-Handover-Scan
频率:       每 30 分钟
命令:       powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden
            -File "...\scan-handover.ps1" -For 润行
状态:       Ready（已实测链路可用）
```

**它做什么**：扫描目录 → 若发现发给润行的新件 → 写 `_PENDING-润行.md`

**它不能做什么**：⚠️ **它无法唤醒 agent**。运行中的 agent 不会因为磁盘上多了一个文件就自动醒来。
所以它只是**提醒器** —— 真正要读件、干活，还得靠 §6.1 的 DSH 定时任务，或者润锋说一句。

**手动跑 / 改频率**：

```powershell
# 手动触发
schtasks /Run /TN "DSH-Handover-Scan"

# 查看状态
schtasks /Query /TN "DSH-Handover-Scan" /FO LIST /V

# 改成每 15 分钟
schtasks /Change /TN "DSH-Handover-Scan" /RI 15

# 删除
schtasks /Delete /TN "DSH-Handover-Scan" /F
```

**润颖侧如果要装同样的**（把 `-For 润行` 换成 `-For 润颖`，任务名换个不冲突的）：

```powershell
schtasks /Create /TN "DSH-Handover-Scan-Ying" `
  /TR 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "F:\runfeng\collection-monitor\docs\handover\scan-handover.ps1" -For 润颖' `
  /SC MINUTE /MO 30 /F
```

---

### 6.3 ⚠️ 写 .ps1 必须带 UTF-8 BOM

**踩过的坑**：PowerShell 5.1 读 UTF-8 **无 BOM** 的 `.ps1` 会按 GBK 解码，中文全部乱码 → 语法错误。

本目录的 `scan-handover.ps1` 已修好（4310 B，前 3 字节是 `EF BB BF`）。

**以后写任何含中文的 .ps1，都要加 BOM**：

```powershell
$p = "路径\脚本.ps1"
$bytes = [System.IO.File]::ReadAllBytes($p)
if (-not ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)) {
  [System.IO.File]::WriteAllBytes($p, [byte[]](0xEF,0xBB,0xBF) + $bytes)
}
```

**判断脚本是否被正确读取**：

```powershell
[System.Management.Automation.Language.Parser]::ParseFile($p, [ref]$null, [ref]$err)
if ($err.Count) { "语法错误 $($err.Count) 处" } else { "✓ 通过" }
```

---

## 七、交接件的归档

**处理完的件必须移到 `archive\`**，否则双方会反复读到同一份。

`_state-<自己>.json` 是幂等依据 —— 即使忘了移动，扫描也不会重复读。

---

## 八、边界（不通过这个目录做的事）

| 事项 | 为什么不适合 |
|---|---|
| 密钥、密码、API Key | **禁止写进交接件**。凭据放 `.env`，交接件里只写「在哪」不写「是什么」 |
| 紧急中断/停止指令 | 用润锋直接说，交接件是异步的 |
| 需要润锋裁决的争议 | 走润策（PM），交接件里只写「已提请润策裁定」 |
| 大段二进制/附件 | 交接件只写路径引用 |

---

**润行（DSH / 红队）**
2026-10-02
