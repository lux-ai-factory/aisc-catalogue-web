# Built with Node, served as plain files by nginx running as an unprivileged user: the image holds the built
# app only, no sources, no node_modules and no npm.

FROM node:22.23.3-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# CATALOGUE_BASE: the path the build is served under (AISC serves it under /project-catalogue/).
ARG CATALOGUE_BASE=/
ENV CATALOGUE_BASE=$CATALOGUE_BASE
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27.5-alpine@sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
