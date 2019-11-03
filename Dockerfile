FROM node:12 as builder
WORKDIR /srv
ADD package.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn build
RUN yarn pack
RUN mv liquid-js-glob-image-resize*.tgz glob-image-resize.tgz

FROM node:12
COPY --from=builder /srv/glob-image-resize.tgz /tmp/glob-image-resize.tgz
RUN yarn global add /tmp/glob-image-resize.tgz \
    && rm /tmp/glob-image-resize.tgz
ENTRYPOINT glob-image-resizer
