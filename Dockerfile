# 构建阶段 - 编译 better-sqlite3 原生模块
FROM node:20-alpine AS builder

# 安装编译依赖
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖并编译原生模块
RUN npm install --build-from-source

# 复制源代码
COPY . .

# 生产阶段
FROM node:20-alpine AS production

# 安装运行时依赖
RUN apk add --no-cache tini

WORKDIR /app

# 从构建阶段复制 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制源代码
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/index.js ./
COPY --from=builder /app/config.js ./
COPY --from=builder /app/src ./src

# 创建数据目录
RUN mkdir -p /app/data && chown -R node:node /app

# 使用非 root 用户
USER node

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口（如果使用 webhook 模式）
EXPOSE 3000

# 使用 tini 作为 init 进程
ENTRYPOINT ["/sbin/tini", "--"]

# 启动命令
CMD ["node", "index.js"]
