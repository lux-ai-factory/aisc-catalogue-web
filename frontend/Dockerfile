FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# CATALOGUE_BASE: the path the build is served under (AISC serves it under
# /project-catalogue/). VITE_API_URL: where reads go when no project is known
# (blank: /api on the page's own origin).
ARG VITE_API_URL
ARG CATALOGUE_BASE=/
ENV VITE_API_URL=$VITE_API_URL
ENV CATALOGUE_BASE=$CATALOGUE_BASE
RUN npm run build

# Use serve package to serve the built app
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
