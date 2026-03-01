# Audio Service Dockerfile
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build
EXPOSE 4003
CMD ["pnpm","run","start:prod"]