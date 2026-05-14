# 微软积分商城自动签到脚本

> **⚠️ 维护声明：本项目短期内不再维护。** 代码以开源形式发布供学习参考，不保证后续更新、Bug 修复或功能迭代。使用风险自担。

一个基于 ScriptCat/Tampermonkey 的 Microsoft Rewards 每日任务自动化脚本，通过模拟浏览器行为和调用微软 Rewards API，自动完成签到、搜索、阅读、活动等任务以获取积分奖励。

## 功能特性

| 功能 | 说明 |
|------|------|
| 每日签入 | PC 端 + App 端静默签到 |
| 自动搜索 | PC 端 + 移动端分离搜索，支持热搜词/离线随机词 |
| 新闻阅读 | 通过 DAPI 自动完成每日阅读任务 |
| 活动任务 | 自动点击每日活动、Quiz、拼图等 |
| Image Creator | 自动完成图片创作任务 |
| 二次扫描 | 首轮遗漏任务自动补扫 |
| 积分通知 | 支持企业微信/钉钉/飞书/PushMe/Bark 推送 |
| 拟人化 | 随机延迟（3-8s）、搜索间隔（30s±15s）、随机启动时间 |

## 安装

1. 安装 [ScriptCat](https://scriptcat.org/) 或 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 访问 [ScriptCat 脚本页面](https://scriptcat.org/zh-CN/script-show-page/6241) 安装，或手动将 `.user.js` 文件导入
3. 首次运行时按提示完成 Microsoft 账号授权

## 配置说明

脚本通过 `UserConfig` 提供可视化配置面板：

### 全局配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| 持续检测 | checkbox | `true` | 全部完成后是否继续轮询 |
| 锁定国区 | checkbox | `true` | 非大陆 IP 自动停止 |
| 搜索间隔 | number | `30` | 搜索间隔秒数（±15 秒随机偏移） |
| 搜索词接口 | select | `offline` | 搜索词来源（offline / 各热搜 API） |
| 授权码链接 | textarea | - | 粘贴 login.live.com 跳转后的完整 URL |

### 任务开关

每个任务可独立启用/禁用：签入、新闻阅读、活动任务、搜索（PC/移动）、Quiz、拼图、Image Creator 等。

### 通知配置

支持以下推送渠道，填入对应 Webhook URL 即可：

- **企业微信** — 群机器人 Webhook
- **钉钉** — 群机器人 Webhook
- **飞书** — 群机器人 Webhook
- **PushMe** — PushMe API Key
- **Bark** — Bark 推送地址

## 项目架构

```
微软自动化网络协议调试.user.js
│
├─ [1] 授权码捕获        — login.live.com OAuth2 回调拦截
├─ [2] RewardsAuto       — 核心配置、状态管理、运行入口
├─ [3] Webhooks          — 多渠道通知推送
├─ [4] Utils             — 工具类（延迟、XHR、日期等）
├─ [5] API               — API 交互层（DAPI、Bing Rewards API）
├─ [6] TaskManager       — 任务调度与管理
├─ [7] 打卡/DOM 任务     — rewards.bing.com 页面内任务
├─ [8] 菜单注册          — ScriptCat 菜单命令
└─ [9] 入口引导          — 启动流程与授权引导
```

## 核心 API 端点

| 端点 | 用途 |
|------|------|
| `prod.rewardsplatform.microsoft.com/dapi/me/activities` | 签到 / 阅读 / 活动上报 |
| `prod.rewardsplatform.microsoft.com/dapi/me` | 用户信息 / 阅读进度 |
| `rewards.bing.com/api/reportactivity` | PC 端签到 |
| `rewards.bing.com/api/getuserinfo` | Dashboard 数据 |
| `login.live.com/oauth20_token.srf` | OAuth2 Token 获取 / 刷新 |

## 技术要点

- **OAuth2 流程**：通过 `authorization_code` + `refresh_token` 模式获取访问令牌，支持自动续期
- **RSC 解析**：从 `rewards.bing.com/earn` 页面的 Next.js React Server Components 负载中提取积分和搜索配额数据
- **DAPI 查询**：`counters` 字段返回 `null`，搜索配额仅能通过 HTML 页面解析获取；`promotions` 字段用于阅读进度
- **防封号策略**：所有交互操作间强制 3-8 秒随机延迟，搜索间隔 30 秒 ±15 秒，启动时 5-95 秒随机等待

## 运行环境

- **脚本管理器**：ScriptCat（推荐）或 Tampermonkey
- **浏览器**：Chrome / Edge / Firefox 等主流浏览器
- **系统**：Windows / macOS / Linux
- **定时策略**：`*/20 * * * *`（每 20 分钟检测一次）

## 开发规范

- 输出语言：中文
- 跨域请求：使用 `GM_xmlhttpRequest`，不使用 `fetch`
- 持久化：使用 `GM_setValue` / `GM_getValue`
- DOM 操作：使用 `MutationObserver` 或异步轮询（带超时），不使用 `window.onload`
- 通知：使用 `GM_notification`
- 修改前必须先备份原文件

## 免责声明

本脚本仅供学习和研究目的。使用者应自行承担因使用本脚本所产生的一切风险和后果，包括但不限于：

- Microsoft 账号被限制或封禁
- 积分被扣除或清零
- 违反 Microsoft 服务条款所导致的任何后果

作者不对任何因使用本脚本而产生的直接或间接损失负责。

## 许可证

[MIT License](./LICENSE)
