import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as M from '@principia/model'

export interface ParsedContentType {
  readonly type: string
  readonly parameters: Record<string, string>
}

export const HttpContentType = {
  APPLICATION: 'application/*',
  APPLICATION_RTF: 'application/rtf',
  APPLICATION_ZIP: 'application/zip',
  APPLICATION_X_RAR: 'application/x-rar-compressed',
  APPLICATION_X_TAR: 'application/x-tar',
  APPLICATION_X_TZ_COMPRESSED: 'application/x-7z-compressed',
  APPLICATION_X_WWW_FORM_URLENCODED: 'application/x-www-form-urlencoded',
  APPLICATION_PDF: 'application/pdf',
  APPLICATION_JSON: 'application/json',
  APPLICATION_JAVASCRIPT: 'application/javascript',
  APPLICATION_ECMASCRIPT: 'application/ecmascript',
  APPLICATION_XML: 'application/xml',
  APPLICATION_OCTET_STREAM: 'application/octet-stream',
  APPLICATION_VND_API_JSON: 'application/vnd.api+json',
  APPLICATION_GRAPHQL: 'application/graphql',
  TEXT_PLAIN: 'text/plain',
  TEXT_HTML: 'text/html',
  TEXT_CSS: 'text/css',
  TEXT_CSV: 'text/csv',
  IMAGE_WEBP: 'image/webp',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  IMAGE_GIF: 'image/gif',
  IMAGE_TIFF: 'image/tiff',
  IMAGE_SVG_XML: 'image/svg+xml',
  AUDIO_MPEG: 'audio/mpeg',
  AUDIO_OGG: 'audio/ogg',
  AUDIO: 'audio/*',
  VIDEO_WEBM: 'video/webm',
  VIDEO_MP4: 'video/mp4',
  FONT_TTF: 'font/ttf',
  FONT_WOFF: 'font/woff',
  FONT_WOFF2: 'font/woff2',
  MULTIPART_FORM_DATA: 'multipart/form-data'
} as const

export type HttpContentType = typeof HttpContentType[keyof typeof HttpContentType]

export const ContentTypeModel = M.make((F) =>
  F.keyof({
    'application/*': null,
    'application/rtf': null,
    'application/zip': null,
    'application/x-rar-compressed': null,
    'application/x-tar': null,
    'application/x-7z-compressed': null,
    'application/x-www-form-urlencoded': null,
    'application/pdf': null,
    'application/json': null,
    'application/javascript': null,
    'application/ecmascript': null,
    'application/xml': null,
    'application/octet-stream': null,
    'application/vnd.api+json': null,
    'application/graphql': null,
    'text/plain': null,
    'text/html': null,
    'text/css': null,
    'text/csv': null,
    'image/webp': null,
    'image/jpeg': null,
    'image/png': null,
    'image/gif': null,
    'image/tiff': null,
    'image/svg+xml': null,
    'audio/mpeg': null,
    'audio/ogg': null,
    'audio/*': null,
    'video/webm': null,
    'video/mp4': null,
    'font/ttf': null,
    'font/woff': null,
    'font/woff2': null,
    'multipart/form-data': null
  })
)

export const CharsetModel = M.make((F) =>
  F.keyof({
    'utf-8': null,
    utf8: null,
    ascii: null,
    utf16le: null,
    ucs2: null,
    'ucs-2': null,
    binary: null,
    hex: null,
    base64: null,
    latin1: null
  })
)

export const decodeCharset = M.getDecoder(CharsetModel)

export interface CookieOptions {
  readonly expires?: Date
  readonly domain?: string
  readonly httpOnly?: boolean
  readonly maxAge?: number
  readonly path?: string
  readonly sameSite?: boolean | 'strict' | 'lax'
  readonly secure?: boolean
  readonly signed?: boolean
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE'

export function parseContentType(s: string): ParsedContentType {
  return pipe(
    s.split(';'),
    A.ifoldl({ parameters: {} } as ParsedContentType, (b, i, a) => {
      if (i === 0) {
        return { type: a, parameters: {} }
      }
      const mut_split = a.split('=')
      if (mut_split[1][0] === '"') {
        mut_split[1] = mut_split[1].substr(1, mut_split[1].length - 2)
      }
      return {
        ...b,
        parameters: {
          ...b.parameters,
          [mut_split[0]]: mut_split[1]
        }
      }
    })
  )
}
