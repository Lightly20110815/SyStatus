@echo off
chcp 65001 >nul
title Sy State
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1" %*
echo.
echo (服务已退出) 按任意键关闭此窗口...
pause >nul
