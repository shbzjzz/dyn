FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY proxy.js ./
ENV PORT=8787
EXPOSE 8787
CMD ["node", "proxy.js"]
