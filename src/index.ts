#!/usr/bin/env node
import { basename, dirname, extname, sep } from 'path'
import piexif = require('piexifjs')
import sharp = require('sharp')
import { Transform } from 'stream'
import File = require('vinyl')
import { dest, src } from 'vinyl-fs'
import yargs = require('yargs')

const MODIFED_META = piexif.dump({ '0th': { [piexif.ImageIFD.ImageHistory]: 'modified' } })

const args = yargs
    .option('g', {
        alias: 'glob',
        type: 'array',
        demand: true
    })
    .option('m', {
        alias: 'max',
        type: 'number',
        default: 1920,
        min: 1,
        max: 3600
    })
    .argv

const size = args.m

src(args.g.map(g => g.toString()), { realpath: true, absolute: true, nodir: true })
    .pipe(new Transform({
        readableObjectMode: true,
        writableObjectMode: true,
        transform: (chunk: File, _enc, cb) => {
            if (!chunk.isBuffer)
                return cb(null, null)

            const exif = piexif.load(chunk.contents.toString('binary'))

            if (exif['0th'][piexif.ImageIFD.ImageHistory] == 'modified')
                return cb(null, null)

            const dir = dirname(chunk.path)
            const ext = extname(chunk.path)
            const base = basename(chunk.path, ext)

            return cb(null, new File({
                cwd: chunk.cwd,
                base: chunk.base,
                path: `${dir}${sep}${base}.jpg`,
                contents: sharp(chunk.contents as Buffer)
                    .ensureAlpha()
                    .rotate()
                    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 95 })
                    .pipe(new Transform({
                        transform: (chunk: Buffer, _enc, cb) => {
                            const data = piexif.insert(MODIFED_META, chunk.toString('binary'))
                            cb(null, Buffer.from(data, 'binary'))
                        }
                    }))
            }))
        }
    }))
    .pipe(dest((f) => f.base))
