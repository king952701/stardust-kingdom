@echo off
title 星尘王国 · 放置传说（Windows 电脑版）
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "URL=file:///C:/Users/沈/Doubao/chats/2026-10-06/new-chat/星尘王国/星尘王国-放置传说-电脑版.html"
if exist "%EDGE%" (
  start "" "%EDGE%" --app="%URL%" --window-size=1320,880
) else (
  start "" "%URL%"
)
