// Tiny allow-list HTML sanitiser for the rich-text spec field. The content is
// authored by the shop admin, but it renders on public product pages, so we
// still strip anything beyond basic inline formatting (no scripts, links,
// images, event handlers or arbitrary CSS) before injecting it.

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'SPAN', 'FONT', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI'])
const ALLOWED_STYLE_PROPS = new Set(['color', 'background-color', 'font-weight', 'text-decoration'])
// Colours: #hex, rgb()/rgba(), or a plain CSS colour word. Anything with
// url(), quotes or expressions is rejected.
const SAFE_VALUE = /^[a-z0-9#(),.%\s-]+$/i

function filterStyle(style) {
  if (!style) return ''
  return style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(':')
      if (idx === -1) return null
      const prop = decl.slice(0, idx).trim().toLowerCase()
      const val = decl.slice(idx + 1).trim()
      if (!ALLOWED_STYLE_PROPS.has(prop) || !SAFE_VALUE.test(val)) return null
      return `${prop}: ${val}`
    })
    .filter(Boolean)
    .join('; ')
}

function clean(srcNode, dstNode, doc) {
  srcNode.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      // Text node — always safe.
      dstNode.appendChild(doc.createTextNode(child.textContent))
    } else if (child.nodeType === 1) {
      const tag = child.tagName
      if (ALLOWED_TAGS.has(tag)) {
        const el = doc.createElement(tag.toLowerCase())
        if (tag === 'FONT' && child.getAttribute('color') && SAFE_VALUE.test(child.getAttribute('color'))) {
          el.setAttribute('color', child.getAttribute('color'))
        }
        const style = filterStyle(child.getAttribute('style'))
        if (style) el.setAttribute('style', style)
        clean(child, el, doc)
        dstNode.appendChild(el)
      } else {
        // Disallowed element — drop the tag but keep its (cleaned) contents.
        clean(child, dstNode, doc)
      }
    }
  })
}

export function sanitizeRichHtml(html) {
  if (!html || typeof document === 'undefined') return html || ''
  const src = document.createElement('div')
  src.innerHTML = html
  const dst = document.createElement('div')
  clean(src, dst, document)
  return dst.innerHTML
}

// Escape plain text into safe HTML (preserving line breaks) — used to seed the
// rich editor from a product's legacy plain-text spec.
export function textToHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}
