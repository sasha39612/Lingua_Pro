# AI Orchestrator Dockerfile
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 4005
CMD ["pnpm","run","start:prod"]