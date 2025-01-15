FROM node:22 AS builder
WORKDIR /srv
COPY . .
RUN yarn
RUN yarn build
RUN yarn pack --filename glob-image-resize.tgz

FROM node:22-alpine
COPY --from=builder /srv/glob-image-resize.tgz /tmp/glob-image-resize.tgz
RUN yarn global add /tmp/glob-image-resize.tgz \
    && rm /tmp/glob-image-resize.tgz
WORKDIR /images
ENTRYPOINT [ "glob-image-resize" ]
