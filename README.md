# EGGY Source

源码仓库现在按客户端与服务器分开：

```text
eggy-source/
├─ eggy/      浏览器游戏、地图、WASM 源码与发布脚本
└─ server/    Colyseus 联机服务器、Windows 托盘宿主与 Web 管理端
```

## 游戏客户端

```powershell
cd eggy
.\scripts\build-release.ps1
```

生成的网站位于 `eggy/dist/`。推送 `main` 后，GitHub Actions 会把客户端发布内容同步到公开仓库的 `eggy/`，并由 GitHub Pages Actions 发布该目录。

## 联机服务器

```powershell
cd server
npm install
npm test
npm run desktop
```

Windows 安装包与免安装版：

```powershell
cd server
npm run package:win
```

详细说明分别见 [`eggy/PUBLISHING.md`](eggy/PUBLISHING.md) 与 [`server/README.md`](server/README.md)。
