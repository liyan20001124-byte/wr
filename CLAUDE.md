# 项目规则

## 项目概述
Bing Rewards 自动化脚本，运行环境为 ScriptCat 

## 文件命名规范
- 工作文件：`微软自动化网络协议调试.user.js`
- 归档备份：`微软自动化网络协议调试_[YYYYMMDD_HHmm]归档.user.js`
- 修改前必须先备份，再覆写

## 强制备份规则（必须遵守）
每次修改 `.user.js` 文件前，必须先执行备份：
1. 读取当前源文件
2. 复制为 `微软自动化网络协议调试_[YYYYMMDD_HHmm]归档.user.js`（使用当前时间）
3. 确认备份成功后再进行修改
4. 禁止跳过备份直接修改

## 开发约束

### ScriptCat 特性
- 后台静默任务使用 `// @crontab * * * * *`
- 跨域请求用 `GM_xmlhttpRequest`，不用 `fetch`
- 持久化数据用 `GM_setValue` / `GM_getValue`
- 通知用 `GM_notification`

### 防封号红线
- 所有点击/搜索/阅读之间强制 3-8 秒随机延迟（`Utils.randomDelay()`）
- 禁止极短时间的 `setInterval`
- DOM 元素用 `MutationObserver` 或异步轮询（带超时），不用 `window.onload`
- 搜索间隔默认 30 秒 ±15 秒

### 代码规范
- 输出使用中文
- 修改后用 `node --check` 验证语法
- 不添加无意义注释，只在 WHY 非显而易见时写注释

## 核心 API 端点
| 端点 | 用途 |
|------|------|
| `prod.rewardsplatform.microsoft.com/dapi/me/activities` | 签到/阅读/活动 |
| `prod.rewardsplatform.microsoft.com/dapi/me` | 用户信息/阅读进度 |
| `rewards.bing.com/api/reportactivity` | PC 签到 |
| `rewards.bing.com/api/getuserinfo` | Dashboard 数据 |
| `login.live.com/oauth20_token.srf` | Token 获取/刷新 |

## 脚本架构
```
[1] 授权码捕获 (login.live.com)
[2] RewardsAuto     — 核心配置与状态
[3] Webhooks        — 通知渠道
[4] Utils           — 工具类
[5] API             — API 交互层
[6] TaskManager     — 任务管理器
[7] 打卡/DOM 任务   — rewards.bing.com 页面内
[8] 菜单注册
[9] 入口引导
```
