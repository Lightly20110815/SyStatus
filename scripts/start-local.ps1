#requires -Version 5.1
<#
  Sy State 本地启动脚本。
  桌面快捷方式最终指向这个脚本（或同目录的 start-local.bat）。

  它会：
    1. 确保当前目录是 git 仓库，并配置提交身份（仅在缺失时）
    2. 首次运行自动安装依赖
    3. 没有构建产物时自动构建前端
    4. 启动本地 Node 服务（同时托管页面与 /api），并自动打开浏览器

  参数：
    -Build   强制重新构建前端（改了前端代码后用）
    -Fresh   删除并重新安装依赖
    -Port    指定端口（默认 4823）
#>
[CmdletBinding()]
param(
  [switch]$Build,
  [switch]$Fresh,
  [int]$Port = 4823
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "  Sy State - 本地启动" -ForegroundColor Cyan
Write-Host "  项目目录: $root"
Write-Host ""

# 1) 确保 git 仓库与提交身份
if (-not (Test-Path (Join-Path $root ".git"))) {
  Write-Host "  初始化 git 仓库…"
  git init | Out-Null
  git branch -M main 2>$null | Out-Null
}
$email = (& git config user.email 2>$null)
if (-not $email) {
  git config user.email "sy-state@localhost"
  git config user.name  "Sy State"
  Write-Host "  已设置仓库级 git 身份（Sy State）。"
}

# 2) 依赖
$nodeModules = Join-Path $root "node_modules"
if ($Fresh -and (Test-Path $nodeModules)) {
  Write-Host "  移除旧依赖…"
  Remove-Item -Recurse -Force $nodeModules
}
if (-not (Test-Path $nodeModules)) {
  Write-Host "  安装依赖（首次较慢，请稍候）…" -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install 失败" }
}

# 3) 构建前端
$distIndex = Join-Path $root "dist\index.html"
if ($Build -or -not (Test-Path $distIndex)) {
  Write-Host "  构建前端…" -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "构建失败" }
}

# 4) 启动服务（自动开浏览器）
$env:PORT = "$Port"
$env:SY_OPEN = "1"
Write-Host ""
Write-Host "  启动本地服务: http://127.0.0.1:$Port" -ForegroundColor Green
if (-not $env:DEEPSEEK_API_KEY) {
  Write-Host "  提示: 未检测到 DEEPSEEK_API_KEY，AI 将走本地 fallback（功能正常）。" -ForegroundColor DarkGray
}
Write-Host "  按 Ctrl+C 退出。"
Write-Host ""
node server/index.js
