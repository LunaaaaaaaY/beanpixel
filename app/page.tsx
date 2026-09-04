'use client'

import { ChangeEvent, useMemo, useRef, useState } from 'react'

type PaletteColor = { code: string; name: string; hex: string }
type Cell = PaletteColor

const STARTER_PALETTE: PaletteColor[] = [
  { code: 'BP01', name: 'Black', hex: '#1E1E1E' },
  { code: 'BP02', name: 'White', hex: '#F6F5F2' },
  { code: 'BP03', name: 'Warm Gray', hex: '#B9B2A8' },
  { code: 'BP04', name: 'Dark Gray', hex: '#5D5D5D' },
  { code: 'BP05', name: 'Cream', hex: '#F3DDB6' },
  { code: 'BP06', name: 'Tan', hex: '#C99C72' },
  { code: 'BP07', name: 'Brown', hex: '#7A513C' },
  { code: 'BP08', name: 'Dark Brown', hex: '#4C3228' },
  { code: 'BP09', name: 'Blush', hex: '#F2B7A8' },
  { code: 'BP10', name: 'Red', hex: '#D84945' },
  { code: 'BP11', name: 'Orange', hex: '#E8863B' },
  { code: 'BP12', name: 'Yellow', hex: '#E8C94A' },
  { code: 'BP13', name: 'Light Green', hex: '#A9C97C' },
  { code: 'BP14', name: 'Green', hex: '#5F9461' },
  { code: 'BP15', name: 'Dark Green', hex: '#355D45' },
  { code: 'BP16', name: 'Sky Blue', hex: '#8FC7D8' },
  { code: 'BP17', name: 'Blue', hex: '#4B7EAD' },
  { code: 'BP18', name: 'Navy', hex: '#33475E' },
  { code: 'BP19', name: 'Lavender', hex: '#A995C9' },
  { code: 'BP20', name: 'Purple', hex: '#725B8A' }
]

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function colorDistance(r: number, g: number, b: number, p: PaletteColor) {
  const c = hexToRgb(p.hex)
  const rMean = (r + c.r) / 2
  const dr = r - c.r
  const dg = g - c.g
  const db = b - c.b
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db)
}

function nearestColor(r: number, g: number, b: number, palette: PaletteColor[]) {
  let best = palette[0]
  let bestD = Infinity
  for (const p of palette) {
    const d = colorDistance(r, g, b, p)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [width, setWidth] = useState(40)
  const [height, setHeight] = useState(40)
  const [maxColors, setMaxColors] = useState(16)
  const [cells, setCells] = useState<Cell[]>([])
  const [showCodes, setShowCodes] = useState(true)
  const [status, setStatus] = useState('上传一张图片开始')
  const imgRef = useRef<HTMLImageElement | null>(null)

  const usage = useMemo(() => {
    const counts = new Map<string, { color: PaletteColor; count: number }>()
    cells.forEach((c) => {
      const old = counts.get(c.code)
      counts.set(c.code, { color: c, count: (old?.count ?? 0) + 1 })
    })
    return [...counts.values()].sort((a, b) => b.count - a.count)
  }, [cells])

  function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCells([])
    setStatus('图片已载入，点击“生成拼豆图”')
  }

  function generatePattern() {
    if (!imgRef.current || !imageSrc) return
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(imgRef.current, 0, 0, width, height)
    const data = ctx.getImageData(0, 0, width, height).data

    const histogram = new Map<string, { r: number; g: number; b: number; count: number }>()
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha < 20) continue
      const r = Math.round(data[i] / 32) * 32
      const g = Math.round(data[i + 1] / 32) * 32
      const b = Math.round(data[i + 2] / 32) * 32
      const key = `${r},${g},${b}`
      const old = histogram.get(key)
      histogram.set(key, { r, g, b, count: (old?.count ?? 0) + 1 })
    }

    const dominant = [...histogram.values()].sort((a, b) => b.count - a.count).slice(0, maxColors)
    const activeCodes = new Set(dominant.map((c) => nearestColor(c.r, c.g, c.b, STARTER_PALETTE).code))
    const palette = STARTER_PALETTE.filter((p) => activeCodes.has(p.code))
    const finalPalette = palette.length >= 2 ? palette : STARTER_PALETTE.slice(0, Math.max(2, maxColors))

    const next: Cell[] = []
    for (let i = 0; i < data.length; i += 4) {
      next.push(nearestColor(data[i], data[i + 1], data[i + 2], finalPalette))
    }
    setCells(next)
    setStatus(`完成：${width}×${height}，${new Set(next.map(c => c.code)).size} 色，${next.length} 颗豆`)
  }

  function exportPng() {
    if (!cells.length) return
    const cell = 28
    const margin = 44
    const legendWidth = 260
    const canvas = document.createElement('canvas')
    canvas.width = margin + width * cell + legendWidth + 30
    canvas.height = margin + height * cell + 30
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 18px Arial'
    ctx.fillStyle = '#222'
    ctx.fillText('BeanPixel 拼豆施工图', margin, 26)

    cells.forEach((c, i) => {
      const x = i % width
      const y = Math.floor(i / width)
      const px = margin + x * cell
      const py = margin + y * cell
      ctx.fillStyle = c.hex
      ctx.fillRect(px, py, cell, cell)
      ctx.strokeStyle = '#b9b9b9'
      ctx.strokeRect(px, py, cell, cell)
      ctx.fillStyle = '#111'
      ctx.font = '8px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(c.code, px + cell / 2, py + cell / 2)
    })

    const lx = margin + width * cell + 24
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = 'bold 14px Arial'
    ctx.fillStyle = '#222'
    ctx.fillText('色卡 / 用量', lx, margin)
    usage.forEach((u, idx) => {
      const y = margin + 26 + idx * 25
      ctx.fillStyle = u.color.hex
      ctx.fillRect(lx, y - 14, 18, 18)
      ctx.strokeStyle = '#aaa'
      ctx.strokeRect(lx, y - 14, 18, 18)
      ctx.fillStyle = '#222'
      ctx.font = '12px Arial'
      ctx.fillText(`${u.color.code}  ${u.color.name}  × ${u.count}`, lx + 26, y)
    })

    const a = document.createElement('a')
    a.download = `beanpixel-${width}x${height}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">BeanPixel</div>
          <div className="tagline">把图片变成真正可以施工的拼豆图纸</div>
        </div>
        <div className="badge">v0.1 · Browser Processing</div>
      </header>

      <section className="workspace">
        <aside className="panel controls">
          <h2>1. 导入与设置</h2>
          <label className="upload">
            <span>上传图片</span>
            <input type="file" accept="image/*" onChange={onUpload} />
          </label>

          <div className="fieldGrid">
            <label>宽度（格）<input type="number" min="8" max="120" value={width} onChange={e => setWidth(Number(e.target.value))} /></label>
            <label>高度（格）<input type="number" min="8" max="120" value={height} onChange={e => setHeight(Number(e.target.value))} /></label>
          </div>

          <label>最大颜色数 <b>{maxColors}</b><input type="range" min="4" max="20" value={maxColors} onChange={e => setMaxColors(Number(e.target.value))} /></label>

          <div className="presetRow">
            {[32, 40, 60, 80].map(n => <button key={n} onClick={() => { setWidth(n); setHeight(n) }}>{n}×{n}</button>)}
          </div>

          <button className="primary" onClick={generatePattern} disabled={!imageSrc}>生成拼豆图</button>
          <button className="secondary" onClick={() => setShowCodes(v => !v)}>{showCodes ? '隐藏格内色号' : '显示格内色号'}</button>
          <button className="secondary" onClick={exportPng} disabled={!cells.length}>导出 PNG 施工图</button>

          <div className="status">{status}</div>
        </aside>

        <section className="canvasArea">
          {!imageSrc && !cells.length && <div className="empty">上传照片后，BeanPixel 会把它压缩成纯色拼豆网格。</div>}
          {imageSrc && !cells.length && <div className="previewWrap"><img ref={imgRef} src={imageSrc} alt="uploaded" className="sourcePreview" /></div>}
          {imageSrc && <img ref={imgRef} src={imageSrc} alt="processing source" style={{ display: 'none' }} />}
          {!!cells.length && (
            <div className="patternWrap">
              <div className="coords topCoords" style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}>{Array.from({ length: width }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
              <div className="pattern" style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}>
                {cells.map((c, i) => <div key={i} className="bead" style={{ background: c.hex }} title={`${c.code} ${c.name}`}>{showCodes && <span>{c.code}</span>}</div>)}
              </div>
            </div>
          )}
        </section>

        <aside className="panel usage">
          <h2>2. 色卡与用量</h2>
          {!usage.length && <p className="muted">生成后显示每种颜色所需数量。</p>}
          {usage.map(u => (
            <div className="usageRow" key={u.color.code}>
              <span className="swatch" style={{ background: u.color.hex }} />
              <div><b>{u.color.code}</b><small>{u.color.name}</small></div>
              <strong>{u.count}</strong>
              <em>+5% {Math.ceil(u.count * 1.05)}</em>
            </div>
          ))}
          {!!usage.length && <div className="summary"><span>总豆数</span><b>{cells.length}</b><span>颜色数</span><b>{usage.length}</b><span>尺寸</span><b>{width}×{height}</b></div>}
        </aside>
      </section>

      <footer>当前为 BeanPixel 自有界面与基础算法版本。下一步将接入真实品牌色卡、主体裁剪、孤立像素清理与 PDF 施工图。</footer>
    </main>
  )
}
