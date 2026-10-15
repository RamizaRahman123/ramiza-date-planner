# Take me out? A date planner for two

A private website for planning dates together: a calendar to ask for dates, outfit themes with colour coordination, a cuisine vote, a corkboard of photos, and our song playing in the background.

## Features

| Section | What it does |
|---|---|
| Passcode gate | Only people with the passcode can see anything, including photos and the song |
| Plan a date | Pick a day on the calendar, add time, place, outfit theme and a note. The other person can answer "Say yes" or "Maybe" |
| What we'll wear | Six themes, each with a colour palette, her outfit, his outfit, and how they match |
| What we'll eat | Each person taps the cuisines they'd enjoy; the one with the most votes wins. Ties get a "Pick one for us" button |
| Our board | Upload photos (JPG, PNG, WebP, GIF, up to 10 MB); they appear as pinned sticky notes |
| Our song | Upload your own copy of the song (MP3/M4A, up to 25 MB); it plays from the record button |

## Ports

| Where | Port |
|---|---|
| Container (Node/Express) | 3000 |
| EC2 host | **80** (`80:3000` in `docker-compose.yml`) |
| ALB target group | HTTP **80** |

## Project structure

```
.
├── docker-compose.yml   # one service, port 80 -> 3000, data volume
├── Dockerfile           # node:20-alpine
├── .env.example         # passcode, names, cookie secret (copy to .env)
├── package.json
├── server.js            # API + passcode login + file uploads
├── public/              # index.html, style.css, app.js
└── scripts/deploy.sh    # git pull + docker compose up -d --build
```

Data (dates, votes, photos, the song) is stored in the Docker volume `dates_data`, so it survives rebuilds and redeploys. The song file is uploaded through the website and is never stored in GitHub.

## Deploy on EC2 (Ubuntu with Docker installed)

```bash
git clone https://github.com/YOUR_USERNAME/ramiza-date-planner.git ~/dates
cd ~/dates
cp .env.example .env
nano .env                  # set SITE_PASSCODE, HER_NAME, HIS_NAME
bash scripts/deploy.sh     # fills in SESSION_SECRET, builds and starts
curl localhost/health      # ok
```

Update after pushing changes: `cd ~/dates && bash scripts/deploy.sh`

## Personalising

- Outfit themes and cuisines: edit the `OUTFITS` and `CUISINES` lists at the top of `public/app.js`.
- Names and passcode: edit `.env`, then `docker compose up -d`.

## Useful commands

```bash
docker compose ps                 # is it running?
docker compose logs -f            # live logs
docker compose restart            # restart after editing .env
```
