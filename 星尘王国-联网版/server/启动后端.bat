@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 星屿王国 联网后端
echo ==========================================
echo    星屿王国 · 放置传说 —— 联网后端
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 电脑上未检测到 Node.js
  echo 请先安装 Node.js（到 https://nodejs.org 下载 LTS 版安装即可）
  echo.
  pause
  exit /b
)
echo 正在启动后端服务...
echo.
echo 启动成功后：打开游戏 HTML → 「设置」→「联网与云存档」→ 点「游客登录」
echo 关闭本窗口 = 停止后端服务
echo.
node server.js
echo.
echo 后端已停止。
pause
