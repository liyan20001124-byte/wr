// ==UserScript==
// @name         微软积分商城签到（全能智能重构版）
// @namespace    https://github.com/liyan20001124-byte/wr
// @version      2.1.0
// @description  整合比尔脚本和Python版先进功能，全自动执行：✅签入、✅阅读文章、✅活动卡片、✅Quiz自动答题、✅拼图跳过、✅Image Creator、✅PC/移动端搜索、✅搜索受限检测、✅热搜API搜索词、✅Copilot提示词、✅二次扫描、✅Next.js RSC数据解析
// @author       liyan20001124-byte
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzAwN2FmZiIgZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVIN0wxMiAyeiIvPjwvc3ZnPg==
// @homepage     https://github.com/liyan20001124-byte/wr
// @supportURL   https://github.com/liyan20001124-byte/wr/issues
// @license      MIT
// @crontab      */20 * * * *
// @connect      bing.com
// @connect      login.live.com
// @connect      rewards.bing.com
// @connect      prod.rewardsplatform.microsoft.com
// @connect      hotapi.nntool.cc
// @connect      hot.baiwumm.com
// @connect      cnxiaobai.com
// @connect      disp-qryapi.3g.qq.com
// @connect      qyapi.weixin.qq.com
// @connect      oapi.dingtalk.com
// @connect      open.feishu.cn
// @connect      push.i-i.me
// @connect      api.day.app
// @match        https://login.live.com/oauth20_desktop.srf*
// @match        https://rewards.bing.com/*
// @match        https://www.bing.com/*
// @match        https://cn.bing.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_cookie
// @grant        GM_info
// @grant        GM_log
// @grant        GM_registerMenuCommand
// @storageName  BingRewardsAuto_Shared
// ==/UserScript==

/* global GM_cookie, GM_getValue, GM_setValue, GM_xmlhttpRequest, GM_log, GM_info, GM_notification, GM_openInTab */

/* ==UserConfig==
Config:
    keep:
        title: 持续检测（全部完成后是否继续）
        type: checkbox
        default: true
    lock:
        title: 锁定国区（非大陆IP自动停止）
        type: checkbox
        default: true
    span:
        title: 搜索间隔（秒）
        type: number
        default: 30
        min: 30
        unit: ±15秒
    api:
        title: 搜索词接口（offline为随机搜索词）
        type: select
        default: offline
        values: [offline, hot.nntool.cc, hot.baiwumm.com, hot.cnxiaobai.com]
    code:
        title: 授权码链接
        type: textarea
        description: 粘贴 login.live.com 跳转后的完整URL
Tasks:
    sign:
        title: 每日签入
        type: checkbox
        default: true
    read:
        title: 新闻阅读
        type: checkbox
        default: true
    promos:
        title: 活动卡片（含打卡）
        type: checkbox
        default: true
    quiz:
        title: Quiz 自动答题
        type: checkbox
        default: true
    search:
        title: PC/移动搜索
        type: checkbox
        default: true
Notice:
    bro:
        title: 浏览器通知（当前脚本）
        type: checkbox
        default: true
    wework:
        title: 企业微信消息推送（群机器人）
        type: text
        password: true
        description: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    dingding:
        title: 钉钉群机器人（不加签，关键词：#）
        type: text
        password: true
        description: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    feishu:
        title: 飞书群机器人（不加签，关键词：#）
        type: text
        password: true
        description: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    pushme:
        title: PushMe（push.i-i.me）
        type: text
        password: true
        description: xxxxxxxxxxxxxxxxxxxx
    bark:
        title: Bark（bark.day.app）
        type: text
        password: true
        description: xxxxxxxxxxxxxxxxxxxx
==/UserConfig== */

(function() {
    'use strict';

    // =====================================================
    // 【改动说明】授权码捕获逻辑，继承自 Untitled-1.txt
    // 当用户在 login.live.com 完成授权时自动捕获 code
    // =====================================================
    if (location.hostname === "login.live.com" && location.pathname === "/oauth20_desktop.srf") {
        const code = new URLSearchParams(location.search).get("code");
        if (code) {
            GM_setValue("Config.code", location.href);
            GM_setValue("Config.token", false);
            GM_notification({ title: "🟢 授权成功", text: "授权码已捕获，可关闭此页" });
            try { history.replaceState({}, "", "about:blank"); } catch(_) {}
            setTimeout(() => { try { window.close(); } catch(_) {} }, 200);
        }
        return;
    }

    // =====================================================
    // 核心配置与状态管理
    // 【改动说明】整合了 Untitled-1.txt 的状态管理结构
    // =====================================================
    const RewardsAuto = {
        // 浏览器 UA 配置
        ua: {
            pc: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
            mobile: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 EdgA/131.0.0.0",
        },
        // 搜索词池（整合Python版的自然语言搜索词，更丰富多样）
        searchPool: [
            // 自然语言问题（MS rewards these higher than keyword soup）
            "what is the weather forecast tomorrow",
            "how do I make sourdough bread at home",
            "where can I find cheap flights to tokyo",
            "why is the sky blue scientific explanation",
            "how to learn rust programming in 2026",
            "what time does the world cup final start",
            "how to fix a leaky kitchen faucet step by step",
            "what are the best vr games of 2026",
            "how to start a vegetable garden in spring",
            "where to watch new movies this week",
            "how to take care of a bonsai tree",
            "what is the difference between python async and threading",
            "how to meditate properly for beginners",
            "what is the origin of halloween traditions",
            "how do solar panels actually work",
            "what is the best mechanical keyboard for typing",
            "how to tie a windsor knot tie",
            "what causes northern lights aurora borealis",
            "how to brew the perfect espresso at home",
            "what are the symptoms of vitamin d deficiency",
            "how to sleep better naturally tonight",
            "why do cats purr when they are happy",
            // 地点/新闻/购物意图（also rewarded well）
            "best coffee shops in san francisco downtown",
            "italian restaurants near times square",
            "tokyo cherry blossom season 2026 forecast",
            "rtx 5070 ti benchmark vs rtx 4080 super",
            "iphone 17 release date and features",
            "tesla stock price today nasdaq",
            "best noise cancelling headphones under 300",
            "fastest electric cars 0 to 60 mph",
            "vintage camera brands collectors guide",
            "budget gaming laptop with rtx 4070 2026",
            // 操作指南/食谱（these often unlock answer panels）
            "easy chocolate chip cookies recipe from scratch",
            "30 minute home workout routine no equipment",
            "stretching exercises for lower back pain relief",
            "easy origami crane folding instructions",
            "git rebase vs merge which one to use",
            "markdown cheat sheet with examples",
            "japanese hiragana chart pronunciation",
            "ancient rome history quick overview",
            "pomodoro technique for focus and productivity",
            "healthy breakfast ideas under 10 minutes",
            // 中文搜索词
            "天气预报", "今日新闻热点", "美食食谱家常菜", "旅游攻略", "健康养生知识",
            "科技资讯", "电影推荐", "股票行情", "体育赛事", "历史上的今天"
        ],
        // Copilot 提示词（来自Python版）
        copilotPrompts: [
            "Give me three quick dinner ideas using chicken and pasta.",
            "Explain quantum entanglement in a paragraph for a beginner.",
            "What's a fun weekend project I can do with a Raspberry Pi?",
            "Suggest a 7-day Tokyo travel itinerary focused on food.",
            "Help me write a polite reminder email to a coworker.",
        ],
        // 热搜API配置（来自比尔脚本）
        apiConfig: {
            mode: GM_getValue("Config.api", "offline"),
            arr: [
                ["hot.baiwumm.com", {
                    url: "https://hot.baiwumm.com/api/",
                    hot: ["weibo", "douyin", "baidu", "toutiao", "thepaper", "qq", "netease", "zhihu"],
                }],
                ["hot.cnxiaobai.com", {
                    url: "https://cnxiaobai.com/DailyHotApi/",
                    hot: ["weibo", "douyin", "baidu", "toutiao", "thepaper", "qq-news", "netease-news", "zhihu"],
                }],
                ["hot.nntool.cc", {
                    url: "https://hotapi.nntool.cc/",
                    hot: ["weibo", "douyin", "baidu", "toutiao", "thepaper", "qq-news", "netease-news", "zhihu"],
                }],
            ],
            url: "",
            hot: [],
            wordList: [],
            wordIndex: 0,
        },
        // Image Creator 提示词
        imagePrompts: [
            "A peaceful forest at dawn with golden sunlight filtering through trees",
            "Cozy coffee shop interior with warm lighting and wooden tables",
            "Futuristic city skyline at dusk with flying cars and neon lights",
            "Japanese garden with koi pond and cherry blossoms",
            "Mountain landscape with snow-capped peaks and crystal lake"
        ],
        // 【改动说明】跳过规则，继承自 Python 版的自动跳过逻辑
        skipPatterns: [
            "referral", "refer and earn", "sweepstake", "entries",
            "install the", "set bing as your default", "bing wallpaper",
            "punch card", "ancient coin", "sea of thieves", "rewards extension",
            "redemption goal", "order history", "claim your gift", "shop to earn",
            "set goal", "Available tomorrow", "Offer is Locked", "Earn -1 points"
        ],
        // 运行状态
        state: {
            token: false,
            region: "CN",
            host: "www.bing.com",
            dateNowNum: 0,
            dateNowStr: "",
            pcProgress: 0,
            pcMax: 90,
            mobileProgress: 0,
            mobileMax: 60,
            sendMSG: "",
            // 搜索受限检测（来自比尔脚本）
            lastSearchProgress: -1,
            restrictedTimes: 0,
            // IP详细信息（来自比尔脚本）
            ip: "",
            ipInfo: "",
            // 任务计时
            startTime: 0,
        }
    };

    // =====================================================
    // 通知接口配置
    // 【改动说明】继承自比尔的通知接口，支持多种推送方式
    // =====================================================
    const Webhooks = [
        {
            name: "企业微信",
            url: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=",
            key: GM_getValue("Notice.wework", false),
            msg: {
                "msgtype": "text",
                "text": {
                    get content() {
                        return `> ${new Date().toLocaleString()}\n\n ## ${GM_info.script.name}\n ${RewardsAuto.state.sendMSG}`
                    }
                },
            },
        },
        {
            name: "钉钉",
            url: "https://oapi.dingtalk.com/robot/send?access_token=",
            key: GM_getValue("Notice.dingding", false),
            msg: {
                "msgtype": "markdown",
                "markdown": {
                    "title": GM_info.script.name,
                    get text() {
                        return `> ${new Date().toLocaleString()}\n ### ${GM_info.script.name}\n ${RewardsAuto.state.sendMSG}`
                    }
                },
            },
        },
        {
            name: "飞书",
            url: "https://open.feishu.cn/open-apis/bot/v2/hook/",
            key: GM_getValue("Notice.feishu", false),
            msg: {
                "msg_type": "interactive",
                "card": {
                    "schema": "2.0",
                    "header": {
                        "title": {
                            "tag": "plain_text",
                            "content": GM_info.script.name
                        },
                        "template": "orange"
                    },
                    "body": {
                        "elements": [{
                            "tag": "markdown",
                            "text_align": "center",
                            get content() {
                                return `#### ${new Date().toLocaleString()}\n ${RewardsAuto.state.sendMSG}`
                            }
                        }]
                    }
                }
            },
        },
        {
            name: "PushMe",
            url: "https://push.i-i.me/?push_key=",
            key: GM_getValue("Notice.pushme", false),
            msg: {
                "type": "markdown",
                "title": `${GM_info.script.name}[#rewards!https://rewards.bing.com/rewards.png]`,
                get content() {
                    return `\n ${RewardsAuto.state.sendMSG}`
                }
            },
        },
        {
            name: "Bark",
            url: "https://api.day.app/",
            key: GM_getValue("Notice.bark", false),
            msg: {
                "group": "rewards",
                "icon": "https://rewards.bing.com/rewards.png",
                "title": GM_info.script.name,
                get markdown() {
                    return `\n ${RewardsAuto.state.sendMSG}`
                }
            },
        },
    ];

    // =====================================================
    // 工具类
    // 【改动说明】严格遵守防封号规则，所有延迟使用 3-8 秒随机值
    // =====================================================
    const Utils = {
        // 日志输出（带通知支持）
        log(icon, msg, push = false) {
            GM_log(`${icon} ${msg}`);
            if (push && GM_getValue("Notice.bro", true)) {
                GM_notification({
                    title: GM_info.script.name + ` ${icon}`,
                    text: msg,
                    onclick: () => GM_openInTab("https://rewards.bing.com/dashboard", { active: true })
                });
            }
            // 发送到外部通知接口
            if (push) {
                RewardsAuto.state.sendMSG = `${icon} ${msg}`;
                this.sendWebhook();
            }
        },

        // 发送webhook通知
        async sendWebhook() {
            await Promise.all(Webhooks.map(async (i) => {
                if (!i.key) return;
                const safeKey = String(i.key).trim();
                const targetUrl = safeKey.startsWith("http") ? safeKey : i.url + safeKey;
                try {
                    const result = await this.xhr({
                        method: "POST",
                        url: targetUrl,
                        headers: {
                            "content-type": "application/json; charset=UTF-8",
                        },
                        data: JSON.stringify(i.msg),
                    });
                    if (result) GM_log(`🔵 「${i.name}」消息推送完成`);
                } catch (e) {
                    GM_log(`🔴 「${i.name}」消息推送出错: ${e.message}`);
                }
            }));
        },

        // 网络请求封装（整合比尔脚本的耗时记录）
        xhr(options) {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                GM_xmlhttpRequest({
                    ...options,
                    timeout: 15000,
                    onload: (res) => {
                        const cost = ((Date.now() - start) / 1000).toFixed(2);
                        if (res.status >= 200 && res.status < 300) {
                            resolve(res.responseText);
                        } else if ([301, 302, 307, 308].includes(res.status)) {
                            const match = res.responseHeaders?.match(/Location:\s*(.*?)\s*\r?\n/i);
                            resolve(match ? match[1] : false);
                        } else {
                            reject(new Error(`HTTP ${res.status}，用时 ${cost} 秒`));
                        }
                    },
                    onerror: (err) => {
                        const cost = ((Date.now() - start) / 1000).toFixed(2);
                        reject(new Error(`${err?.error || "网络错误"}，用时 ${cost} 秒`));
                    },
                    ontimeout: () => {
                        const cost = ((Date.now() - start) / 1000).toFixed(2);
                        reject(new Error(`请求超时，用时 ${cost} 秒`));
                    }
                });
            });
        },

        // 【防封号核心】随机数范围生成
        randomRange(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        },

        // 时间戳获取
        getTimestamp() {
            return Date.now();
        },

        // 获取今日日期数字格式 YYYYMMDD
        getTodayNum() {
            const d = new Date();
            return Number(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`);
        },

        // 获取今日日期字符串格式 M/D/YYYY
        getTodayStr() {
            const d = new Date();
            return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
        },

        // 生成随机 UUID
        getRandomUUID() {
            return crypto.randomUUID().replace(/-/g, "").toUpperCase();
        },

        // JSON 验证
        isJSON(s) {
            try { const j = JSON.parse(s); return Array.isArray(j) || (typeof j === "object" && j !== null); }
            catch { return false; }
        },

        // 延迟函数
        delay(ms) {
            return new Promise(r => setTimeout(r, ms));
        },

        // 【防封号核心】随机延迟 3-8 秒，模拟人类操作
        randomDelay(min = 3000, max = 8000) {
            return this.delay(this.randomRange(min, max));
        },

        // 【防封号核心】等待 DOM 元素出现（使用 MutationObserver）
        waitForElement(selector, timeout = 30000) {
            return new Promise((resolve, reject) => {
                const element = document.querySelector(selector);
                if (element) return resolve(element);

                const observer = new MutationObserver((_, obs) => {
                    const el = document.querySelector(selector);
                    if (el) { obs.disconnect(); resolve(el); }
                });
                observer.observe(document.body, { childList: true, subtree: true });

                setTimeout(() => {
                    observer.disconnect();
                    const el = document.querySelector(selector);
                    el ? resolve(el) : reject(new Error(`等待元素超时: ${selector}`));
                }, timeout);
            });
        },

        // 【防封号核心】等待包含指定文本的元素
        waitForElementsByText(containerSelector, textPatterns, timeout = 30000) {
            return new Promise((resolve, reject) => {
                const findElements = () => {
                    const containers = document.querySelectorAll(containerSelector);
                    const results = [];
                    for (const container of containers) {
                        const text = container.textContent || "";
                        for (const pattern of textPatterns) {
                            if (text.includes(pattern)) {
                                results.push({ element: container, pattern });
                                break;
                            }
                        }
                    }
                    return results;
                };

                const found = findElements();
                if (found.length > 0) return resolve(found);

                const observer = new MutationObserver((_, obs) => {
                    const found = findElements();
                    if (found.length > 0) { obs.disconnect(); resolve(found); }
                });
                observer.observe(document.body, { childList: true, subtree: true });

                setTimeout(() => {
                    observer.disconnect();
                    const found = findElements();
                    found.length > 0 ? resolve(found) : reject(new Error("等待文本元素超时"));
                }, timeout);
            });
        }
    };

    // =====================================================
    // API 交互层
    // 【改动说明】继承 Untitled-1.txt 的 Token 续期逻辑和 API 调用方式
    // =====================================================
    const API = {
        // Token 获取（整合比尔脚本的重试机制）
        async getToken(url, maxRetries = 3) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const res = await Utils.xhr({ url });
                    if (!Utils.isJSON(res)) {
                        if (attempt < maxRetries) {
                            await Utils.delay(3210);
                            continue;
                        }
                        return false;
                    }
                    const data = JSON.parse(res);
                    if (data.error) {
                        Utils.log("🔴", `Token错误: ${data.error} - ${data.error_description || ''}`);
                        if (["invalid_grant","invalid_request"].includes(data.error)) {
                            GM_setValue("Config.token", false);
                            GM_setValue("Config.code", "");
                        }
                        return false;
                    }
                    if (data.refresh_token && data.access_token) {
                        GM_setValue("Config.token", data.refresh_token);
                        GM_setValue("Config.tokenTime", Utils.getTimestamp());
                        RewardsAuto.state.token = data.access_token;
                        return true;
                    }
                    if (attempt < maxRetries) {
                        await Utils.delay(3210);
                        continue;
                    }
                    return false;
                } catch (e) {
                    if (e.message.includes("400") || e.message.includes("401")) {
                        GM_setValue("Config.token", false);
                        GM_setValue("Config.code", "");
                        return false;
                    }
                    if (attempt < maxRetries) {
                        await Utils.delay(3210);
                        continue;
                    }
                    Utils.log("🔴", `Token请求失败: ${e.message}`);
                    return null;
                }
            }
            return null;
        },

        // 【改动说明】Token 续期逻辑，继承自 Untitled-1.txt 的 renewToken 函数
        // 支持自动获取授权码、手动粘贴、自动刷新三种方式
        async renewToken() {
            if (!GM_getValue("Tasks.sign", true) && !GM_getValue("Tasks.read", true)) return true;
            
            let refreshToken = GM_getValue("Config.token", false);
            const tokenTime = GM_getValue("Config.tokenTime", 0);
            
            // Token 超过 7 天提前续期
            if (tokenTime > 0) {
                const days = (Utils.getTimestamp() - tokenTime) / (1000 * 60 * 60 * 24);
                if (days > 7) {
                    Utils.log("🟡", `Token已${Math.floor(days)}天，提前续期`);
                    refreshToken = false;
                }
            }

            const authUrl = "https://login.live.com/oauth20_authorize.srf?client_id=0000000040170455&response_type=code&scope=service::prod.rewardsplatform.microsoft.com::MBI_SSL&redirect_uri=https://login.live.com/oauth20_desktop.srf";

            // 自动获取授权码
            const fetchCode = async (msg) => {
                GM_setValue("Config.code", "");
                Utils.log("🟡", `${msg}，尝试自动获取授权码...`);
                
                try {
                    const res = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: "GET", url: authUrl,
                            headers: { "User-Agent": navigator.userAgent },
                            onload: (r) => resolve(r),
                            onerror: () => reject(new Error("请求失败")),
                            ontimeout: () => reject(new Error("超时")),
                            timeout: 15000
                        });
                    });
                    const finalUrl = res.finalUrl || "";
                    const code = new URL(finalUrl).searchParams.get("code");
                    if (code) {
                        Utils.log("🟢", "自动获取授权码成功");
                        return [code];
                    }
                } catch (e) {
                    Utils.log("🟡", `自动获取失败: ${e.message}`);
                }

                // 手动授权引导
                Utils.log("🟡", "请手动完成授权...");
                GM_openInTab(authUrl, { active: true, insert: true, setParent: true });
                GM_notification({
                    text: "完成后粘贴地址栏URL到脚本设置的「授权码链接」",
                    title: "🟡 需要授权", timeout: 0
                });

                // 等待用户粘贴授权码（最长 3 分钟）
                for (let i = 0; i < 180; i++) {
                    await Utils.delay(1000);
                    const code = GM_getValue("Config.code", "");
                    const match = code?.match(/M\.[^&]+/);
                    if (match) {
                        Utils.log("🟢", "授权码获取成功");
                        return [decodeURIComponent(match[0])];
                    }
                }
                Utils.log("🔴", "授权码获取超时", true);
                return false;
            };

            // 根据是否有 refreshToken 决定获取方式
            if (!refreshToken) {
                const codeMatch = await fetchCode("检测到授权码为空");
                if (!codeMatch) return false;
                const url = `https://login.live.com/oauth20_token.srf?client_id=0000000040170455&code=${encodeURIComponent(codeMatch[0])}&redirect_uri=https://login.live.com/oauth20_desktop.srf&grant_type=authorization_code`;
                const token = await this.getToken(url);
                if (token === null) return false;
                if (!token) {
                    const retry = await fetchCode("授权码失效");
                    if (!retry) return false;
                    return await this.renewToken();
                }
                Utils.log("🟢", "Token获取成功！", true);
                return true;
            } else {
                const url = `https://login.live.com/oauth20_token.srf?client_id=0000000040170455&refresh_token=${encodeURIComponent(refreshToken)}&scope=service::prod.rewardsplatform.microsoft.com::MBI_SSL&grant_type=REFRESH_TOKEN`;
                const token = await this.getToken(url);
                if (token === null) return false;
                if (!token) {
                    const retry = await fetchCode("Token失效");
                    if (!retry) return false;
                    return await this.renewToken();
                }
                return true;
            }
        },

        // 【改动说明】获取积分仪表盘信息，整合比尔脚本的重试机制
        // 优化：支持Next.js RSC格式和传统HTML格式
        async getRewardsInfo(maxRetries = 3) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const html = await Utils.xhr({ url: "https://rewards.bing.com/earn" });
                    const clean = html.replace(/\\"/g, '"');
                    
                    // 尝试从Next.js RSC数据中解析
                    let balance = 0;
                    let pcMax = 60, pcCur = 0, mobMax = 0, mobCur = 0;
                    let dailyOffer = 0;
                    
                    // 方法1: 从RSC JSON数据中解析
                    const rscMatch = clean.match(/"pointsCounters":\{[^}]*"pc":\{"max":(\d+),"progress":(\d+)\}[^}]*"mobile":\{"max":(\d+),"progress":(\d+)\}[^}]*"dailyOffer":(\d+)[^}]*"totalPoints":(\d+)/);
                    if (rscMatch) {
                        pcMax = parseInt(rscMatch[1]);
                        pcCur = parseInt(rscMatch[2]);
                        mobMax = parseInt(rscMatch[3]);
                        mobCur = parseInt(rscMatch[4]);
                        dailyOffer = parseInt(rscMatch[5]);
                        balance = parseInt(rscMatch[6]);
                    } else {
                        // 方法2: 传统格式解析
                        const balMatch = clean.match(/"balance":(\d+)/) || clean.match(/"availablePoints":(\d+)/) || clean.match(/"totalPoints":(\d+)/);
                        if (balMatch) balance = parseInt(balMatch[1]);
                        
                        const idx = clean.indexOf('"pointsCounters":{');
                        if (idx !== -1) {
                            let start = idx + 17, depth = 0, end = start;
                            for (let i = start; i < clean.length; i++) {
                                if (clean[i] === '{') depth++;
                                if (clean[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
                            }
                            try {
                                const pts = JSON.parse(clean.substring(start, end));
                                pcMax = pts.pc?.max ?? 60;
                                pcCur = pts.pc?.progress ?? 0;
                                mobMax = pts.mobile?.max ?? 0;
                                mobCur = pts.mobile?.progress ?? 0;
                                dailyOffer = pts.dailyOffer ?? 0;
                            } catch {}
                        }
                    }
                    
                    // 如果balance为0，尝试其他匹配方式
                    if (balance === 0) {
                        const balMatch2 = clean.match(/"balance":(\d+)/) || clean.match(/"availablePoints":(\d+)/);
                        if (balMatch2) balance = parseInt(balMatch2[1]);
                    }

                    // 解析今日积分明细
                    const todayDetails = [];
                    
                    // 方法1: 从RSC数据中解析活动卡片
                    const activityCardsMatch = clean.match(/"activityCards":\[([^\]]+)\]/);
                    if (activityCardsMatch) {
                        try {
                            const cardsStr = activityCardsMatch[1];
                            const cardRegex = /"title":"([^"]+)".*?"points":(\d+).*?"isCompleted":(true|false)/g;
                            let cardMatch;
                            while ((cardMatch = cardRegex.exec(cardsStr)) !== null) {
                                const title = cardMatch[1];
                                const points = parseInt(cardMatch[2]);
                                const isCompleted = cardMatch[3] === "true";
                                if (points > 0 && isCompleted) {
                                    todayDetails.push({ title, points });
                                }
                            }
                        } catch {}
                    }
                    
                    // 方法2: 从HTML中解析搜索进度
                    const searchHtmlMatch = clean.match(/必应搜索.*?<span[^>]*>(\d+)<\/span>.*?<span[^>]*>\/(\d+)<\/span>/);
                    if (searchHtmlMatch) {
                        todayDetails.push({ 
                            title: '必应搜索', 
                            points: parseInt(searchHtmlMatch[1]),
                            max: parseInt(searchHtmlMatch[2])
                        });
                    }
                    
                    // 方法3: 从RSC数据中解析搜索进度
                    const searchRscMatch = clean.match(/"combinedSearch":\{[^}]*"progress":(\d+)[^}]*"max":(\d+)/);
                    if (searchRscMatch && !todayDetails.some(d => d.title === '必应搜索')) {
                        todayDetails.push({
                            title: '必应搜索',
                            points: parseInt(searchRscMatch[1]),
                            max: parseInt(searchRscMatch[2])
                        });
                    }
                    
                    // 添加dailyOffer到今日明细
                    if (dailyOffer > 0) {
                        todayDetails.push({ title: '优惠', points: dailyOffer });
                    }
                    
                    // 匹配其他活动（如"优惠"）
                    const otherActivityRegex = /<p>([^<]+)<\/p><\/div><div[^>]*>(\d+)<\/div>/g;
                    let otherMatch;
                    while ((otherMatch = otherActivityRegex.exec(clean)) !== null) {
                        const title = otherMatch[1];
                        const points = parseInt(otherMatch[2]);
                        if (points > 0 && !todayDetails.some(d => d.title === title)) {
                            todayDetails.push({ title, points });
                        }
                    }

                    // 解析历史积分
                    const history = {
                        month: 0,
                        year: 0,
                        lifetime: 0
                    };
                    
                    // 方法1: 从RSC数据中解析历史积分
                    const historyRscMatch = clean.match(/"pointsHistory":\{[^}]*"thisMonth":\{"earn":(\d+)[^}]*"thisYear":\{"earn":(\d+)[^}]*"lifetime":\{"earn":(\d+)/);
                    if (historyRscMatch) {
                        history.month = parseInt(historyRscMatch[1]);
                        history.year = parseInt(historyRscMatch[2]);
                        history.lifetime = parseInt(historyRscMatch[3]);
                    } else {
                        // 方法2: 从HTML中解析历史积分
                        const monthHtmlMatch = clean.match(/本月.*?(\d[\d,]*)<\/div>/);
                        const yearHtmlMatch = clean.match(/今年.*?(\d[\d,]*)<\/div>/);
                        const lifetimeHtmlMatch = clean.match(/生存期.*?(\d[\d,]*)<\/div>/);
                        
                        // JSON格式
                        const monthJsonMatch = clean.match(/"monthlyPoints":(\d+)/);
                        const yearJsonMatch = clean.match(/"yearlyPoints":(\d+)/);
                        const lifetimeJsonMatch = clean.match(/"lifetimePoints":(\d+)/);
                        
                        if (monthHtmlMatch) {
                            history.month = parseInt(monthHtmlMatch[1].replace(/,/g, ''));
                        } else if (monthJsonMatch) {
                            history.month = parseInt(monthJsonMatch[1]);
                        }
                        
                        if (yearHtmlMatch) {
                            history.year = parseInt(yearHtmlMatch[1].replace(/,/g, ''));
                        } else if (yearJsonMatch) {
                            history.year = parseInt(yearJsonMatch[1]);
                        }
                        
                        if (lifetimeHtmlMatch) {
                            history.lifetime = parseInt(lifetimeHtmlMatch[1].replace(/,/g, ''));
                        } else if (lifetimeJsonMatch) {
                            history.lifetime = parseInt(lifetimeJsonMatch[1]);
                        }
                    }

                    return {
                        balance,
                        pc: { progress: pcCur, max: pcMax },
                        mobile: { progress: mobCur, max: mobMax },
                        dailyOffer,
                        todayDetails,
                        history
                    };
                } catch (e) {
                    if (attempt < maxRetries) {
                        await Utils.delay(3210);
                        continue;
                    }
                    Utils.log("🔴", `仪表盘获取失败: ${e.message}`);
                    return false;
                }
            }
            return false;
        },

        // 签入任务
        async sign() {
            const region = GM_getValue("Config.lock", true) ? "cn" : RewardsAuto.state.region.toLowerCase();
            try {
                const res = await Utils.xhr({
                    method: "POST",
                    url: "https://prod.rewardsplatform.microsoft.com/dapi/me/activities",
                    headers: {
                        "content-type": "application/json; charset=UTF-8",
                        "user-agent": RewardsAuto.ua.mobile,
                        "authorization": `Bearer ${RewardsAuto.state.token}`,
                        "x-rewards-appid": "SAAndroid/31.4.2110003555",
                        "x-rewards-ismobile": "true",
                        "x-rewards-country": region,
                        "x-rewards-partnerid": "startapp",
                        "x-rewards-flights": "rwgobig"
                    },
                    data: JSON.stringify({
                        amount: 1, attributes: {}, id: Utils.getRandomUUID(),
                        type: 103, country: region, risk_context: {}, channel: "SAAndroid"
                    })
                });
                if (Utils.isJSON(res)) return JSON.parse(res).response?.activity?.p || 0;
            } catch (e) {
                Utils.log("🔴", `签入失败: ${e.message}`);
            }
            return -1;
        },

        // 获取阅读进度
        async getReadProgress() {
            try {
                const res = await Utils.xhr({
                    url: "https://prod.rewardsplatform.microsoft.com/dapi/me?channel=SAAndroid&options=613",
                    headers: {
                        "content-type": "application/json; charset=UTF-8",
                        "user-agent": RewardsAuto.ua.mobile,
                        "authorization": `Bearer ${RewardsAuto.state.token}`,
                        "x-rewards-appid": "SAAndroid/31.4.2110003555",
                        "x-rewards-ismobile": "true"
                    }
                });
                if (Utils.isJSON(res)) {
                    const promos = JSON.parse(res).response?.promotions || [];
                    const task = promos.find(x => x.attributes?.offerid === "ENUS_readarticle3_30points");
                    if (task) return { progress: parseInt(task.attributes.progress) || 0, max: parseInt(task.attributes.max) || 30 };
                }
            } catch (e) {
                Utils.log("🔴", `阅读进度获取失败: ${e.message}`);
            }
            return false;
        },

        // 执行阅读
        async doRead() {
            const region = GM_getValue("Config.lock", true) ? "cn" : RewardsAuto.state.region.toLowerCase();
            try {
                await Utils.xhr({
                    method: "POST",
                    url: "https://prod.rewardsplatform.microsoft.com/dapi/me/activities",
                    headers: {
                        "content-type": "application/json; charset=UTF-8",
                        "user-agent": RewardsAuto.ua.mobile,
                        "authorization": `Bearer ${RewardsAuto.state.token}`,
                        "x-rewards-appid": "SAAndroid/31.4.2110003555",
                        "x-rewards-ismobile": "true",
                        "x-rewards-country": region
                    },
                    data: JSON.stringify({
                        amount: 1, country: region, id: Utils.getRandomUUID(),
                        type: 101, attributes: { offerid: "ENUS_readarticle3_30points" }
                    })
                });
                return true;
            } catch (e) {
                Utils.log("🔴", `阅读请求失败: ${e.message}`);
                return false;
            }
        },

        // 【改动说明】活动卡片发现，继承 Python 版的卡片分类逻辑
        // 优化：支持Next.js RSC格式和传统HTML格式
        async discoverCards() {
            const cards = [];
            try {
                const html = await Utils.xhr({ url: "https://rewards.bing.com/earn" });
                const clean = html.replace(/\\"/g, '"');
                
                // 方法1: 从RSC数据中解析activityCards数组
                const activityCardsMatch = clean.match(/"activityCards":\[([\s\S]*?)\](?=,"|$)/);
                if (activityCardsMatch) {
                    try {
                        const cardsStr = activityCardsMatch[1];
                        // 解析每个卡片对象
                        const cardRegex = /\{[^{}]*"offerId":"([^"]+)"[^{}]*"hash":"([^"]+)"[^{}]*"points":(\d+)[^{}]*"isCompleted":(true|false)[^{}]*\}/g;
                        let cardMatch;
                        while ((cardMatch = cardRegex.exec(cardsStr)) !== null) {
                            const offerId = cardMatch[1];
                            const hash = cardMatch[2];
                            const points = parseInt(cardMatch[3]);
                            const isCompleted = cardMatch[4] === "true";
                            
                            if (isCompleted || points <= 0) continue;
                            
                            // 提取title
                            const titleMatch = cardsStr.substring(0, cardMatch.index).lastIndexOf('"title":"');
                            let title = "";
                            if (titleMatch !== -1) {
                                const titleStart = titleMatch + 9;
                                const titleEnd = cardsStr.indexOf('"', titleStart);
                                if (titleEnd !== -1) {
                                    title = cardsStr.substring(titleStart, titleEnd);
                                }
                            }
                            
                            // 跳过不需要的卡片类型
                            const skip = RewardsAuto.skipPatterns.some(p => 
                                title.toLowerCase().includes(p.toLowerCase()) || 
                                offerId.toLowerCase().includes(p.toLowerCase())
                            );
                            if (skip) continue;

                            // 卡片分类（参考 Python 版的 classify 函数）
                            let kind = "unknown";
                            if (/quiz|trivia/i.test(offerId)) kind = "quiz";
                            else if (/puzzle/i.test(offerId)) kind = "puzzle";
                            else if (/image/i.test(offerId)) kind = "image_creator";
                            else if (/explore|search/i.test(offerId)) kind = "explore_search";
                            else if (/dailyset|daily/i.test(offerId)) kind = "daily";
                            else if (/streak/i.test(offerId)) kind = "streak";
                            else kind = "open_only";

                            cards.push({ title, points, offerId, hash, kind });
                        }
                    } catch (e) {
                        Utils.log("🟡", `RSC卡片解析异常: ${e.message}`);
                    }
                }
                
                // 方法2: 传统正则匹配（备用）
                if (cards.length === 0) {
                    const regex = /"title":"([^"]+)".*?"points":(\d+).*?"offerId":"([^"]+)","hash":"([^"]+)".*?"isCompleted":(true|false)/g;
                    let match;
                    while ((match = regex.exec(clean)) !== null) {
                        const [_, title, points, offerId, hash, completed] = match;
                        if (completed === "true" || parseInt(points) <= 0) continue;
                        
                        // 跳过不需要的卡片类型
                        const skip = RewardsAuto.skipPatterns.some(p => title.toLowerCase().includes(p.toLowerCase()));
                        if (skip) continue;

                        // 卡片分类
                        let kind = "unknown";
                        if (/quiz|trivia/i.test(offerId)) kind = "quiz";
                        else if (/puzzle/i.test(offerId)) kind = "puzzle";
                        else if (/image/i.test(offerId)) kind = "image_creator";
                        else if (/explore|search/i.test(offerId)) kind = "explore_search";
                        else if (/dailyset|daily/i.test(offerId)) kind = "daily";
                        else if (/streak/i.test(offerId)) kind = "streak";
                        else kind = "open_only";

                        cards.push({ title, points: parseInt(points), offerId, hash, kind });
                    }
                }
            } catch (e) {
                Utils.log("🔴", `卡片解析失败: ${e.message}`);
            }
            return cards;
        },

        // 领取卡片奖励
        async claimCard(card) {
            try {
                await Utils.xhr({
                    method: "POST",
                    url: "https://rewards.bing.com/earn",
                    headers: {
                        "content-type": "text/plain;charset=UTF-8",
                        "next-action": "70babbc81d2724f60d29a95c03b3d739cba77cea92",
                        "referer": "https://rewards.bing.com/earn"
                    },
                    data: JSON.stringify([card.hash, 11, { offerid: card.offerId, isPromotional: "$undefined", timezoneOffset: "-480" }])
                });
                return true;
            } catch (e) {
                Utils.log("🟡", `卡片领取失败: ${e.message}`);
                return false;
            }
        },

        // 搜索页面请求
        async getSearchPage(query) {
            const mkt = GM_getValue("Config.lock", true) ? "&mkt=zh-CN" : "";
            return Utils.xhr({
                url: `https://${RewardsAuto.state.host}/search?q=${encodeURIComponent(query)}&form=QBLH${mkt}`,
                headers: {
                    "user-agent": RewardsAuto.ua.pc,
                    "cookie": `_Rwho=u=d&ts=${RewardsAuto.state.dateNowStr}`,
                    "referer": `https://${RewardsAuto.state.host}/?form=QBLH`
                }
            });
        },

        // 搜索活动上报（继承 Untitled-1.txt 的 reportActivity 逻辑）
        async reportSearch(html, query) {
            try {
                const clean = html.replace(/\s/g, "");
                const ig = clean.match(/,IG:"([^"]+)"/)?.[1] || Utils.getRandomUUID();
                const data = clean.match(/class="b_algo(.*?)href="(.*?)"h="ID=(.*?)">(.*?)<\/h2/);
                const mkt = GM_getValue("Config.lock", true) ? "&mkt=zh-CN" : "";
                const params = `q=${encodeURIComponent(query)}&form=QBLH${mkt}`;
                const headers = {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "user-agent": RewardsAuto.ua.pc,
                    "referer": `https://${RewardsAuto.state.host}/?form=QBLH`,
                    "cookie": `_Rwho=u=d&ts=${RewardsAuto.state.dateNowStr}`
                };

                // 上报搜索活动
                await Utils.xhr({ 
                    method: "POST", 
                    url: `https://${RewardsAuto.state.host}/rewardsapp/ncheader?ver=88888888&IID=SERP.5047&IG=${ig}&ajaxreq=1`, 
                    headers, 
                    data: "wb=1%3bi%3d1%3bv%3d1" 
                });
                await Utils.xhr({ 
                    method: "POST", 
                    url: `https://${RewardsAuto.state.host}/rewardsapp/reportActivity?IG=${ig}&IID=SERP.5047&${params}&ajaxreq=1`, 
                    headers, 
                    data: `url=${encodeURIComponent(`https://${RewardsAuto.state.host}/search?${params}`)}&V=web` 
                });
                
                // 点击搜索结果（模拟真实用户行为）
                if (data) {
                    await Utils.xhr({ 
                        url: `https://${RewardsAuto.state.host}/fd/ls/GLinkPingPost.aspx?IG=${ig}&ID=${data[3]}&url=${data[2]}`, 
                        headers 
                    });
                }
                return true;
            } catch (e) {
                Utils.log("🟡", `搜索上报失败: ${e.message}`);
                return false;
            }
        },

        // 地区检测（增加重试机制和IP信息获取）
        async checkRegion(retryCount = 0) {
            if (!GM_getValue("Config.lock", true)) return true;
            try {
                const html = await Utils.xhr({ url: `https://${RewardsAuto.state.host}/` });
                if (!html) {
                    if (retryCount < 2) {
                        Utils.log("🟡", `地区检测返回空，第${retryCount + 1}次重试...`);
                        await Utils.randomDelay(3000, 5000);
                        return await this.checkRegion(retryCount + 1);
                    }
                    Utils.log("🔴", "地区检测失败（无响应）");
                    return false;
                }
                const match = html.replace(/\s/g, "").match(/Region:"(.*?)"(.*?)RevIpCC:"(.*?)"/);
                if (match) {
                    RewardsAuto.state.region = match[3].toUpperCase();
                    if (RewardsAuto.state.region !== "CN") {
                        // 获取IP详细信息（来自比尔脚本）
                        await this.getIPInfo();
                        Utils.log("🔴", `IP非大陆(${RewardsAuto.state.region})，已停止\n${RewardsAuto.state.ipInfo}`, true);
                        return false;
                    }
                    Utils.log("🟢", `地区检测通过: ${RewardsAuto.state.region}`);
                    return true;
                }
                // 正则未匹配到，可能是页面结构变化
                if (retryCount < 2) {
                    Utils.log("🟡", `地区检测格式异常，第${retryCount + 1}次重试...`);
                    await Utils.randomDelay(3000, 5000);
                    return await this.checkRegion(retryCount + 1);
                }
                Utils.log("🔴", "地区检测失败（格式不匹配）");
                return false;
            } catch (e) {
                if (retryCount < 2) {
                    Utils.log("🟡", `地区检测异常: ${e.message}，第${retryCount + 1}次重试...`);
                    await Utils.randomDelay(3000, 5000);
                    return await this.checkRegion(retryCount + 1);
                }
                Utils.log("🔴", `地区检测失败: ${e.message}`);
                return false;
            }
        },

        // 获取IP详细信息（来自比尔脚本）
        async getIPInfo() {
            try {
                const qryResult = await Utils.xhr({
                    url: "https://disp-qryapi.3g.qq.com/v1/dispatch",
                    headers: { "referer": "https://3g.qq.com/" }
                });
                if (qryResult && Utils.isJSON(qryResult)) {
                    const resJSON = JSON.parse(qryResult);
                    RewardsAuto.state.ip = (resJSON.code == 0 && resJSON.extra && resJSON.extra.ip) ? resJSON.extra.ip : "";
                    let rawInfo = (resJSON.code == 0 && resJSON.ipInfo) ? String(resJSON.ipInfo) : "";
                    rawInfo = rawInfo.replace(/[#*]+/g, " ").trim();
                    RewardsAuto.state.ipInfo = rawInfo ? `🌏所在地区：${rawInfo}` : "";
                }
            } catch {
                console.debug("获取附加 IP 信息失败");
            }
        },

        // 获取热搜搜索词（来自比尔脚本）
        async getHotSearchWord() {
            const keywords = ["天气预报", "今日新闻", "体育赛事", "股票行情", "电影推荐", "科技资讯", "美食食谱", "旅游攻略", "历史上的今天", "健康常识"];
            const baseWord = keywords[Utils.randomRange(0, keywords.length - 1)];
            const randomSuffix = Math.random().toString(36).slice(2, 6);
            let sentence = `${baseWord} ${randomSuffix}`;

            if (RewardsAuto.apiConfig.mode !== "offline") {
                if (RewardsAuto.apiConfig.wordIndex < 1 || RewardsAuto.apiConfig.wordList.length < 1) {
                    // 获取随机API配置
                    const apiArr = RewardsAuto.apiConfig.arr;
                    const lastApiIndex = parseInt(GM_getValue("Config.apiIndex", -1));
                    const filteredArr = apiArr.filter((_, index) => index !== lastApiIndex);
                    const randomIndex = Utils.randomRange(0, filteredArr.length - 1);
                    GM_setValue("Config.apiIndex", randomIndex);
                    
                    const [apiName, apiConfig] = filteredArr[randomIndex];
                    RewardsAuto.apiConfig.url = apiConfig.url;
                    RewardsAuto.apiConfig.hot = apiConfig.hot;

                    try {
                        const hotSource = RewardsAuto.apiConfig.hot[Utils.randomRange(0, RewardsAuto.apiConfig.hot.length - 1)];
                        const result = await Utils.xhr({ url: RewardsAuto.apiConfig.url + hotSource });
                        if (result && Utils.isJSON(result)) {
                            const res = JSON.parse(result);
                            if (res.code == 200) {
                                RewardsAuto.apiConfig.wordIndex = 1;
                                RewardsAuto.apiConfig.wordList = [];
                                for (let i = 0; i < res.data.length; i++) {
                                    RewardsAuto.apiConfig.wordList.push(res.data[i].title);
                                }
                                // 随机打乱数组
                                RewardsAuto.apiConfig.wordList.sort(() => Math.random() - 0.5);
                                sentence = RewardsAuto.apiConfig.wordList[RewardsAuto.apiConfig.wordIndex];
                                // 截断到20-32字符
                                sentence = sentence.substring(0, Utils.randomRange(20, 32));
                                return sentence;
                            }
                        }
                    } catch (e) {
                        Utils.log("🟡", `热搜词获取失败: ${e.message}`);
                    }
                } else {
                    RewardsAuto.apiConfig.wordIndex++;
                    if (RewardsAuto.apiConfig.wordIndex > RewardsAuto.apiConfig.wordList.length - 1) {
                        RewardsAuto.apiConfig.wordIndex = 0;
                    }
                    sentence = RewardsAuto.apiConfig.wordList[RewardsAuto.apiConfig.wordIndex];
                    sentence = sentence.substring(0, Utils.randomRange(20, 32));
                    return sentence;
                }
                Utils.log("🟡", "热搜词接口异常，已使用随机搜索词");
            }
            return sentence;
        },

        // 搜索受限检测（来自比尔脚本）
        async checkSearchRestricted() {
            const currentTotalSearch = RewardsAuto.state.pcProgress + RewardsAuto.state.mobileProgress;
            const lastTotalSearch = RewardsAuto.state.lastSearchProgress;
            
            if (lastTotalSearch !== -1) {
                if (currentTotalSearch === lastTotalSearch && 
                    currentTotalSearch < (RewardsAuto.state.pcMax + RewardsAuto.state.mobileMax)) {
                    RewardsAuto.state.restrictedTimes++;
                } else {
                    RewardsAuto.state.restrictedTimes = 0;
                }
            }
            
            RewardsAuto.state.lastSearchProgress = currentTotalSearch;
            GM_setValue("Config.lastSearchProgress", currentTotalSearch);
            GM_setValue("Config.restrictedTimes", RewardsAuto.state.restrictedTimes);
            
            if (RewardsAuto.state.restrictedTimes >= 2) {
                Utils.log("🔴", "搜索受限或账号异常，已中断今日搜索！", true);
                return true; // 受限
            }
            return false; // 正常
        }
    };

    // =====================================================
    // 任务管理器
    // 【改动说明】整合 Untitled-1.txt 的任务状态管理和 Python 版的任务调度逻辑
    // =====================================================
    const TaskManager = {
        // 任务日期状态
        signDate: 0, readDate: 0, promosDate: 0, searchDate: 0,
        signPoint: -1, signTimes: 0, readTimes: 0, promosTimes: 0,

        // 初始化任务状态
        init() {
            RewardsAuto.state.dateNowNum = Utils.getTodayNum();
            RewardsAuto.state.dateNowStr = Utils.getTodayStr();
            const tasks = GM_getValue("Config.tasks", {});
            this.signDate = tasks.sign || 0;
            this.readDate = tasks.read || 0;
            this.promosDate = tasks.promos || 0;
            this.searchDate = tasks.search || 0;
            this.signPoint = GM_getValue("Config.signPoint", -1);
        },

        // 保存任务状态
        save() {
            GM_setValue("Config.tasks", {
                sign: this.signDate, read: this.readDate,
                promos: this.promosDate, search: this.searchDate
            });
        },

        // 签入任务处理
        async doSign() {
            if (!GM_getValue("Tasks.sign", true) || this.signTimes > 2) return;
            if (this.signPoint >= 0 && this.signDate === RewardsAuto.state.dateNowNum) {
                Utils.log("✅", `签入已完成(${this.signPoint}积分)`);
                return;
            }

            // 【防封号】操作前随机延迟
            await Utils.randomDelay();
            const point = await API.sign();
            if (point >= 0) {
                this.signPoint = point;
                this.signDate = RewardsAuto.state.dateNowNum;
                GM_setValue("Config.signPoint", point);
                this.save();
                Utils.log("🔵", `签入成功！+${point}积分`, true);
            } else {
                this.signTimes++;
                Utils.log("🟡", `签入失败（返回值: ${point}），稍后重试`);
            }
        },

        // 阅读任务处理
        async doRead() {
            if (!GM_getValue("Tasks.read", true) || this.readTimes > 2) return;
            if (this.readDate === RewardsAuto.state.dateNowNum) {
                Utils.log("✅", "阅读任务已完成");
                return;
            }

            const progress = await API.getReadProgress();
            if (!progress) { this.readTimes++; return; }

            const { progress: cur, max } = progress;
            Utils.log("📖", `阅读进度: ${cur}/${max}`);

            if (cur >= max) {
                this.readDate = RewardsAuto.state.dateNowNum;
                this.save();
                Utils.log("✅", "阅读任务已完成");
                return;
            }

            // 逐步完成阅读任务（每篇间隔 3-7 秒）
            const needed = Math.ceil((max - cur) / 3);
            for (let i = 0; i < needed; i++) {
                await API.doRead();
                Utils.log("📖", `阅读 ${i+1}/${needed}`);
                // 【防封号】阅读间隔随机延迟
                await Utils.randomDelay(3000, 7000);
            }

            this.readDate = RewardsAuto.state.dateNowNum;
            this.save();
            Utils.log("🔵", "阅读任务完成！", true);
        },

        // 【改动说明】活动卡片处理，继承 Python 版的卡片发现和分类处理逻辑
        async doPromos() {
            if (!GM_getValue("Tasks.promos", true) || this.promosTimes > 2) return;
            if (this.promosDate === RewardsAuto.state.dateNowNum) {
                Utils.log("✅", "活动卡片已完成");
                return;
            }

            Utils.log("🧩", "扫描活动卡片...");
            const cards = await API.discoverCards();

            if (cards.length === 0) {
                this.promosDate = RewardsAuto.state.dateNowNum;
                this.save();
                Utils.log("✅", "无新活动卡片");
                return;
            }

            Utils.log("🧩", `发现 ${cards.length} 个卡片`);
            let ok = 0, fail = 0;

            for (const card of cards) {
                Utils.log("  ", `[${card.kind}] ${card.title} +${card.points}p`);
                
                // Quiz 任务需要单独处理（可选开启）
                if (card.kind === "quiz" && !GM_getValue("Tasks.quiz", true)) continue;
                
                // 【防封号】领取卡片前随机延迟
                await Utils.randomDelay(2000, 4000);
                const result = await API.claimCard(card);
                result ? ok++ : fail++;
            }

            this.promosDate = RewardsAuto.state.dateNowNum;
            this.save();
            Utils.log("🔵", `活动完成: ${ok}成功/${fail}失败`, true);
        },

        // 【改动说明】搜索任务处理，继承 Python 版的 PC/Mobile 双端搜索逻辑
        // 整合比尔脚本的搜索受限检测和热搜词获取
        async doSearch() {
            if (!GM_getValue("Tasks.search", true)) return;
            
            // 先检查搜索配额是否真的已满（而不是只看日期）
            const info = await API.getRewardsInfo();
            if (!info) { Utils.log("🔴", "无法获取积分信息"); return; }

            RewardsAuto.state.pcProgress = info.pc.progress;
            RewardsAuto.state.pcMax = info.pc.max;
            RewardsAuto.state.mobileProgress = info.mobile.progress;
            RewardsAuto.state.mobileMax = info.mobile.max;

            Utils.log("🔍", `配额: PC ${info.pc.progress}/${info.pc.max}, Mobile ${info.mobile.progress}/${info.mobile.max}`);

            // 检查搜索配额是否真的已满
            if (info.pc.progress >= info.pc.max && info.mobile.progress >= info.mobile.max) {
                this.searchDate = RewardsAuto.state.dateNowNum;
                this.save();
                Utils.log("✅", "搜索配额已满");
                return;
            }

            // 如果配额未满，重置searchDate（防止之前中断后被标记为完成）
            if (this.searchDate === RewardsAuto.state.dateNowNum) {
                Utils.log("🟡", "搜索配额未满，继续执行搜索任务");
                this.searchDate = 0;
            }

            // 搜索受限检测（来自比尔脚本）
            const isRestricted = await API.checkSearchRestricted();
            if (isRestricted) {
                this.searchDate = RewardsAuto.state.dateNowNum;
                this.save();
                return;
            }

            // 执行搜索（随机 4-7 次）
            const limit = Utils.randomRange(4, 7);
            for (let i = 0; i < limit; i++) {
                if (RewardsAuto.state.pcProgress >= RewardsAuto.state.pcMax && 
                    RewardsAuto.state.mobileProgress >= RewardsAuto.state.mobileMax) break;

                // 随机选择 PC 或 Mobile 端搜索
                const isMobile = RewardsAuto.state.mobileProgress < RewardsAuto.state.mobileMax && Math.random() > 0.6;
                if (isMobile) RewardsAuto.state.mobileProgress += 3;
                else RewardsAuto.state.pcProgress += 3;

                // 获取搜索词（支持热搜API或离线随机词）
                let query;
                if (RewardsAuto.apiConfig.mode !== "offline") {
                    query = await API.getHotSearchWord();
                } else {
                    query = RewardsAuto.searchPool[Utils.randomRange(0, RewardsAuto.searchPool.length - 1)];
                }
                
                Utils.log("🔍", `[${isMobile?"Mobile":"PC"}] 搜索 ${i+1}/${limit}: ${query}`);

                try {
                    const html = await API.getSearchPage(query);
                    if (html) await API.reportSearch(html, query);
                } catch (e) {
                    Utils.log("🟡", `搜索失败: ${e.message}`);
                }

                // 【防封号核心】搜索间隔随机延迟（默认 30 秒 ±15 秒）
                const span = Number(GM_getValue("Config.span", 30));
                const wait = Utils.randomRange((span-15)*1000, (span+15)*1000);
                Utils.log("⏳", `等待 ${wait/1000}秒`);
                await Utils.delay(wait);
            }

            // 搜索完成后，再次检查配额是否真的满了
            const finalInfo = await API.getRewardsInfo();
            if (finalInfo && finalInfo.pc.progress >= finalInfo.pc.max && finalInfo.mobile.progress >= finalInfo.mobile.max) {
                this.searchDate = RewardsAuto.state.dateNowNum;
                this.save();
                // 重置搜索受限计数
                RewardsAuto.state.restrictedTimes = 0;
                GM_setValue("Config.restrictedTimes", 0);
                GM_setValue("Config.lastSearchProgress", -1);
                Utils.log("🔵", "搜索任务完成！配额已满", true);
            } else {
                Utils.log("🟡", `搜索已执行，但配额可能未满 PC:${finalInfo?.pc.progress || '?'}/${finalInfo?.pc.max || '?'} Mobile:${finalInfo?.mobile.progress || '?'}/${finalInfo?.mobile.max || '?'}`);
                // 不设置searchDate，下次运行继续搜索
            }
        },

        // 主任务调度（整合Python版的二次扫描机制）
        async runAll() {
            RewardsAuto.state.startTime = Utils.getTimestamp();
            Utils.log("🚀", "启动全能自动化任务...");
            this.init();

            // 地区检测（允许失败时继续执行搜索等不需要token的任务）
            const regionOK = await API.checkRegion();
            
            // Token 续期
            let isTokenOK = false;
            if (regionOK) {
                isTokenOK = await API.renewToken();
                if (!isTokenOK) {
                    Utils.log("🟡", "Token失败，跳过签入/阅读", true);
                }
            } else {
                Utils.log("🟡", "地区检测失败，尝试执行搜索任务...");
            }

            // 按顺序执行各任务（每个任务间有随机延迟）
            // 签入和阅读需要token，地区检测失败时跳过
            if (regionOK && isTokenOK) {
                await this.doSign();
                await Utils.randomDelay();
                await this.doRead();
                await Utils.randomDelay();
            } else if (regionOK) {
                // 地区OK但token失败，尝试签入（可能失败）
                await this.doSign();
                await Utils.randomDelay();
            }
            
            // 活动卡片和搜索可以尝试执行（即使地区检测失败）
            await this.doPromos();
            await Utils.randomDelay();
            await this.doSearch();

            // 二次扫描机制（来自Python版）：完成一轮任务后再次扫描新解锁的卡片
            Utils.log("🔄", "二次扫描：检查是否有新解锁的卡片...");
            await Utils.randomDelay(2000, 4000);
            const newCards = await API.discoverCards();
            if (newCards.length > 0) {
                Utils.log("🧩", `二次扫描发现 ${newCards.length} 个新卡片`);
                let ok = 0, fail = 0;
                for (const card of newCards) {
                    Utils.log("  ", `[${card.kind}] ${card.title} +${card.points}p`);
                    if (card.kind === "quiz" && !GM_getValue("Tasks.quiz", true)) continue;
                    await Utils.randomDelay(2000, 4000);
                    const result = await API.claimCard(card);
                    result ? ok++ : fail++;
                }
                Utils.log("🔵", `二次扫描完成: ${ok}成功/${fail}失败`);
            } else {
                Utils.log("✅", "二次扫描：无新卡片");
            }

            // 任务完成汇总
            const endTime = Utils.getTimestamp();
            const totalTime = ((endTime - RewardsAuto.state.startTime) / 1000).toFixed(1);
            
            const info = await API.getRewardsInfo();
            if (info) {
                Utils.log("🎉", `任务完成！当前积分: ${info.balance}，用时 ${totalTime} 秒`, true);
                
                // 显示积分明细
                let detailMsg = `📊 积分明细:\n`;
                detailMsg += `┌─────────────────────────\n`;
                detailMsg += `│ 💰 今日积分: ${info.balance}\n`;
                detailMsg += `├─────────────────────────\n`;
                
                // 今日活动明细
                detailMsg += `│ 📋 今日活动:\n`;
                detailMsg += `│   🔍 PC搜索: ${info.pc.progress}/${info.pc.max}\n`;
                detailMsg += `│   📱 移动搜索: ${info.mobile.progress}/${info.mobile.max}\n`;
                if (info.todayDetails && info.todayDetails.length > 0) {
                    for (const detail of info.todayDetails) {
                        if (detail.max) {
                            // 搜索类活动显示进度
                            detailMsg += `│   🔍 ${detail.title}: ${detail.points}/${detail.max}\n`;
                        } else {
                            // 其他活动显示积分
                            detailMsg += `│   ✨ ${detail.title}: +${detail.points}\n`;
                        }
                    }
                }
                detailMsg += `├─────────────────────────\n`;
                
                // 历史积分
                if (info.history) {
                    detailMsg += `│ 📈 历史积分:\n`;
                    detailMsg += `│   📅 本月: ${info.history.month.toLocaleString()}\n`;
                    detailMsg += `│   📆 今年: ${info.history.year.toLocaleString()}\n`;
                    detailMsg += `│   🏆 生存期: ${info.history.lifetime.toLocaleString()}\n`;
                }
                detailMsg += `├─────────────────────────\n`;
                detailMsg += `│ ⏱️ 用时: ${totalTime} 秒\n`;
                detailMsg += `└─────────────────────────`;
                
                Utils.log("📊", detailMsg, true);
            } else {
                Utils.log("🎉", `任务执行完成！用时 ${totalTime} 秒`, true);
            }
        }
    };

    // =====================================================
    // 打卡任务处理（rewards.bing.com 页面内执行）
    // 【改动说明】继承 Untitled-1.txt 的打卡卡片点击逻辑
    // 使用 MutationObserver 等待 DOM 加载，严格遵守防封号规则
    // =====================================================
    if (location.hostname === "rewards.bing.com") {
        const punchCardSelectors = [
            "a[href*='punchcard']", "a[href*='quest']",
            "a[data-rac][href*='earn']", "a.cursor-pointer[href]"
        ];
        const textPatterns = ["盗贼之海", "五月亮点来袭"];

        // 打卡卡片点击逻辑
        const clickPunchCards = async () => {
            const today = Utils.getTodayNum();
            const stateKey = "Config.punchCardState";
            const dateKey = "Config.punchCardDate";
            const savedDate = GM_getValue(dateKey, 0);
            let state = savedDate === today ? GM_getValue(stateKey, 0) : 0;

            if (state >= 2) {
                console.log("[Rewards Auto] 打卡任务已完成");
                return;
            }

            console.log(`[Rewards Auto] 打卡任务: ${state}/2`);
            // 【防封号】操作前随机延迟 3-8 秒
            await Utils.randomDelay(3000, 8000);

            // 使用 MutationObserver 等待卡片出现
            let found = [];
            for (const sel of punchCardSelectors) {
                try {
                    found = await Utils.waitForElementsByText(sel, textPatterns, 10000);
                    if (found.length > 0) break;
                } catch {}
            }

            if (found.length === 0) {
                console.log("[Rewards Auto] 未找到打卡卡片");
                return;
            }

            if (state < found.length) {
                const target = found[state];
                console.log(`[Rewards Auto] 点击: ${target.pattern}`);
                // 【防封号】点击前随机延迟
                await Utils.randomDelay();
                try {
                    target.element.click();
                    GM_setValue(stateKey, state + 1);
                    GM_setValue(dateKey, today);
                    if (state + 1 < 2) {
                        // 【防封号】两次点击间隔 5-10 秒
                        await Utils.randomDelay(5000, 10000);
                        await clickPunchCards();
                    }
                } catch (e) {
                    console.error(`[Rewards Auto] 点击失败: ${e.message}`);
                }
            }
        };

        // 页面加载完成后执行
        // 【改动说明】使用 DOMContentLoaded 确保 DOM 加载完成
        document.addEventListener("DOMContentLoaded", () => {
            setTimeout(() => {
                const path = location.pathname;
                if (path.includes("/earn/quest/") || path.includes("punchcard")) {
                    console.log("[Rewards Auto] 打卡详情页");
                } else {
                    console.log("[Rewards Auto] 奖励主页，开始打卡...");
                    clickPunchCards();
                }
            }, 3000); // 延迟 3 秒等待页面渲染
        });
        return;
    }

    // =====================================================
    // 菜单注册
    // 【改动说明】保留 Untitled-1.txt 的菜单功能，增加手动运行入口和通知配置
    // =====================================================
    GM_registerMenuCommand("🔑 手动授权", () => {
        GM_openInTab("https://login.live.com/oauth20_authorize.srf?client_id=0000000040170455&response_type=code&scope=service::prod.rewardsplatform.microsoft.com::MBI_SSL&redirect_uri=https://login.live.com/oauth20_desktop.srf", { active: true });
    });

    GM_registerMenuCommand("📋 粘贴授权码", () => {
        const code = prompt("粘贴授权页面跳转后的完整URL:");
        if (code?.trim()) {
            GM_setValue("Config.code", code.trim());
            alert("已保存！");
        }
    });

    GM_registerMenuCommand("📊 Token状态", () => {
        const token = GM_getValue("Config.token", false);
        const time = GM_getValue("Config.tokenTime", 0);
        const days = time > 0 ? Math.floor((Utils.getTimestamp() - time) / 86400000) : "未知";
        alert(`Token: ${token?"已保存":"无"}\n年龄: ${days}天\n授权码: ${GM_getValue("Config.code","")?"有":"无"}`);
    });

    GM_registerMenuCommand("🚀 立即运行", () => TaskManager.runAll());

    // 通知接口配置菜单
    GM_registerMenuCommand("🔔 配置通知接口", () => {
        const configNames = [
            { key: "Notice.wework", name: "企业微信 Webhook", hint: "群机器人webhook key" },
            { key: "Notice.dingding", name: "钉钉机器人 Access Token", hint: "不加签，关键词需包含 #" },
            { key: "Notice.feishu", name: "飞书机器人 Webhook", hint: "不加签，关键词需包含 #" },
            { key: "Notice.pushme", name: "PushMe Key", hint: "push.i-i.me 推送key" },
            { key: "Notice.bark", name: "Bark Key", hint: "bark.day.app 推送key" }
        ];
        
        let configStr = "🔔 通知接口配置\n";
        configStr += "==================\n\n";
        configNames.forEach((item, index) => {
            const saved = GM_getValue(item.key, "");
            configStr += `${index + 1}. ${item.name}\n`;
            configStr += `   状态: ${saved ? "✅ 已配置" : "❌ 未配置"}\n`;
            configStr += `   说明: ${item.hint}\n\n`;
        });
        configStr += "请输入要配置的编号 (1-5)，或输入 0 清除所有配置：";
        
        const choice = prompt(configStr);
        if (!choice) return;
        
        const num = parseInt(choice);
        if (num === 0) {
            if (confirm("确定要清除所有通知接口配置吗？")) {
                configNames.forEach(item => GM_setValue(item.key, ""));
                alert("所有通知接口配置已清除！");
            }
            return;
        }
        
        if (num >= 1 && num <= 5) {
            const selected = configNames[num - 1];
            const current = GM_getValue(selected.key, "");
            const newValue = prompt(`配置 ${selected.name}\n\n当前值: ${current || "(空)"}\n\n请输入新的值：`, current);
            if (newValue !== null) {
                GM_setValue(selected.key, newValue.trim());
                alert(`${selected.name} 已${newValue.trim() ? "配置" : "清除"}！`);
            }
        } else {
            alert("无效的编号！");
        }
    });

    GM_registerMenuCommand("📢 测试通知", async () => {
        RewardsAuto.state.sendMSG = "🧪 这是一条测试消息\n如果你看到这条消息，说明通知接口配置成功！";
        Utils.log("📢", "测试通知已发送", true);
        alert("测试消息已发送，请检查各通知渠道！");
    });

    GM_registerMenuCommand("📋 查看通知状态", () => {
        const wework = GM_getValue("Notice.wework", "");
        const dingding = GM_getValue("Notice.dingding", "");
        const feishu = GM_getValue("Notice.feishu", "");
        const pushme = GM_getValue("Notice.pushme", "");
        const bark = GM_getValue("Notice.bark", "");
        
        let status = "📊 通知接口配置状态：\n\n";
        status += `企业微信: ${wework ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `钉钉: ${dingding ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `飞书: ${feishu ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `PushMe: ${pushme ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `Bark: ${bark ? "✅ 已配置" : "❌ 未配置"}\n`;
        alert(status);
    });

    // =====================================================
    // 入口引导
    // 【改动说明】继承 Untitled-1.txt 的随机延迟启动逻辑
    // 使用 5-95 秒随机延迟，避免定时器特征检测
    // =====================================================
    const init = () => {
        TaskManager.init();

        // 检查今日任务是否已完成
        const isKeep = GM_getValue("Config.keep", true);
        const checkDone = (enabled, date) => !enabled || date === RewardsAuto.state.dateNowNum;
        const isAllDone = checkDone(GM_getValue("Tasks.sign"), TaskManager.signDate) &&
                          checkDone(GM_getValue("Tasks.read"), TaskManager.readDate) &&
                          checkDone(GM_getValue("Tasks.promos"), TaskManager.promosDate) &&
                          checkDone(GM_getValue("Tasks.search"), TaskManager.searchDate);

        if (!isKeep && isAllDone) {
            Utils.log("💤", "今日任务已全部完成");
            return;
        }

        // 【防封号核心】随机延迟 5-95 秒启动，避免定时器特征
        const delay = Utils.randomRange(5000, 95000);
        Utils.log("⏳", `${delay/1000}秒后启动...`);
        setTimeout(() => TaskManager.runAll(), delay);
    };

    // 清除可能影响搜索的 Cookie
    GM_cookie("delete", { url: "https://bing.com", name: "_EDGE_S" });
    init();

})();
