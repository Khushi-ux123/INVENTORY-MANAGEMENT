# Stage 1: Node builder for static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors from the frontend directory
COPY package*.json ./

# Install packages
RUN npm install

# Copy frontend source code
COPY . .

# Run compilation build
RUN npm run build

# Stage 2: Production Nginx Server to serve HTML & proxy APIs
FROM nginx:alpine

# Copy custom Nginx configuration to support client-side routing (SPA fallback)
# and set up reverse proxy from /api/ to the Python Backend Service's API
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:8000/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage into Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose web port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
