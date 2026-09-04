# DanBo

项目按客户端与服务器分开：

```text
danbo/
├─ danbo/     可直接发布的浏览器客户端
└─ server/    Colyseus 联机服务器、Windows 托盘宿主与 Web 管理端
```

## 游戏客户端

`danbo/` 是无需构建步骤的静态站点。推送 `main` 后，GitHub Actions 会把该目录发布到 GitHub Pages。

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

服务器详细说明见 [`server/README.md`](server/README.md)。
