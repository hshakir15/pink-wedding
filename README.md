# Safina & Ghalib — Nikah Wedding Invitation

A luxury, interactive digital wedding invitation with custom video hero reveal, background audio nasheed loop, countdown timer, interactive RSVP with instant WhatsApp confirmation, calendar integration (.ics & Google Calendar), and Lenis smooth scrolling.

---

## 🚀 Quick Deploy to Vercel

### Option 1: Via GitHub (Recommended)
1. Unzip the file or extract this repository.
2. Create a new repository on GitHub: [github.com/new](https://github.com/new).
3. Push these files to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Wedding Invitation"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```
4. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
5. Select your GitHub repository and click **Deploy**. Vercel will automatically detect `index.html` and deploy it instantly.

### Option 2: Direct Upload via Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. In this project folder, run:
   ```bash
   vercel
   ```
3. Follow the on-screen prompts to deploy.

---

## 📂 Project Structure
- `index.html`: Main wedding invitation single-page layout.
- `styles.css`: Custom animations, card styling, and typography.
- `script.js`: Interactive controller (video, audio loop, GSAP, countdown, RSVP).
- `vercel.json`: Vercel static routing and asset caching configuration.
- `assets/`:
  - `audio/`: Background wedding nasheed audio track.
  - `video/`: Opening hero frame & reveal video.
  - `images/`: Couple portraits, floral assets, watercolor backgrounds, and master artwork.
  - `js/`: Lenis smooth scroll library.
