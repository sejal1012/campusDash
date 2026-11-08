# Railway builds this instead of Railpack, so the build doesn't depend on downloading
# tools from GitHub releases (which kept failing with 504s). Node comes from Docker Hub.

# ---- Build the static site ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Vite bakes VITE_* values into the bundle at build time. Railway passes service
# variables to the build only when they are declared as ARGs here.
ARG VITE_MAPBOX_TOKEN
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
RUN npm run build

# ---- Serve it ----
FROM nginx:1.27-alpine
# The nginx image fills ${PORT} into this template on start; Railway sets PORT.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=8080
EXPOSE 8080
