# Built with Node, served as plain files by nginx running as an unprivileged user: the image holds the built
# app only, no sources, no node_modules and no npm.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# CATALOGUE_BASE: the path the build is served under (AISC serves it under /project-catalogue/).
# VITE_API_URL: where reads go when no project is known (blank: /api on the page's own origin).
ARG VITE_API_URL
ARG CATALOGUE_BASE=/
ENV VITE_API_URL=$VITE_API_URL
ENV CATALOGUE_BASE=$CATALOGUE_BASE
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
