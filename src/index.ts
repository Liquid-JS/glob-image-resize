#!/usr/bin/env node
import { basename, dirname, extname, normalize, sep } from 'path'
import { Transform } from 'stream'
// @ts-ignore
import piexif from 'piexifjs'
import sharp from 'sharp'
import File from 'vinyl'
import vfs from 'vinyl-fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const { dest, src } = vfs

const MODIFED_META = piexif.dump({ '0th': { [piexif.ImageIFD.ImageHistory]: 'modified' } })

const withMeta = () => new Transform({
    objectMode: true,
    transform: (chunk: Buffer, _enc, cb) => {
        const data = piexif.insert(MODIFED_META, chunk.toString('binary'))
        cb(null, Buffer.from(data, 'binary'))
    }
})

await Promise.resolve(
    yargs(hideBin(process.argv))
        .command(
            '*',
            'resize images matching a given glob',
            (builder) =>
                builder
                    .option('glob', {
                        alias: 'g',
                        type: 'array',
                        demand: true
                    })
                    .option('max', {
                        alias: 'm',
                        type: 'number',
                        default: 1920,
                        min: 1,
                        max: 3600
                    }),
            async (args) => {
                const size = args.max

                const remove = new Set<string>()

                src(args.glob.map(g => g.toString()), { resolveSymlinks: true, encoding: false })
                    .pipe(new Transform({
                        objectMode: true,
                        transform: async (chunk: File, _enc, cb) => {
                            if (!chunk.isBuffer())
                                return cb(null, null)

                            try {
                                // Check already transformed
                                const exif = piexif.load(chunk.contents?.toString('binary'))
                                if (exif['0th'][piexif.ImageIFD.ImageHistory] == 'modified')
                                    return cb(null, null)
                            } catch (_e) { }

                            try {
                                // Check valid image
                                await sharp(chunk.contents).metadata()
                            } catch (_e) {
                                return cb(null, null)
                            }

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
                                        .pipe(withMeta())
                                    : sh
                                        .png({ quality: 95 })

                                const target = `${dir}${sep}${base}.${stats.isOpaque ? 'jpg' : 'png'}`

                                if (normalize(target) != normalize(chunk.path)) {
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
                    .pipe(dest((f) => f.base, { encoding: false }))
                    .on('end', () => {
                        console.log('Finished resizing images')
                        if (remove.size > 0)
                            console.log(`These images are no longer required:\n${[...remove].join('\n')}`)
                    })
            }
        )
        .demandCommand()
        .showHelpOnFail(false)
        .strict()
        .help()
        .wrap(120).argv
).catch(console.error)
