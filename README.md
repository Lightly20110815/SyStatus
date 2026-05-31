# Sy State

一个给 Sy 私人使用的本地心理状态记录仪。

它不记长篇日记，只记录"某一瞬间的心理状态快照"：一个 0–100 的分数、1–6 个感受、0–10 个影响因素、一句第三人称的状态句子。保存到本地 JSON 文件，并自动 `git commit / git push`。

不是 Todo，不是效率工具，不是心理咨询 App，不是健康管理模板，不是 SaaS 后台。只是保存状态、显示趋势、留下证据。

---

## 快速开始

### 1. 安装依赖

```powershell
npm install
```

### 2. 启动（推荐用启动脚本）

双击 `scripts/start-local.bat`，或在 PowerShell 里：

```powershell
.\scripts\start-local.ps1
```

脚本会自动：确保 git 仓库与提交身份 → 首次安装依赖 → 没有构建产物时自动构建前端 → 启动本地 Node 服务 → 打开浏览器到 `http://127.0.0.1:4823`。

常用参数：

```powershell
.\scripts\start-local.ps1 -Build     # 改过前端代码后，强制重新构建
.\scripts\start-local.ps1 -Fresh     # 重新安装依赖
.\scripts\start-local.ps1 -Port 5000 # 换端口
```

> 第一次启动会装依赖 + 构建，稍慢；之后每次点开都很快。

### 3. 开发模式（可选，需要热更新时）

开两个终端：

```powershell
npm run server   # 本地 Node 服务（端口 4823，负责 /api、文件、git、AI）
npm run dev      # Vite 开发服务器（端口 5173，/api 自动代理到 4823）
```

开发时访问 `http://localhost:5173`。

---

## 创建桌面快捷方式

让 Sy 一键打开：

1. 右键 `scripts\start-local.bat` → 发送到 → 桌面快捷方式。
2. （可选）右键快捷方式 → 属性 → 更改图标，挑一个安静的图标。
3. （可选）属性 → 快捷方式 → 起始位置填项目根目录 `C:\Users\Yang Xingran\SyStatus`。

之后双击快捷方式即可：启动服务 → 自动打开网页 → 记录 → 保存 → 自动提交。

---

## 数据文件在哪里

都在项目的 `data/` 目录，是纯本地 JSON：

- `data/records.json` —— 所有状态记录（按创建时间升序保存）
- `data/settings.json` —— 自定义感受标签、自定义影响因素

这两个文件就是"证据本体"，也是唯一会被自动提交进 git 的文件。备份/迁移时只需带走 `data/`。

记录结构示例：

```json
{
  "id": "2026-05-31T12:34:56.789Z",
  "createdAt": "2026-05-31T12:34:56.789Z",
  "finalScore": 38,
  "feelings": ["麻木", "疲惫", "卡住"],
  "factors": ["学校", "睡眠"],
  "stateText": "这一刻的 Sy 有些低电量，保存下来就已经足够。"
}
```

`id` 与 `createdAt` 都是创建那一刻的 UTC ISO 字符串；界面展示时才转换成本地时间。

---

## AI / API Key 配置

AI 用来生成"状态句子"和给自定义感受估算权重。调用走 **DeepSeek**，且**只在本地 Node 服务里发生**，浏览器端永远拿不到 Key。

配置方法：复制 `.env.example` 为 `.env`，填入：

```
DEEPSEEK_API_KEY=sk-你的真实key
```

`.env` 已被 `.gitignore` 忽略，不会被提交。也可以把 `DEEPSEEK_API_KEY` 设成系统环境变量（真实环境变量优先于 `.env`）。

可选项：

```
# PORT=4823            本地服务端口
# DEEPSEEK_MODEL=deepseek-chat   覆盖模型
```

**不填 Key 也能用** —— AI 不可用时一律走本地 fallback，功能不会坏。

---

## 哪些功能有 fallback

- **状态句子**：优先 AI 生成；AI 不可用 / 超时 / 输出违反人称规则时，自动用本地基于分数区间 + 感受的兜底句子。保存为空时，服务端也会自动补一句。
- **自定义感受权重**：留空则让 AI 参考默认体系估算；AI 失败时回落到 `50` 并标记"待校准"，可手动调整。
- **前端兜底**：连本地服务都不可达时，记录页仍能生成一句最简兜底句子，保证保存流程不中断。

---

## Git push 失败时怎么办

这是预期内的情况，不是故障。规则如下：

- **保存文件成功 + commit 成功 + push 成功** → 提示"已保存并同步"。
- **保存文件成功 + commit 成功 + push 失败**（没配远程 / 没网 / 没权限）→ 本地记录照常保留，提示"已保存到本地，但推送失败"，详情可展开查看。
- **保存文件失败** → 不执行 git，提示"保存失败"。

只 `git add` 这两个数据文件，绝不 `git add .`；没有变化时不提交。

想让 push 成功，给仓库配一个远程即可：

```powershell
git remote add origin <你的仓库地址>
git push -u origin main
```

配好之后，每次保存/删除都会自动推送。

---

## 主要文件结构

```
SyStatus/
  data/
    records.json          # 状态记录（自动提交）
    settings.json         # 自定义标签（自动提交）
  server/                 # 本地 Node 服务（零运行时依赖，只用内置模块）
    index.js              # HTTP 服务 + 路由 + 静态托管 + 自动开浏览器
    storage.js            # 读写 JSON（原子写）、记录与设置的增删
    git.js                # git add / commit / push，优雅降级
    ai.js                 # DeepSeek 调用 + 本地 fallback
    env.js                # 极简 .env 加载器
  src/
    main.jsx, App.jsx
    pages/                # 记录 / 历史 / 统计 / 设置 四个页面
    components/           # AppShell、TagPicker、ScoreAdjuster、StateTextEditor、
                          # RecordCard、ConfirmDialog、EmptyState、StatCard、TrendChart、Toast
    data/                 # 默认感受（含权重）、默认影响因素（前后端共用）
    utils/                # score / time / stats / api / colors / feedback
    styles/               # base / theme / layout / components
  scripts/
    start-local.ps1       # 本地启动脚本（桌面快捷方式指向它）
    start-local.bat       # Windows 双击入口
  .env.example
  vite.config.js
  package.json
```

---

## 已实现功能清单

- [x] 桌面快捷方式 → 启动脚本 → 本地服务 + 自动开浏览器
- [x] 记录流程：选感受(1–6) → 选影响因素(0–10) → 估算分 → −10~+10 微调 → 生成/编辑状态句子 → 保存
- [x] 分数系统：感受 baseScore 平均估算 + 微调，clamp 0–100，7 段区间文案与配色（低分冷色不刺眼、高分柔暖不奖励化）
- [x] 状态句子：AI（DeepSeek，第三人称、禁用"我/你/用户/来访者"等）+ 本地 fallback，可编辑，保存编辑后版本
- [x] 保存：写入 `records.json`（升序）→ 自动 commit/push，按推送结果给温和反馈
- [x] 历史页：最新在上，展示时间/分数/句子/感受/因素，无因素不显示空区域，可删除（二次确认）
- [x] 统计页：今天 / 本周（周一起）/ 本月，平均分、状态曲线、记录次数、高频感受、高频影响因素，空数据有温和提示，无记录的天不补 0
- [x] 设置页：默认标签只读（不显示权重）；自定义感受可加（手填权重或 AI 估算 + 数字/滑条确认）/删；自定义影响因素可加/删；重复校验、长标签换行
- [x] 本地 API：records / settings / ai 全部接口
- [x] AI 失败 fallback、git push 失败优雅降级、文件原子写

---

## 后续可以继续细化的点

先把第一颗螺丝拧好了，这些是之后可选的打磨：

- 记录页可加"保存成功后快速再记一条 / 跳到历史"的小入口
- 历史页记录变多后，加按日期分组或简单筛选
- 统计页可增加"低分时常见感受/因素"与"高分时常见感受/因素"的对照（数据结构已支持，做个聚合即可）
- 自定义感受权重支持"重新让 AI 估一次"
- 导出（如导出某段时间的记录为单独文件）
- 给状态句子的 AI 调用加可选的"更短 / 更长"风格开关
- 首次启动时，启动脚本可顺手帮忙创建桌面快捷方式

---

本地工具，单用户，无登录、无账号、无云同步、无数据库。数据是 Sy 自己的，留在 Sy 自己的机器和 git 仓库里。
