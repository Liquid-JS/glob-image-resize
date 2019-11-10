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

const remove = new Set<string>()
const rmS = new Set(['.png', '.jpg', '.jpeg'])

src(args.g.map(g => g.toString()), { realpath: true, absolute: true, nodir: true })
    .pipe(new Transform({
        readableObjectMode: true,
        writableObjectMode: true,
        transform: async (chunk: File, _enc, cb) => {
            if (!chunk.isBuffer)
                return cb(null, null)

            try {
                // Check already transformed
                const exif = piexif.load(chunk.contents.toString('binary'))
                if (exif['0th'][piexif.ImageIFD.ImageHistory] == 'modified')
                    return cb(null, null)
            } catch (e) { }

            try {
                // Check valid image
                await sharp(chunk.contents as Buffer).metadata()
            } catch (e) {
                return cb(null, null)
            }

            console.log(chunk.path)
            const dir = dirname(chunk.path)
            const ext = extname(chunk.path)
            const base = basename(chunk.path, ext)

            const sh = sharp(chunk.contents as Buffer)
                .ensureAlpha()
                .rotate()
                .resize(size, size, { fit: 'inside', withoutEnlargement: true })

            try {
                const stats = await sh.stats()
                const contents = stats.isOpaque
                    ? sh
                        .jpeg({ quality: 95 })
                        .pipe(new Transform({
                            transform: (chunk: Buffer, _enc, cb) => {
                                const data = piexif.insert(MODIFED_META, chunk.toString('binary'))
                                cb(null, Buffer.from(data, 'binary'))
                            }
                        }))
                    : sh
                        .png({ quality: 95 })

                const target = `${dir}${sep}${base}.${stats.isOpaque ? 'jpg' : 'png'}`

                if (rmS.has(ext.toLowerCase())) {
                    remove.add(chunk.path)
                }

                return cb(null, new File({
                    cwd: chunk.cwd,
                    base: chunk.base,
                    path: target,
                    contents
                }))
            } catch (err) {
                console.error(`Failed: "${chunk.path}"`, err)
            }

            cb(null, null)
        }
    }))
    .pipe(dest((f) => f.base))
    .on('end', () => {
        console.log(remove)
    })
