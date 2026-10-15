FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./
COPY public ./public

# /data holds db.json, photos and the song; owned by the non-root "node" user
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
EXPOSE 3000

USER node
CMD ["node", "server.js"]
