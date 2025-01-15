# glob-image-resize

[![GitHub license](https://img.shields.io/github/license/Liquid-JS/glob-image-resize.svg)](https://github.com/Liquid-JS/glob-image-resize/blob/master/LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/liquidjs/glob-image-resize.svg)](https://hub.docker.com/r/liquidjs/glob-image-resize/)
[![npm](https://img.shields.io/npm/dm/@liquid-js/glob-image-resize.svg)](https://www.npmjs.com/package/@liquid-js/glob-image-resize)
[![scope](https://img.shields.io/npm/v/@liquid-js/glob-image-resize.svg)](https://www.npmjs.com/package/@liquid-js/glob-image-resize)

Batch contain images to size

## Installation

    npm install @liquid-js/glob-image-resize

## API Documentation

<https://liquid-js.github.io/glob-image-resize/>

## Usage

```sh
glob-image-resize -g "images/*.jpg" [-m 3600]
```

### Docker usage

```sh
docker run --rm -v $(pwd)/images:/images liquidjs/glob-image-resize -g "/images/*.jpg" [-m 3600]
```

## License

[GPL-3.0 license](https://github.com/Liquid-JS/glob-image-resize/blob/master/LICENSE)
