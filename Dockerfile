# Node API Dockerfile (build-and-run)
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (disable lifecycle scripts like husky)
COPY package*.json ./
ENV HUSKY=0
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Build stage (needs dev deps)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
ENV HUSKY=0
RUN npm ci --ignore-scripts && npm cache clean --force
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 8080
CMD ["node", "dist/index.js"]

