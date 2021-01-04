import * as A from '@principia/base/data/Array'
import { pipe } from '@principia/base/data/Function'
import * as DE from '@principia/codec/DecodeErrors'
import * as Sy from '@principia/io/Sync'
import * as M from '@principia/model'

export enum Status {
  Continue = 100,
  SwitchingProtocols = 101,
  Processing = 102,
  EarlyHints = 103,
  OK = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  MultiStatus = 207,
  AlreadyReported = 208,
  IMUsed = 226,
  MultipleChoices = 300,
  MovedPermanently = 301,
  Found = 302,
  SeeOther = 303,
  NotModified = 304,
  UseProxy = 305,
  SwitchProxy = 306,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  PayloadTooLarge = 413,
  URITooLong = 414,
  UnsupportedMediaType = 415,
  RangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  Teapot = 418,
  MisdirectedRequest = 421,
  UnprocessableEntity = 422,
  Locked = 423,
  FailedDependency = 424,
  TooEarly = 425,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HTTPVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511
}

/**
 * RegExp to match type in RFC 7231 sec 3.1.1.1
 *
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 */
export const MEDIA_TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/**
 * RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
 *
 * parameter     = token "=" ( token / quoted-string )
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * obs-text      = %x80-FF
 * quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
 */
export const PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g // eslint-disable-line no-control-regex
export const TEXT_REGEXP  = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/ // eslint-disable-line no-control-regex
export const TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/**
 * RegExp to match quoted-pair in RFC 7230 sec 3.2.6
 *
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 */
export const QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g // eslint-disable-line no-control-regex

/**
 * RegExp to match chars that must be quoted-pair in RFC 7230 sec 3.2.6
 */
export const QUOTE_REGEXP = /([\\"])/g

export interface ParsedContentType {
  readonly type: string
  readonly parameters: Record<string, string>
}

export enum ContentType {
  APPLICATION = 'application/*',
  APPLICATION_RTF = 'application/rtf',
  APPLICATION_ZIP = 'application/zip',
  APPLICATION_X_RAR = 'application/x-rar-compressed',
  APPLICATION_X_TAR = 'application/x-tar',
  APPLICATION_X_TZ_COMPRESSED = 'application/x-7z-compressed',
  APPLICATION_X_WWW_FORM_URLENCODED = 'application/x-www-form-urlencoded',
  APPLICATION_PDF = 'application/pdf',
  APPLICATION_JSON = 'application/json',
  APPLICATION_JAVASCRIPT = 'application/javascript',
  APPLICATION_ECMASCRIPT = 'application/ecmascript',
  APPLICATION_XML = 'application/xml',
  APPLICATION_OCTET_STREAM = 'application/octet-stream',
  APPLICATION_VND_API_JSON = 'application/vnd.api+json',
  APPLICATION_GRAPHQL = 'application/graphql',
  TEXT_PLAIN = 'text/plain',
  TEXT_HTML = 'text/html',
  TEXT_CSS = 'text/css',
  TEXT_CSV = 'text/csv',
  IMAGE_WEBP = 'image/webp',
  IMAGE_JPEG = 'image/jpeg',
  IMAGE_PNG = 'image/png',
  IMAGE_GIF = 'image/gif',
  IMAGE_TIFF = 'image/tiff',
  IMAGE_SVG_XML = 'image/svg+xml',
  AUDIO_MPEG = 'audio/mpeg',
  AUDIO_OGG = 'audio/ogg',
  AUDIO = 'audio/*',
  VIDEO_WEBM = 'video/webm',
  VIDEO_MP4 = 'video/mp4',
  FONT_TTF = 'font/ttf',
  FONT_WOFF = 'font/woff',
  FONT_WOFF2 = 'font/woff2',
  MULTIPART_FORM_DATA = 'multipart/form-data'
}

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

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'

export const SyncDecoderM = DE.getDecodeErrorsValidation({
  ...Sy.MonadFail,
  ...Sy.Fallible,
  ...Sy.Bifunctor
})

export function parseContentType(s: string): ParsedContentType {
  return pipe(
    s.split(';'),
    A.foldLeftWithIndex({ parameters: {} } as ParsedContentType, (b, i, a) => {
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
