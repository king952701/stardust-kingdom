# 星屿王国 · 放置传说 - 部署指南

## 仓库信息

- **GitHub 仓库**: https://github.com/king952701/stardust-kingdom
- **默认分支**: main
- **最后更新**: 2026-10-11

---

## 前端部署 (GitHub Pages)

### 当前状态
- 所有前端文件已上传到 GitHub
- 需要手动启用 GitHub Pages

### 启用步骤

1. 打开仓库: https://github.com/king952701/stardust-kingdom
2. 点击 **Settings** → **Pages** (左侧菜单)
3. 在 "Source" 下选择:
   - Branch: **main**
   - Folder: **/(root)**
4. 点击 **Save**
5. 等待 1-2 分钟，页面会显示部署状态

### 访问地址
部署成功后，游戏将可在以下地址访问:
- https://king952701.github.io/stardust-kingdom/

### 注意事项
- 前端游戏默认后端地址为 `http://localhost:3000`
- 联网功能需要配置后端服务器地址
- 在游戏「设置 → 联网与云存档」中修改服务器地址

---

## 后端部署 (Railway / Render)

### 方案一: Railway (推荐)

#### 步骤

1. 注册/登录 Railway: https://railway.app
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择 `king952701/stardust-kingdom` 仓库
4. 在部署配置中:
   - Root Directory: `星尘王国-联网版/server`
   - Build Command: (留空)
   - Start Command: `node server.js`
5. 点击 **Deploy**
6. 部署完成后，复制生成的 URL (如 https://xxx-xxx.up.railway.app)

#### 配置前端

1. 在游戏「设置 → 联网与云存档」中
2. 将服务器地址改为 Railway 提供的 URL
3. 保存并刷新页面

---

### 方案二: Render

#### 步骤

1. 注册/登录 Render: https://render.com
2. 点击 **New Web Service**
3. 连接 GitHub 仓库 `king952701/stardust-kingdom`
4. 配置:
   - Name: `stardust-kingdom-server`
   - Root Directory: `星尘王国-联网版/server`
   - Runtime: **Node**
   - Build Command: (留空)
   - Start Command: `node server.js`
   - Environment: **Node**
5. 点击 **Create Web Service**
6. 部署完成后，复制 HTTPS URL

---

### 方案三: 本地运行 (测试用)

```bash
cd 星尘王国-联网版/server
node server.js
```

后端将在 `http://localhost:3000` 启动。

---

## 文件结构

```
stardust-kingdom/
├── index.html                          # 主入口
├── 星尘王国-放置传说.html              # 移动版
├── 星尘王国-放置传说-电脑版.html       # 电脑版
├── cloud_save.js                       # 云存档模块
├── entertainment.js                    # 娱乐功能
├── giftcode.js                         # 礼包码
├── honor.js                            # 荣誉系统
├── resizable.js                        # 窗口调整
├── slot_machine.js                     # 老虎机
├── ui_collapse.js                      # UI 折叠
├── assets/                             # 资源文件
│   ├── icons/
│   └── plants/
├── server/                             # 后端服务器
│   ├── server.js                       # 主程序
│   ├── package.json
│   └── data/                           # 运行时数据 (不提交)
└── 星尘王国-联网版/
    └── README.md                       # 联网版说明
```

---

## 后端 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/online | 在线玩家数 |
| GET | /api/rank | 排行榜 Top50 |
| GET | /api/rank/detail?uid= | 玩家详情 |
| GET | /api/atlas | 全服图鉴 |
| GET | /api/chat?after= | 聊天消息 |
| POST | /api/auth/guest | 游客登录 |
| POST | /api/save | 上传存档 |
| GET | /api/save | 下载存档 |
| POST | /api/chat | 发送消息 |
| POST | /api/heartbeat | 心跳 |

---

## 后续优化建议

1. **数据持久化**: 将 JSON 文件存储替换为 PostgreSQL/MySQL
2. **HTTPS**: 确保前后端都使用 HTTPS
3. **限流增强**: 添加更完善的 Rate Limiting
4. **监控**: 添加错误日志和监控告警
5. **域名**: 配置自定义域名

---

## 联系与支持

如有问题，请查看:
- GitHub Issues: https://github.com/king952701/stardust-kingdom/issues
- README.md 中的详细说明
