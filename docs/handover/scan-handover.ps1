# -*- coding: utf-8 -*-
<#
.SYNOPSIS
  润锋团队交接目录扫描器

.DESCRIPTION
  扫描 F:\runfeng\collection-monitor\docs\handover\ 下发给指定接收方的新交接件。
  以 _state-<接收方>.json 作为幂等依据（即使忘了归档也不会重复读）。

  注意：本脚本只能"提醒"，不能唤醒 agent。真正的自动处理请用 DSH 原生
  定时任务（自动化任务页，Every N minutes），见 README.md §6.1。

.PARAMETER For
  接收方：润行 或 润颖

.PARAMETER Mark
  把发现的新件标记为已读（写进 _state-<接收方>.json）。
  不传则只列出、不改状态（用于人工预览）。

.EXAMPLE
  .\scan-handover.ps1 -For 润行
.EXAMPLE
  .\scan-handover.ps1 -For 润颖 -Mark
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('润行', '润颖')]
  [string]$For,

  [switch]$Mark
)

$ErrorActionPreference = 'Stop'
$Dir = $PSScriptRoot
$StateFile = Join-Path $Dir ("_state-{0}.json" -f $For)
$PendingFile = Join-Path $Dir ("_PENDING-{0}.md" -f $For)

# ── 读已读状态 ────────────────────────────────────────────────
$seen = @()
if (Test-Path -LiteralPath $StateFile) {
  try {
    $j = Get-Content -LiteralPath $StateFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($j.seen) { $seen = @($j.seen) }
  } catch {
    Write-Warning "状态文件损坏，按空处理: $StateFile"
  }
}

# ── 找候选：**给<For>-*.md 的交接件 ─────────────────────────
$all = Get-ChildItem -LiteralPath $Dir -File -Filter '*.md' -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -ne 'README.md' -and
    $_.Name -notlike '_PENDING-*' -and
    $_.Name -match ('^(\d{4}-\d{2}-\d{2}-\d{4})-(润行|润颖)给' + [regex]::Escape($For) + '-(.+)\.md$')
  }

$new = @($all | Where-Object { $seen -notcontains $_.Name } | Sort-Object Name)

# ── 输出 ──────────────────────────────────────────────────────
Write-Host ""
Write-Host ("交接目录: {0}" -f $Dir)
Write-Host ("接收方:   {0}" -f $For)
Write-Host ("已有件:   {0} 个    已读: {1} 个    新件: {2} 个" -f $all.Count, $seen.Count, $new.Count)
Write-Host ""

if ($new.Count -eq 0) {
  Write-Host "  无新交接件。" -ForegroundColor DarkGray
  if (Test-Path -LiteralPath $PendingFile) { Remove-Item -LiteralPath $PendingFile -Force }
  exit 0
}

foreach ($f in $new) {
  $head = ""
  try {
    $head = (Get-Content -LiteralPath $f.FullName -Encoding UTF8 -TotalCount 8) -join ' | '
  } catch { }
  Write-Host ("  ★ {0}" -f $f.Name) -ForegroundColor Yellow
  Write-Host ("      {0}" -f $head.Substring(0, [Math]::Min(150, $head.Length))) -ForegroundColor DarkGray
}

# ── 写 PENDING 标记 ───────────────────────────────────────────
$body = @()
$body += "# 有新交接件待处理 —— $For"
$body += ""
$body += "生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$body += ""
$body += "| # | 文件 | 大小 |"
$body += "|---|---|---|"
$i = 0
foreach ($f in $new) {
  $i++
  $body += ("| {0} | {1} | {2:N0} B |" -f $i, $f.Name, $f.Length)
}
$body += ""
$body += "**处理完请把件移到 ``archive\``，并运行 ``.\scan-handover.ps1 -For $For -Mark``。**"
[System.IO.File]::WriteAllLines($PendingFile, $body, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host ("  已写标记: {0}" -f (Split-Path $PendingFile -Leaf)) -ForegroundColor Cyan

# ── 可选：标记已读 ────────────────────────────────────────────
if ($Mark) {
  $seen = @($seen + ($new | ForEach-Object { $_.Name }) | Select-Object -Unique)
  $out = [ordered]@{
    for       = $For
    updatedAt = (Get-Date -Format 'o')
    seen      = $seen
  }
  [System.IO.File]::WriteAllText($StateFile, ($out | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("  已标记已读 {0} 个 -> {1}" -f $new.Count, (Split-Path $StateFile -Leaf)) -ForegroundColor Green
}
