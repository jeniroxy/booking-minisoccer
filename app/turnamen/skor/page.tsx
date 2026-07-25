'use client'
import { useEffect } from 'react'

interface Match { id: string; h: number; a: number; t: string }

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const TEAMS: Record<string, string[]> = {
  A: ['Cimory', 'X-ber', 'Laser FC'],
  B: ['Bodrek mt', 'Slebew fc', 'Citoke'],
  C: ['Silaturahmi fc', 'Ironers', 'Karbat FC'],
  D: ['Nyalse fc', 'HBFC / Harapan Bunda FC', 'Sekolah Rakyat'],
  E: ['Ojol Cibadak', 'Velcro FC', 'Pelangi fc'],
  F: ['Macan Putih', 'SOLID FC PGRI', 'KBR FC'],
  G: ['Cikiwul fc', 'Shark boy', 'Bantang FC'],
  H: ['PSDS FC', 'Brave United', 'Mixture'],
}

const GMS: Record<string, Match[]> = {
  A: [{ id: 'A1', h: 0, a: 1, t: '08:00' }, { id: 'A2', h: 0, a: 2, t: '08:30' }, { id: 'A3', h: 1, a: 2, t: '09:00' }],
  B: [{ id: 'B1', h: 0, a: 1, t: '08:15' }, { id: 'B2', h: 0, a: 2, t: '08:45' }, { id: 'B3', h: 1, a: 2, t: '09:15' }],
  C: [{ id: 'C1', h: 0, a: 1, t: '09:30' }, { id: 'C2', h: 0, a: 2, t: '10:00' }, { id: 'C3', h: 1, a: 2, t: '10:30' }],
  D: [{ id: 'D1', h: 0, a: 1, t: '09:45' }, { id: 'D2', h: 0, a: 2, t: '10:15' }, { id: 'D3', h: 1, a: 2, t: '10:45' }],
  E: [{ id: 'E1', h: 0, a: 1, t: '11:00' }, { id: 'E2', h: 0, a: 2, t: '11:30' }, { id: 'E3', h: 1, a: 2, t: '12:00' }],
  F: [{ id: 'F1', h: 0, a: 1, t: '11:15' }, { id: 'F2', h: 0, a: 2, t: '11:45' }, { id: 'F3', h: 1, a: 2, t: '12:15' }],
  G: [{ id: 'G1', h: 0, a: 1, t: '12:30' }, { id: 'G2', h: 0, a: 2, t: '13:00' }, { id: 'G3', h: 1, a: 2, t: '13:30' }],
  H: [{ id: 'H1', h: 0, a: 1, t: '12:45' }, { id: 'H2', h: 0, a: 2, t: '13:15' }, { id: 'H3', h: 1, a: 2, t: '13:45' }],
}

const CSS = `
:root{--navy:#0d1b2e;--card:#1b2c42;--card2:#162338;--green:#00ff62;--gold:linear-gradient(-20deg,#9f7521,#f9e060,#ffe87c,#9f7521);--text:#e8edf4;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:var(--navy);color:var(--text);font-size:13px;line-height:1.4;}
/* HEADER */
.hdr{background:var(--card);padding:12px 20px;display:flex;align-items:center;gap:14px;border-bottom:2px solid #00ff6233;position:sticky;top:0;z-index:100;}
.hdr img{height:40px;}
.hdr-txt h1{font-size:17px;font-weight:900;color:#f9e060;letter-spacing:.4px;}
.hdr-txt p{font-size:11px;color:#aaa;margin-top:1px;}
.hdr-btns{margin-left:auto;display:flex;gap:8px;}
.btn{padding:8px 16px;border-radius:7px;border:none;font-family:'Inter',sans-serif;font-weight:700;cursor:pointer;font-size:12px;text-decoration:none;display:inline-block;white-space:nowrap;}
.btn-g{background:var(--green);color:var(--navy);}
.btn-r{background:#ff3b3b22;color:#ff6b6b;border:1px solid #ff3b3b44;}
.btn-o{background:#00ff6222;color:var(--green);border:1px solid #00ff6244;}
@media(max-width:520px){.hdr{padding:10px 14px;gap:10px;}.hdr img{height:32px;}.hdr-txt h1{font-size:14px;}.hdr-txt p{font-size:10px;}.btn{padding:7px 10px;font-size:11px;}}
/* SEC */
.sec-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);padding:14px 16px 6px;}
/* GROUPS GRID */
.grp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:0 12px 12px;}
@media(max-width:1100px){.grp-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){.grp-grid{grid-template-columns:1fr;}}
.block{background:var(--card);border-radius:10px;overflow:hidden;border:1px solid #ffffff0d;}
.btitle{background:var(--card2);padding:8px 12px;font-size:13px;font-weight:800;color:#f9e060;letter-spacing:.5px;}
.btitle em{background:var(--green);color:var(--navy);padding:1px 6px;border-radius:4px;font-style:normal;margin-right:5px;font-size:11px;}
/* MATCH ROWS */
.mrow{display:flex;align-items:center;gap:5px;padding:6px 10px;border-bottom:1px solid #ffffff0a;cursor:pointer;transition:background .15s;font-size:11.5px;}
.mrow:hover{background:#ffffff0d;}
.mrow.played .mvs{opacity:0;width:0;}
.mnum{width:22px;color:#666;font-size:10px;font-weight:700;flex-shrink:0;}
.mtime{width:38px;color:#888;font-size:10px;flex-shrink:0;}
.mhome{flex:1;text-align:right;font-weight:700;color:#e8edf4;}
.mvs{width:20px;text-align:center;color:#555;flex-shrink:0;}
.maway{flex:1;font-weight:700;color:#e8edf4;}
.mscore{width:50px;text-align:center;font-weight:800;color:var(--green);font-size:12px;flex-shrink:0;}
/* STANDINGS */
.stng-wrap{padding:8px 10px;}
.stng-lbl{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#666;margin-bottom:4px;}
.stng{width:100%;border-collapse:collapse;font-size:11px;}
.stng th{color:#555;font-weight:700;font-size:9.5px;padding:3px 4px;text-align:center;border-bottom:1px solid #ffffff12;}
.stng th:nth-child(2){text-align:left;}
.stng td{padding:3px 4px;text-align:center;border-bottom:1px solid #ffffff08;}
.stng td:nth-child(2){text-align:left;}
.stng tr.juara td{color:var(--green);}
.rk{color:#555;font-size:10px;}
.tn{font-weight:700;font-size:11px;}
.pts{font-weight:800;color:#f9e060;}
/* KO SECTION */
.ko-sec{padding:6px 12px 16px;}
.ko-rtitle{font-size:11px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:.6px;padding:10px 0 6px;}
.ko-grid{display:grid;gap:8px;}
.ko-grid.qf{grid-template-columns:repeat(4,1fr);}
.ko-grid.sf{grid-template-columns:repeat(2,1fr);}
.ko-grid.bot{grid-template-columns:repeat(2,1fr);}
@media(max-width:900px){.ko-grid.qf{grid-template-columns:repeat(2,1fr);}}
@media(max-width:500px){.ko-grid.qf,.ko-grid.sf,.ko-grid.bot{grid-template-columns:1fr;}}
.ko-card{background:var(--card);border-radius:8px;overflow:hidden;cursor:pointer;border:1px solid #ffffff0d;transition:border-color .2s;}
.ko-card:hover{border-color:#ffffff22;}
.ko-card.final{border:2px solid #f9e060;}
.ko-hdr{background:var(--card2);padding:5px 10px;font-size:10px;font-weight:700;color:#aaa;text-align:center;}
.ko-card.final .ko-hdr{background:var(--gold);color:#1a1000;}
.ko-team{display:flex;align-items:center;padding:7px 10px;border-bottom:1px solid #ffffff08;gap:8px;}
.ko-team:last-child{border-bottom:none;}
.ko-team.win .ko-nm{color:var(--green);font-weight:800;}
.ko-nm{flex:1;font-size:12px;font-weight:600;}
.ko-sc{font-size:13px;font-weight:800;color:#f9e060;min-width:20px;text-align:right;}
/* MODAL */
.modal{display:none;position:fixed;inset:0;background:#00000088;z-index:200;align-items:center;justify-content:center;padding:16px;}
.modal.open{display:flex;}
.modal-box{background:var(--card);border-radius:12px;padding:20px;min-width:300px;max-width:90vw;}
.modal-title{font-size:14px;font-weight:800;color:#f9e060;margin-bottom:14px;}
.modal-teams{display:flex;align-items:center;gap:8px;margin-bottom:14px;font-weight:700;font-size:13px;}
.modal-vs{color:#555;font-size:12px;}
.modal-scores{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
.modal-scores label{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:3px;display:block;}
.modal-scores input{width:100%;padding:10px;background:#0d1b2e;border:1.5px solid #ffffff22;border-radius:6px;color:#fff;font-size:18px;font-weight:800;text-align:center;font-family:'Inter',sans-serif;}
.modal-scores input:focus{outline:none;border-color:var(--green);}
.modal-det{margin-bottom:14px;}
.modal-det label{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:3px;display:block;}
.modal-det input{width:100%;padding:8px;background:#0d1b2e;border:1.5px solid #ffffff22;border-radius:6px;color:#aaa;font-size:12px;font-family:'Inter',sans-serif;}
.modal-btns{display:flex;gap:8px;}
.modal-btns .btn{flex:1;padding:10px;font-size:13px;}
/* PODIUM */
.podium-wrap{padding:8px 12px 20px;}
.podium{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.pod{background:var(--card);border-radius:10px;padding:14px;text-align:center;border:1.5px solid #ffffff0d;}
.pod.gold{border-color:#f9e060;}
.pod.silver{border-color:#c0c0c0;}
.pod.bronze{border-color:#cd7f32;}
.pod-ico{font-size:24px;margin-bottom:4px;}
.pod-pos{font-size:9px;font-weight:800;color:#666;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}
.pod-name{font-size:13px;font-weight:700;color:#f9e060;min-height:20px;}
`

function groupBlockHTML(g: string): string {
  const teams = TEAMS[g]
  const rows = GMS[g]
    .map(
      m =>
        `<div class="mrow" id="mr-${m.id}" data-grp="${g}" data-mid="${m.id}"><span class="mnum">${m.id}</span><span class="mtime">${m.t}</span><span class="mhome">${teams[m.h]}</span><span class="mvs">vs</span><span class="maway">${teams[m.a]}</span><span class="mscore" id="sc-${m.id}"></span></div>`
    )
    .join('\n')
  const stRows = teams
    .map(
      (_, i) =>
        `<tr id="sr-${g}${i}"><td class="rk">${i + 1}</td><td class="tn" id="sn-${g}${i}"></td><td id="sm-${g}${i}"></td><td id="sw-${g}${i}"></td><td id="sd-${g}${i}"></td><td id="sl-${g}${i}"></td><td id="sgf-${g}${i}"></td><td id="sga-${g}${i}"></td><td id="ssg-${g}${i}"></td><td class="pts" id="sp-${g}${i}"></td></tr>`
    )
    .join('\n')
  return `
    <div class="block" id="block-${g}">
      <div class="btitle"><em>${g}</em> Grup ${g}</div>
      <div class="mlist" id="mlist-${g}">${rows}</div>
      <div class="stng-wrap">
        <div class="stng-lbl">Klasemen Grup ${g}</div>
        <table class="stng" id="stng-${g}">
          <thead><tr><th>#</th><th>Tim</th><th>M</th><th>W</th><th>S</th><th>K</th><th>MN</th><th>KM</th><th>SG</th><th>P</th></tr></thead>
          <tbody>${stRows}</tbody>
        </table>
      </div>
    </div>`
}

const BODY_HTML = `
<header class="hdr">
  <img src="/turnament/logo.png" alt="Zains"/>
  <div class="hdr-txt">
    <h1>Champions Cup #5</h1>
    <p>26 Juli 2026 &nbsp;&middot;&nbsp; Papan Skor Live &nbsp;&middot;&nbsp; @Zains Minisoccer Cibadak</p>
  </div>
  <div class="hdr-btns">
    <a class="btn btn-o" href="/turnamen">Ketentuan</a>
    <button class="btn btn-r" id="btn-reset">&#x21BA; Reset</button>
  </div>
</header>

<div class="sec-title">&#x1F4CB; Fase Grup &mdash; Kloter 1 &amp; 2</div>
<div class="grp-grid">
${GROUPS.map(groupBlockHTML).join('\n')}
</div>

<div class="sec-title">&#x26A1; Fase Gugur &mdash; Kloter 3</div>
<div class="ko-sec">
  <div class="ko-rtitle">&#x26A1; Perempat Final &middot; 14:00 &ndash; 14:45</div>
  <div class="ko-grid qf" id="qf-grid"></div>

  <div class="ko-rtitle">&#x1F3DF;&#xFE0F; Semi Final &middot; 15:00 &ndash; 15:15</div>
  <div class="ko-grid sf" id="sf-grid"></div>

  <div class="ko-grid bot" style="margin-top:10px;">
    <div>
      <div class="ko-rtitle">&#x1F949; Perebutan Juara 3 &middot; 15:30</div>
      <div id="p3-grid"></div>
    </div>
    <div>
      <div class="ko-rtitle">&#x1F3C6; Grand Final &middot; 15:45</div>
      <div id="final-grid"></div>
    </div>
  </div>
</div>

<div class="sec-title">&#x1F3C6; Podium</div>
<div class="podium-wrap">
  <div class="podium">
    <div class="pod silver"><div class="pod-ico">&#x1F948;</div><div class="pod-pos">Juara 2</div><div class="pod-name" id="pod2">&mdash;</div></div>
    <div class="pod gold"><div class="pod-ico">&#x1F3C6;</div><div class="pod-pos">Juara 1</div><div class="pod-name" id="pod1">&mdash;</div></div>
    <div class="pod bronze"><div class="pod-ico">&#x1F949;</div><div class="pod-pos">Juara 3</div><div class="pod-name" id="pod3">&mdash;</div></div>
  </div>
</div>

<div class="modal" id="modal">
  <div class="modal-box">
    <div class="modal-title" id="m-title"></div>
    <div class="modal-teams">
      <span id="m-home"></span>
      <span class="modal-vs">vs</span>
      <span id="m-away"></span>
    </div>
    <div class="modal-scores">
      <div><label id="m-lh"></label><input type="number" min="0" id="inp-h" placeholder="0"/></div>
      <div><label id="m-la"></label><input type="number" min="0" id="inp-a" placeholder="0"/></div>
    </div>
    <div class="modal-det"><label>Catatan (scorer, kartu, dll)</label><input type="text" id="inp-det" placeholder="opsional"/></div>
    <div class="modal-btns">
      <button class="btn btn-r" id="m-clear">Hapus</button>
      <button class="btn" style="background:#ffffff11;color:#aaa;" id="m-cancel">Batal</button>
      <button class="btn btn-g" id="m-save">Simpan</button>
    </div>
  </div>
</div>
`

export default function SkorPage() {
  useEffect(() => {
    // Listeners are scoped to this signal so a StrictMode remount re-wires cleanly.
    const ac = new AbortController()
    const { signal } = ac

    const SK = 'zcc5_scores'
    const DK = 'zcc5_details'

    interface Standing { i: number; n: string; mp: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }

    const load = (): Record<string, number> => {
      try { return JSON.parse(localStorage.getItem(SK) || '{}') as Record<string, number> } catch { return {} }
    }
    const loadD = (): Record<string, string> => {
      try { return JSON.parse(localStorage.getItem(DK) || '{}') as Record<string, string> } catch { return {} }
    }
    const persist = (s: Record<string, number>) => localStorage.setItem(SK, JSON.stringify(s))
    const persistD = (d: Record<string, string>) => localStorage.setItem(DK, JSON.stringify(d))

    const setText = (id: string, v: string) => {
      const el = document.getElementById(id)
      if (el) el.textContent = v
    }

    function calcSt(g: string): Standing[] {
      const T = TEAMS[g], M = GMS[g], s = load()
      const st: Standing[] = T.map((n, i) => ({ i, n, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }))
      M.forEach(m => {
        const sh = Number(s[m.id + 'H']), sa = Number(s[m.id + 'A'])
        if (s[m.id + 'H'] === undefined || s[m.id + 'A'] === undefined || isNaN(sh) || isNaN(sa)) return
        const hi = m.h, ai = m.a
        st[hi].mp++; st[ai].mp++
        st[hi].gf += sh; st[hi].ga += sa
        st[ai].gf += sa; st[ai].ga += sh
        if (sh > sa) { st[hi].w++; st[ai].l++; st[hi].pts += 3 }
        else if (sh < sa) { st[ai].w++; st[hi].l++; st[ai].pts += 3 }
        else { st[hi].d++; st[ai].d++; st[hi].pts++; st[ai].pts++ }
      })
      return st.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
    }

    const getJ = (g: string) => calcSt(g)[0].n

    function renderGrp(g: string) {
      const M = GMS[g], s = load()
      M.forEach(m => {
        const sh = s[m.id + 'H'], sa = s[m.id + 'A']
        const played = sh !== undefined && sa !== undefined
        setText('sc-' + m.id, played ? sh + ' : ' + sa : '')
        const row = document.getElementById('mr-' + m.id)
        if (row) {
          row.classList.toggle('played', played)
          const vs = row.querySelector('.mvs') as HTMLElement | null
          if (vs) vs.style.display = played ? 'none' : ''
        }
      })
      calcSt(g).forEach((t, i) => {
        const rk = document.getElementById('sr-' + g + i)
        if (!rk) return
        rk.className = i === 0 ? 'juara' : ''
        setText('sn-' + g + i, (i === 0 ? '👑 ' : '') + t.n)
        setText('sm-' + g + i, String(t.mp))
        setText('sw-' + g + i, String(t.w))
        setText('sd-' + g + i, String(t.d))
        setText('sl-' + g + i, String(t.l))
        setText('sgf-' + g + i, String(t.gf))
        setText('sga-' + g + i, String(t.ga))
        setText('ssg-' + g + i, (t.gf - t.ga >= 0 ? '+' : '') + (t.gf - t.ga))
        setText('sp-' + g + i, String(t.pts))
      })
    }

    function koSc(id: string) {
      const s = load()
      return { h: s[id + 'H'], a: s[id + 'A'] }
    }
    function koW(id: string, h: string, a: string) {
      const sc = koSc(id)
      if (sc.h === undefined || sc.a === undefined || sc.h === sc.a) return '?'
      return sc.h > sc.a ? h : a
    }
    function koL(id: string, h: string, a: string) {
      const sc = koSc(id)
      if (sc.h === undefined || sc.a === undefined || sc.h === sc.a) return '?'
      return sc.h < sc.a ? h : a
    }

    function mkKO(gridId: string, id: string, title: string, h: string, a: string, isFinal: boolean) {
      const el = document.getElementById(gridId)
      if (!el) return
      const sc = koSc(id)
      const played = sc.h !== undefined && sc.a !== undefined
      const hW = played && sc.h > sc.a, aW = played && sc.a > sc.h
      const div = document.createElement('div')
      div.className = 'ko-card' + (isFinal ? ' final' : '')
      div.addEventListener('click', () => openEditKO(id, h, a))
      div.innerHTML = `<div class="ko-hdr">${title}</div>
        <div class="ko-team ${hW ? 'win' : ''}"><span class="ko-nm">${h || '?'}</span><span class="ko-sc">${played ? sc.h : '—'}</span></div>
        <div class="ko-team ${aW ? 'win' : ''}"><span class="ko-nm">${a || '?'}</span><span class="ko-sc">${played ? sc.a : '—'}</span></div>`
      el.appendChild(div)
    }

    function updateKO() {
      const j: Record<string, string> = {}
      GROUPS.forEach(g => { j[g] = getJ(g) })
      ;['qf-grid', 'sf-grid', 'p3-grid', 'final-grid'].forEach(id => {
        const el = document.getElementById(id)
        if (el) el.innerHTML = ''
      })

      mkKO('qf-grid', 'QF1', 'QF 1 · 14:00', j.A, j.E, false)
      mkKO('qf-grid', 'QF2', 'QF 2 · 14:15', j.B, j.F, false)
      mkKO('qf-grid', 'QF3', 'QF 3 · 14:30', j.C, j.G, false)
      mkKO('qf-grid', 'QF4', 'QF 4 · 14:45', j.D, j.H, false)

      const wQF1 = koW('QF1', j.A, j.E), wQF2 = koW('QF2', j.B, j.F)
      const wQF3 = koW('QF3', j.C, j.G), wQF4 = koW('QF4', j.D, j.H)

      mkKO('sf-grid', 'SF1', 'SF-1 · 15:00', wQF1, wQF2, false)
      mkKO('sf-grid', 'SF2', 'SF-2 · 15:15', wQF3, wQF4, false)

      const wSF1 = koW('SF1', wQF1, wQF2), wSF2 = koW('SF2', wQF3, wQF4)
      const lSF1 = koL('SF1', wQF1, wQF2), lSF2 = koL('SF2', wQF3, wQF4)

      mkKO('p3-grid', 'P3', 'Juara 3 · 15:30', lSF1, lSF2, false)
      mkKO('final-grid', 'FIN', '🏆 Grand Final · 15:45', wSF1, wSF2, true)

      setText('pod1', koW('FIN', wSF1, wSF2) || '—')
      setText('pod2', koL('FIN', wSF1, wSF2) || '—')
      setText('pod3', koW('P3', lSF1, lSF2) || '—')
    }

    let curId = '', curG = '', curType = ''

    function fillModal(title: string, home: string, away: string) {
      const s = load(), d = loadD()
      setText('m-title', title)
      setText('m-home', home)
      setText('m-lh', home)
      setText('m-away', away)
      setText('m-la', away)
      ;(document.getElementById('inp-h') as HTMLInputElement).value = s[curId + 'H'] !== undefined ? String(s[curId + 'H']) : ''
      ;(document.getElementById('inp-a') as HTMLInputElement).value = s[curId + 'A'] !== undefined ? String(s[curId + 'A']) : ''
      ;(document.getElementById('inp-det') as HTMLInputElement).value = d[curId] || ''
      document.getElementById('modal')?.classList.add('open')
    }

    function openEdit(g: string, id: string) {
      const m = GMS[g].find(x => x.id === id)
      if (!m) return
      const T = TEAMS[g]
      curId = id; curG = g; curType = 'grp'
      fillModal(id + ' · ' + m.t, T[m.h], T[m.a])
    }

    function openEditKO(id: string, h: string, a: string) {
      curId = id; curG = ''; curType = 'ko'
      fillModal(id, h || '?', a || '?')
    }

    const closeModal = () => document.getElementById('modal')?.classList.remove('open')

    function saveEdit() {
      const s = load(), d = loadD()
      const vh = (document.getElementById('inp-h') as HTMLInputElement).value
      const va = (document.getElementById('inp-a') as HTMLInputElement).value
      const vd = (document.getElementById('inp-det') as HTMLInputElement).value
      if (vh !== '') s[curId + 'H'] = Number(vh); else delete s[curId + 'H']
      if (va !== '') s[curId + 'A'] = Number(va); else delete s[curId + 'A']
      if (vd) d[curId] = vd; else delete d[curId]
      persist(s); persistD(d)
      closeModal()
      if (curType === 'grp') renderGrp(curG)
      updateKO()
    }

    function clearEdit() {
      const s = load(), d = loadD()
      delete s[curId + 'H']; delete s[curId + 'A']; delete d[curId]
      persist(s); persistD(d)
      closeModal()
      if (curType === 'grp') renderGrp(curG)
      updateKO()
    }

    function resetAll() {
      if (!confirm('Reset semua skor?')) return
      localStorage.removeItem(SK); localStorage.removeItem(DK)
      init()
    }

    function init() {
      GROUPS.forEach(renderGrp)
      updateKO()
    }

    const onRowClick = (e: Event) => {
      const row = (e.target as HTMLElement).closest('.mrow') as HTMLElement | null
      if (!row || !row.dataset.grp || !row.dataset.mid) return
      openEdit(row.dataset.grp, row.dataset.mid)
    }

    document.addEventListener('click', onRowClick, { signal })
    document.getElementById('m-save')?.addEventListener('click', saveEdit, { signal })
    document.getElementById('m-clear')?.addEventListener('click', clearEdit, { signal })
    document.getElementById('m-cancel')?.addEventListener('click', closeModal, { signal })
    document.getElementById('btn-reset')?.addEventListener('click', resetAll, { signal })
    document.getElementById('modal')?.addEventListener('click', e => {
      if ((e.target as HTMLElement).id === 'modal') closeModal()
    }, { signal })

    init()

    return () => ac.abort()
  }, [])

  return (
    <div style={{ background: '#0d1b2e', minHeight: '100vh' }}>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </div>
  )
}
