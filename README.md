# 🏁 Contest Platform (Judge0-Powered)

A **self-hosted, offline-friendly coding contest platform** built for colleges and classrooms.

- Multiple questions
- Multiple programming languages
- Automatic judging via Judge0
- Live leaderboard
- Single-click start & stop
- No cloud account required

Designed so even non-technical admins can run a contest reliably.

## ✨ Features

- **👩‍🏫 Admin Console**
  - Create questions with:
    - Title, description
    - Template code (per language)
    - Reference (golden) solution
    - Multi-line test cases
    - Allowed languages
  - Enable / disable questions live
  - Toggle blind mode (hide error output)
  - Start / stop contest
  - Reset contest for next round
  - View leaderboard
  - View submitted code per participant

- **👨‍🎓 Student Interface**
  - Persistent timer (server-based)
  - Draft auto-save
  - Run code with custom input
  - Submit once (locks contest)
  - Language selection (per question)

- **⚙️ System**
  - Judge0 execution engine (Dockerized)
  - Redis + PostgreSQL (internal)
  - SQLite for contest data
  - Optional Cloudflare tunnel (public URL)

## 🖥️ System Requirements

- Windows 10 / 11 OR Linux (Ubuntu recommended)
- 8 GB RAM (recommended for 30–40 students)
- Docker installed and running

### 🐳 Installing Docker (Required Once)
🔹 Windows

1. Download Docker Desktop
👉 https://www.docker.com/products/docker-desktop/
2. Install and **restart your PC**
3. Open Docker Desktop and wait until it says “Docker is running”

⚠️ WSL2 must be enabled (Docker will prompt automatically)

🔹 Linux (Ubuntu)
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

Optional (run Docker without sudo):
```bash
sudo usermod -aG docker $USER
logout
```

**Official docs:**
👉 https://docs.docker.com/engine/install/

## 🚀 Running the Contest (One-Click)
**🪟 Windows**

1. Double-click
```bash
single-click-start.bat
```

2. A terminal opens and shows:
```yaml
=============================
Contest Platform Started!
Admin Username: ADMIN-XXXX
Class PIN: 1234
URL: https://xxxx.trycloudflare.com
=============================
```

3. The browser opens automatically

**🐧 Linux / macOS**
```bash
chmod +x run.sh
./run.sh
```

You’ll see the same credentials printed.

### 🛑 Stopping the Contest
**Windows**

Double-click:
```bash
single-click-stop.bat
```
Linux
```bash
chmod +x stop.sh
./stop.sh
```

This safely stops all containers.

## 🔐 Login Rules
### Admin

- **Username** → shown in terminal (e.g. ADMIN-9F3A)
- **Class PIN** → shown in terminal

### Students

- Choose any username
- Enter Class PIN

### Rules:

- Only one active session per user
- Refresh does not reset timer
- Logout frees the username
- After submission → account locked

## 🧪 Typical Contest Flow

1. Admin starts platform
2. Students join using Class PIN
3. Practice questions enabled
4. Real questions enabled at start
5. Students code & test
6. Students click Finish Contest
7. Leaderboard updates instantly
8. Admin reviews submissions
9. Admin resets for next contest

## ⚠️ Limitations

- Designed for college labs / LAN setups
- Recommended capacity:
  - ~30–40 students (8 GB RAM)
  - ~60 students (16 GB RAM)
- Requires Docker (cannot run without it)
- Not designed for public internet scale

## 🛠️ Built With

- Node.js + Express
- React (Vite)
- Judge0 (1.13.1)
- Docker & Docker Compose
- SQLite
- Redis
- PostgreSQL
- Cloudflare Tunnel (optional)
- Judge0:
👉 https://github.com/judge0/judge0
- Docker:
👉 https://www.docker.com/

## 👤 Author / Credits

Built by Eber Johns C D

## 📜 License

MIT License
Free to use for educational and academic purposes.