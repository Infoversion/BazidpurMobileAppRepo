// Metro polyfill: runs as a raw script at the very top of the bundle, before
// any require()/module system exists. JSC (used instead of Hermes for iOS 26
// stability) does not expose TextEncoder/TextDecoder, and RN's URL polyfill
// constructs them at module top-level — so this must be a true polyfill, not
// an entry-file import.
//
// Minimal UTF-8 only implementation (RN URL polyfill and Supabase realtime
// only need UTF-8). Adapted from the WHATWG encoding spec.
;(function (global) {
  'use strict'

  if (typeof global.TextEncoder === 'undefined') {
    function TextEncoder() {}
    TextEncoder.prototype.encoding = 'utf-8'
    TextEncoder.prototype.encode = function encode(str) {
      str = String(str == null ? '' : str)
      var len = str.length
      var out = new Uint8Array(len * 3)
      var pos = 0
      for (var i = 0; i < len; i++) {
        var c = str.charCodeAt(i)
        if (c >= 0xd800 && c <= 0xdbff && i + 1 < len) {
          var c2 = str.charCodeAt(i + 1)
          if (c2 >= 0xdc00 && c2 <= 0xdfff) {
            c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00)
            i++
          }
        }
        if (c < 0x80) {
          out[pos++] = c
        } else if (c < 0x800) {
          out[pos++] = 0xc0 | (c >> 6)
          out[pos++] = 0x80 | (c & 0x3f)
        } else if (c < 0x10000) {
          out[pos++] = 0xe0 | (c >> 12)
          out[pos++] = 0x80 | ((c >> 6) & 0x3f)
          out[pos++] = 0x80 | (c & 0x3f)
        } else {
          out[pos++] = 0xf0 | (c >> 18)
          out[pos++] = 0x80 | ((c >> 12) & 0x3f)
          out[pos++] = 0x80 | ((c >> 6) & 0x3f)
          out[pos++] = 0x80 | (c & 0x3f)
        }
      }
      return out.subarray(0, pos)
    }
    global.TextEncoder = TextEncoder
  }

  if (typeof global.TextDecoder === 'undefined') {
    function TextDecoder(encoding, options) {
      this.encoding = (encoding || 'utf-8').toLowerCase()
      this.fatal = !!(options && options.fatal)
      this.ignoreBOM = !!(options && options.ignoreBOM)
    }
    TextDecoder.prototype.decode = function decode(input) {
      if (input == null) return ''
      var bytes
      if (input instanceof Uint8Array) {
        bytes = input
      } else if (input.buffer instanceof ArrayBuffer) {
        bytes = new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength)
      } else if (input instanceof ArrayBuffer) {
        bytes = new Uint8Array(input)
      } else {
        bytes = new Uint8Array(input)
      }
      var out = ''
      var i = 0
      var len = bytes.length
      while (i < len) {
        var b1 = bytes[i++]
        var cp
        if (b1 < 0x80) {
          cp = b1
        } else if ((b1 & 0xe0) === 0xc0) {
          cp = ((b1 & 0x1f) << 6) | (bytes[i++] & 0x3f)
        } else if ((b1 & 0xf0) === 0xe0) {
          cp = ((b1 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)
        } else if ((b1 & 0xf8) === 0xf0) {
          cp = ((b1 & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)
        } else {
          cp = 0xfffd
        }
        if (cp > 0xffff) {
          cp -= 0x10000
          out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff))
        } else {
          out += String.fromCharCode(cp)
        }
      }
      return out
    }
    global.TextDecoder = TextDecoder
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : this)
