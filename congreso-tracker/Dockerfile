FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src
COPY data/current.json data/*.json data/*.json.gz ./data/
EXPOSE 8787
ENV NODE_ENV=production PORT=8787
CMD ["node", "src/server.mjs"]
