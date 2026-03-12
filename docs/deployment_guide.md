# Server Deployment Guide (Alibaba Cloud)

## 📌 Target Environment
- **IP**: 8.159.153.134
- **Domain**: `justright.51winwin.com`
- **OS**: Ubuntu/CentOS (Linux)

---

## 🛠 Step 1: Environment Preparation
Log in to your server and install the stack:
```bash
sudo apt update
sudo apt install nginx nodejs npm certbot python3-certbot-nginx -y
sudo npm install -g pm2
```

## 📂 Step 2: Code Retrieval
```bash
cd /var/www
git clone https://github.com/jordanwang922/ai-marketing-system.git
cd ai-marketing-system/modules/justright-calendar
npm install
npm run build
cd server && npm install && cd ..
```

## 🚀 Step 3: PM2 Backend Startup
```bash
cd modules/justright-calendar/server
pm2 start server.js --name "justright-api"
pm2 save
```

## 🌐 Step 4: Nginx & SSL (Let's Encrypt)

### 1. Create Nginx Config
Create `/etc/nginx/sites-available/justright`:
```nginx
server {
    listen 80;
    server_name justright.51winwin.com;

    location / {
        root /var/www/ai-marketing-system/modules/justright-calendar/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### 2. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/justright /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Apply Let's Encrypt SSL 🔐
**This is the specific request from the user.**
```bash
sudo certbot --nginx -d justright.51winwin.com
```
Follow the prompts to:
1. Enter email for renewal alerts.
2. Agree to Terms of Service.
3. **Select "Redirect"** to automatically upgrade all HTTP traffic to HTTPS.

---

## ✅ Step 5: Verify
Access `https://justright.51winwin.com` in your browser.
Check that the padlock icon is visible.
