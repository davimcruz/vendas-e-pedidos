FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./
RUN pnpm build && pnpm prune --prod

EXPOSE 3000

CMD ["pnpm", "start"]
