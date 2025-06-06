FROM node:22-alpine3.22 as builder
WORKDIR /build
ENV NODE_ENV=production

COPY package*.json .
COPY . .
RUN npm ci --include=dev
RUN npm run build
RUN npm prune

FROM node:22-alpine3.22 as deploy
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=America/Toronto
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN mkdir -p /local && touch /local/env
ENV HT6_ENV_SOURCE=/local/env

EXPOSE 6971

RUN apk add dumb-init

COPY package*.json .
COPY --from=builder /build/node_modules node_modules
COPY --from=builder /build/dist dist

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/bin/sh", "-c", "source $HT6_ENV_SOURCE && exec node ./dist/index.js"]