'use client'
import { useEffect, useRef } from 'react'

const CSS = `
:root{
  --navy:#0d1b2e;--card:#1b2c42;--card2:#162338;
  --line:rgba(255,255,255,.08);--green:#00ff62;
  --muted:rgba(255,255,255,.5);
  --gold:linear-gradient(-20deg,#9f7521 11%,#f9e060 46%,#ffe87c 55%,#9f7521 82%);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:'Inter',sans-serif;background:var(--navy);color:#fff;font-size:14px;line-height:1.5;}

.navbar{position:sticky;top:0;z-index:100;background:rgba(13,27,46,.97);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);}
.nav-inner{max-width:1100px;margin:0 auto;padding:0 20px;height:54px;display:flex;align-items:center;justify-content:space-between;}
.nav-brand{display:flex;align-items:center;gap:10px;}
.nav-brand img{height:32px;}
.nav-title{font-size:15px;font-weight:900;background:var(--gold);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.nav-links{display:flex;gap:4px;}
.nav-links a{font-size:11px;font-weight:600;color:var(--muted);padding:5px 10px;border-radius:6px;text-decoration:none;}
.nav-links a:hover{background:var(--card);color:#fff;}
@media(max-width:600px){.nav-links{display:none;}}

.hero-strip{background:linear-gradient(-44deg,#00ffc3 0%,#00b8ff 35%,#1a00ff 70%);padding:28px 20px;text-align:center;}
.hero-strip h1{font-size:clamp(22px,5vw,36px);font-weight:900;text-transform:uppercase;background:linear-gradient(-20deg,#9f7521 11%,#f9e060 46%,#ffe87c 55%,#9f7521 82%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero-strip p{font-size:12px;color:rgba(255,255,255,.85);margin-top:4px;letter-spacing:2px;text-transform:uppercase;}

.wrap{max-width:1100px;margin:0 auto;padding:24px 20px 60px;}

.sec-title{display:flex;align-items:center;gap:12px;margin:36px 0 16px;padding-bottom:12px;border-bottom:2px solid rgba(0,255,98,.2);}
.sec-num{width:34px;height:34px;border-radius:50%;background:var(--green);color:var(--card);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0;}
.sec-title h2{font-size:clamp(15px,3vw,20px);font-weight:800;text-transform:uppercase;background:var(--gold);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.save-badge{margin-left:auto;font-size:11px;color:var(--green);opacity:0;transition:opacity .4s;}
.save-badge.show{opacity:1;}

.poin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;}
.poin-card{background:var(--card);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--line);}
.poin-card .res{font-size:11px;font-weight:800;text-transform:uppercase;margin-bottom:4px;}
.res.win{color:var(--green);}.res.draw{color:#f9e060;}.res.lose{color:rgba(255,255,255,.3);}
.poin-card .pts{font-size:34px;font-weight:900;line-height:1;background:var(--gold);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.pts-lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;}
.tb-list{list-style:none;counter-reset:tb;display:flex;flex-direction:column;gap:5px;margin-bottom:20px;}
.tb-list li{counter-increment:tb;display:flex;align-items:center;gap:10px;padding:7px 12px;background:rgba(255,255,255,.03);border-radius:7px;font-size:12px;color:rgba(255,255,255,.8);}
.tb-list li::before{content:counter(tb);background:var(--green);color:var(--card);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0;}

.group-area{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;}
@media(max-width:660px){.group-area{grid-template-columns:1fr;}}

.group-block{background:var(--card);border-radius:14px;border:1px solid var(--line);overflow:hidden;}
.group-hdr{background:var(--card2);padding:10px 14px;display:flex;align-items:center;gap:8px;}
.g-badge{background:var(--green);color:var(--card);font-size:11px;font-weight:900;padding:3px 10px;border-radius:20px;text-transform:uppercase;}
.g-kloter{font-size:10px;color:var(--muted);}

.match-list{padding:8px 10px;display:flex;flex-direction:column;gap:4px;}
.match-card{background:rgba(255,255,255,.03);border-radius:9px;overflow:hidden;border:1px solid rgba(255,255,255,.06);}
.match-score-row{display:grid;grid-template-columns:1fr 34px 36px 34px 1fr auto;align-items:center;gap:4px;padding:7px 8px;}
.m-team{font-size:11px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.m-team.home{text-align:right;}.m-team.away{text-align:left;}
.m-time{font-size:9px;color:var(--muted);text-align:center;}
.score-input{width:34px;height:30px;background:var(--navy);border:1px solid rgba(255,255,255,.12);border-radius:6px;color:#fff;font-size:14px;font-weight:700;text-align:center;outline:none;-moz-appearance:textfield;}
.score-input::-webkit-outer-spin-button,.score-input::-webkit-inner-spin-button{-webkit-appearance:none;}
.score-input:focus{border-color:var(--green);}
.score-input.filled{border-color:rgba(0,255,98,.35);background:rgba(0,255,98,.04);}
.detail-toggle{background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:4px 6px;border-radius:6px;line-height:1;}
.detail-toggle:hover{background:rgba(255,255,255,.07);color:#fff;}
.detail-toggle.open{color:var(--green);}

.match-detail{display:none;padding:10px 12px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.15);}
.match-detail.open{display:block;}
.detail-section{margin-bottom:10px;}
.detail-section:last-child{margin-bottom:0;}
.detail-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;display:flex;align-items:center;gap:6px;}
.detail-label.goals{color:#00ff62;}
.detail-label.yellow{color:#ffd700;}
.detail-label.red{color:#ff5555;}
.event-list{display:flex;flex-direction:column;gap:4px;margin-bottom:6px;}
.event-item{display:flex;align-items:center;gap:6px;padding:5px 8px;background:rgba(255,255,255,.04);border-radius:6px;font-size:11px;}
.event-item .ev-icon{font-size:12px;flex-shrink:0;}
.event-item .ev-name{flex:1;color:#fff;font-weight:600;}
.event-item .ev-team{color:var(--muted);font-size:10px;}
.event-item .ev-del{background:none;border:none;color:rgba(255,60,60,.5);cursor:pointer;font-size:14px;padding:0 2px;line-height:1;}
.event-item .ev-del:hover{color:#ff5555;}
.add-event-row{display:grid;grid-template-columns:1fr 1fr auto;gap:5px;}
.add-event-row input,.add-event-row select{background:var(--navy);border:1px solid rgba(255,255,255,.12);border-radius:6px;color:#fff;font-size:11px;padding:5px 8px;outline:none;font-family:inherit;}
.add-event-row input::placeholder{color:var(--muted);}
.add-event-row input:focus,.add-event-row select:focus{border-color:var(--green);}
.add-event-row select option{background:var(--navy);}
.btn-add{background:rgba(0,255,98,.1);border:1px solid rgba(0,255,98,.25);color:var(--green);font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;}
.btn-add:hover{background:rgba(0,255,98,.2);}
.btn-add.yellow-btn{background:rgba(255,215,0,.1);border-color:rgba(255,215,0,.25);color:#ffd700;}
.btn-add.yellow-btn:hover{background:rgba(255,215,0,.2);}
.btn-add.red-btn{background:rgba(255,60,60,.1);border-color:rgba(255,60,60,.25);color:#ff5555;}
.btn-add.red-btn:hover{background:rgba(255,60,60,.2);}

hr.divider{border:none;border-top:1px solid var(--line);margin:4px 0;}
.standings-table{width:100%;border-collapse:collapse;font-size:11px;}
.standings-table thead tr{background:rgba(0,0,0,.25);}
.standings-table th{padding:6px 5px;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;color:var(--green);}
.standings-table th.nm{text-align:left;padding-left:8px;}
.standings-table td{padding:6px 5px;text-align:center;border-top:1px solid rgba(255,255,255,.04);color:rgba(255,255,255,.8);}
.standings-table td.nm{text-align:left;padding-left:8px;font-weight:600;color:#fff;font-size:11px;}
.standings-table tr.qualify td{background:rgba(0,255,98,.05);}
.standings-table tr.qualify td.nm::after{content:" ✓";color:var(--green);font-size:9px;}
.rank-b{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:9px;font-weight:700;}
.rank-b.r1{background:rgba(255,215,0,.2);color:#ffd700;}
.rank-b.r2{background:rgba(192,192,192,.2);color:#ccc;}
.rank-b.r3,.rank-b.r4{background:rgba(255,255,255,.06);color:var(--muted);}

.ko-section{margin-bottom:20px;}
.ko-lbl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;}
.ko-grid{display:grid;gap:10px;}
.ko-grid.two{grid-template-columns:1fr 1fr;}
.ko-grid.one{grid-template-columns:1fr 1fr;}
@media(max-width:500px){.ko-grid.two,.ko-grid.one{grid-template-columns:1fr;}}
.ko-match{background:var(--card);border-radius:12px;border:1px solid var(--line);overflow:hidden;}
.ko-match.is-final{border-color:rgba(249,224,96,.3);}
.ko-hdr{background:var(--card2);padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--green);}
.ko-match.is-final .ko-hdr{background:rgba(249,224,96,.07);color:#f9e060;}
.ko-teams{padding:8px 10px;display:grid;grid-template-columns:1fr 32px 28px 32px 1fr;align-items:center;gap:4px;}
.ko-team{font-size:11px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ko-team.home{text-align:right;}.ko-team.away{text-align:left;}
.ko-team.tbd{color:var(--muted);font-style:italic;font-weight:400;font-size:10px;}
.ko-vs{font-size:9px;color:var(--muted);text-align:center;}
.ko-score{width:32px;height:28px;background:var(--navy);border:1px solid rgba(255,255,255,.12);border-radius:6px;color:#fff;font-size:13px;font-weight:700;text-align:center;outline:none;-moz-appearance:textfield;}
.ko-score::-webkit-outer-spin-button,.ko-score::-webkit-inner-spin-button{-webkit-appearance:none;}
.ko-score:focus{border-color:#f9e060;}
.ko-score.filled{border-color:rgba(249,224,96,.4);background:rgba(249,224,96,.04);}
.ko-winner{text-align:center;padding:5px 8px;font-size:10px;font-weight:700;color:var(--green);background:rgba(0,255,98,.07);border-top:1px solid rgba(0,255,98,.1);}
.ko-winner.gold{color:#f9e060;background:rgba(249,224,96,.07);border-color:rgba(249,224,96,.12);}

.stats-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
@media(max-width:700px){.stats-grid{grid-template-columns:1fr;}}
.stat-block{background:var(--card);border-radius:14px;border:1px solid var(--line);overflow:hidden;}
.stat-hdr{background:var(--card2);padding:10px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:8px;}
.stat-hdr.goals{color:var(--green);}
.stat-hdr.yellow{color:#ffd700;}
.stat-hdr.red{color:#ff5555;}
.stat-list{padding:8px;}
.stat-row{display:flex;align-items:center;gap:8px;padding:7px 8px;background:rgba(255,255,255,.03);border-radius:7px;margin-bottom:4px;}
.stat-row:last-child{margin-bottom:0;}
.stat-rank{font-size:10px;font-weight:700;color:var(--muted);min-width:16px;text-align:center;}
.stat-rank.top{color:#ffd700;}
.stat-name{flex:1;font-size:12px;font-weight:600;color:#fff;}
.stat-team{font-size:10px;color:var(--muted);}
.stat-count{font-size:16px;font-weight:900;min-width:24px;text-align:right;}
.stat-count.goals{color:var(--green);}
.stat-count.yellow{color:#ffd700;}
.stat-count.red{color:#ff5555;}
.stat-empty{padding:12px;text-align:center;font-size:12px;color:var(--muted);}
.suspended-badge{font-size:9px;background:rgba(255,100,0,.2);color:#ff8c00;padding:2px 6px;border-radius:4px;font-weight:700;}

.btn-reset{background:rgba(255,60,60,.1);border:1px solid rgba(255,60,60,.2);color:#ff7070;font-size:12px;font-weight:600;padding:8px 18px;border-radius:8px;cursor:pointer;margin-top:24px;}
.btn-reset:hover{background:rgba(255,60,60,.2);}

footer{background:var(--card2);border-top:1px solid var(--line);padding:24px 20px;text-align:center;}
.foot-copy{font-size:11px;color:rgba(255,255,255,.2);}
`

const BODY_HTML = `
<nav class="navbar">
  <div class="nav-inner">
    <div class="nav-brand">
      <img src="/turnament/logo.png" alt="Zains"/>
      <span class="nav-title">Papan Skor</span>
    </div>
    <div class="nav-links">
      <a href="/turnamen">Ketentuan</a>
      <a href="#fase-grup">Fase Grup</a>
      <a href="#knockout">Fase Gugur</a>
      <a href="#statistik">Statistik</a>
    </div>
  </div>
</nav>

<div class="hero-strip">
  <h1>Champions Cup #3</h1>
  <p>Papan Skor &amp; Statistik &middot; 31 Mei 2026 &middot; Pukul 09:00 WIB</p>
</div>

<div class="wrap">

<div class="sec-title">
  <div class="sec-num">1</div>
  <h2>Format Penilaian</h2>
</div>
<div class="poin-grid">
  <div class="poin-card"><div class="res win">Menang</div><div class="pts">3</div><div class="pts-lbl">Poin</div></div>
  <div class="poin-card"><div class="res draw">Seri</div><div class="pts">1</div><div class="pts-lbl">Poin</div></div>
  <div class="poin-card"><div class="res lose">Kalah</div><div class="pts">0</div><div class="pts-lbl">Poin</div></div>
</div>
<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px;">Tiebreaker</p>
<ol class="tb-list">
  <li>Total poin terbanyak</li>
  <li>Selisih gol (Goal Difference)</li>
  <li>Total gol dicetak</li>
  <li>Head-to-head</li>
  <li>Adu penalti</li>
</ol>
<p style="font-size:11px;color:var(--muted);margin-bottom:4px;">&#x2705; Lolos = Juara &amp; Runner-up tiap grup &nbsp;&middot;&nbsp; &#x1F7E8;&times;2 = Skors 1 pertandingan &nbsp;&middot;&nbsp; &#x1F7E5; = Skors 1 pertandingan berikutnya</p>

<div class="sec-title" id="fase-grup">
  <div class="sec-num">2</div>
  <h2>Fase Grup</h2>
  <span id="save-badge" class="save-badge">Tersimpan &#x2713;</span>
</div>

<div class="group-area">
  <div class="group-block" id="block-A">
    <div class="group-hdr"><span class="g-badge">Grup A</span><span class="g-kloter">Kloter 1 &middot; 09:00&ndash;12:00</span></div>
    <div class="match-list" id="matches-A"></div>
    <hr class="divider"/>
    <table class="standings-table" id="table-A">
      <thead><tr><th></th><th class="nm">Tim</th><th>M</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <div class="group-block" id="block-B">
    <div class="group-hdr"><span class="g-badge">Grup B</span><span class="g-kloter">Kloter 1 &middot; 09:00&ndash;12:00</span></div>
    <div class="match-list" id="matches-B"></div>
    <hr class="divider"/>
    <table class="standings-table" id="table-B">
      <thead><tr><th></th><th class="nm">Tim</th><th>M</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <div class="group-block" id="block-C">
    <div class="group-hdr"><span class="g-badge">Grup C</span><span class="g-kloter">Kloter 2 &middot; 12:30&ndash;15:30</span></div>
    <div class="match-list" id="matches-C"></div>
    <hr class="divider"/>
    <table class="standings-table" id="table-C">
      <thead><tr><th></th><th class="nm">Tim</th><th>M</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <div class="group-block" id="block-D">
    <div class="group-hdr"><span class="g-badge">Grup D</span><span class="g-kloter">Kloter 2 &middot; 12:30&ndash;15:30</span></div>
    <div class="match-list" id="matches-D"></div>
    <hr class="divider"/>
    <table class="standings-table" id="table-D">
      <thead><tr><th></th><th class="nm">Tim</th><th>M</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
</div>

<div class="sec-title" id="knockout">
  <div class="sec-num">3</div>
  <h2>Fase Gugur</h2>
</div>
<p style="font-size:11px;color:var(--muted);margin-bottom:16px;">Tim otomatis terisi dari klasemen grup.</p>

<div class="ko-section">
  <div class="ko-lbl">&#x26A1; Perempat Final &mdash; 15:45&ndash;16:45</div>
  <div class="ko-grid two" id="qf-grid"></div>
</div>
<div class="ko-section">
  <div class="ko-lbl">&#x1F525; Semi Final &mdash; 16:45&ndash;17:15</div>
  <div class="ko-grid two" id="sf-grid"></div>
</div>
<div class="ko-section">
  <div class="ko-lbl">&#x1F949; Perebutan Juara 3 &mdash; 17:15&ndash;17:30</div>
  <div class="ko-grid one" id="p3-grid"></div>
</div>
<div class="ko-section">
  <div class="ko-lbl">&#x1F3C6; Grand Final &mdash; 17:30&ndash;17:45</div>
  <div class="ko-grid one" id="final-grid"></div>
</div>

<div class="sec-title" id="statistik">
  <div class="sec-num">4</div>
  <h2>Statistik Pemain</h2>
</div>
<div class="stats-grid">
  <div class="stat-block">
    <div class="stat-hdr goals">&#x26BD; Top Pencetak Gol</div>
    <div class="stat-list" id="stat-goals"></div>
  </div>
  <div class="stat-block">
    <div class="stat-hdr yellow">&#x1F7E8; Kartu Kuning</div>
    <div class="stat-list" id="stat-yellow"></div>
  </div>
  <div class="stat-block">
    <div class="stat-hdr red">&#x1F7E5; Kartu Merah</div>
    <div class="stat-list" id="stat-red"></div>
  </div>
</div>

<button class="btn-reset" id="btn-reset-all">&#x1F5D1; Reset Semua Data</button>

</div>

<footer><div class="foot-copy">&copy; 2026 Zains Minisoccer Cibadak &middot; Champions Cup #3</div></footer>
`

export default function SkorPage() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    interface MatchData { id: string; home: number; away: number; time: string }
    interface TeamEvent { name: string; team: string }
    interface MatchDetail { goals: TeamEvent[]; yellow: TeamEvent[]; red: TeamEvent[] }
    interface StandingRow { name: string; mp: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number }

    const TEAMS: Record<string, string[]> = {
      A: ['BARUDAK WELL', 'PELANGI FC', 'X-BER FC', 'MT FC'],
      B: ['WARKAS FC', 'STAR LEN YHS', 'SENANTA FC', 'CIKIWUL'],
      C: ['BAS FC', 'TIM AAA', 'RSUD PALABUHANRATU FC', 'CTY ORI'],
      D: ['SOBAT IYAN FC', 'PAKIDULAN FC', 'JMJ', 'NYALSE FC']
    }
    const GROUP_MATCHES: Record<string, MatchData[]> = {
      A: [{id:'A1',home:0,away:1,time:'09:00'},{id:'A2',home:2,away:3,time:'09:15'},{id:'A3',home:0,away:2,time:'10:00'},{id:'A4',home:1,away:3,time:'10:15'},{id:'A5',home:1,away:2,time:'11:00'},{id:'A6',home:0,away:3,time:'11:15'}],
      B: [{id:'B1',home:0,away:1,time:'09:30'},{id:'B2',home:2,away:3,time:'09:45'},{id:'B3',home:0,away:2,time:'10:30'},{id:'B4',home:1,away:3,time:'10:45'},{id:'B5',home:1,away:2,time:'11:30'},{id:'B6',home:0,away:3,time:'11:45'}],
      C: [{id:'C1',home:0,away:1,time:'12:30'},{id:'C2',home:2,away:3,time:'12:45'},{id:'C3',home:0,away:2,time:'13:30'},{id:'C4',home:1,away:3,time:'13:45'},{id:'C5',home:1,away:2,time:'14:30'},{id:'C6',home:0,away:3,time:'14:45'}],
      D: [{id:'D1',home:0,away:1,time:'13:00'},{id:'D2',home:2,away:3,time:'13:15'},{id:'D3',home:0,away:2,time:'14:00'},{id:'D4',home:1,away:3,time:'14:15'},{id:'D5',home:1,away:2,time:'15:00'},{id:'D6',home:0,away:3,time:'15:15'}]
    }
    const KO_MATCHES = ['QF1', 'QF2', 'QF3', 'QF4', 'SF1', 'SF2', 'P3', 'FIN']

    let scores: Record<string, number> = {}
    let details: Record<string, MatchDetail> = {}

    function load() {
      try { scores = JSON.parse(localStorage.getItem('zcc3_scores') || '{}') as Record<string, number> } catch { scores = {} }
      try { details = JSON.parse(localStorage.getItem('zcc3_details') || '{}') as Record<string, MatchDetail> } catch { details = {} }
    }

    function save() {
      localStorage.setItem('zcc3_scores', JSON.stringify(scores))
      localStorage.setItem('zcc3_details', JSON.stringify(details))
      const b = document.getElementById('save-badge')
      if (!b) return
      b.classList.add('show')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clearTimeout((b as any)._t)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(b as any)._t = setTimeout(() => b.classList.remove('show'), 1400)
    }

    function resetAll() {
      if (!confirm('Reset semua data? Tidak bisa dikembalikan.')) return
      scores = {}
      details = {}
      localStorage.removeItem('zcc3_scores')
      localStorage.removeItem('zcc3_details')
      init()
    }

    function getDetail(mid: string): MatchDetail {
      if (!details[mid]) details[mid] = { goals: [], yellow: [], red: [] }
      return details[mid]
    }

    function hasDetail(mid: string): boolean {
      const d = details[mid]
      return !!(d && (d.goals.length || d.yellow.length || d.red.length))
    }

    function renderDetailHTML(mid: string, ht: string, at: string): string {
      const d = getDetail(mid)
      const teamOpts = `<option value="${ht}">${ht}</option><option value="${at}">${at}</option>`
      const goalList = d.goals.map((g, i) => `<div class="event-item"><span class="ev-icon">&#x26BD;</span><span class="ev-name">${g.name}</span><span class="ev-team">${g.team}</span><button class="ev-del" data-type="goals" data-mid="${mid}" data-i="${i}">&times;</button></div>`).join('')
      const yelList = d.yellow.map((g, i) => `<div class="event-item"><span class="ev-icon">&#x1F7E8;</span><span class="ev-name">${g.name}</span><span class="ev-team">${g.team}</span><button class="ev-del" data-type="yellow" data-mid="${mid}" data-i="${i}">&times;</button></div>`).join('')
      const redList = d.red.map((g, i) => `<div class="event-item"><span class="ev-icon">&#x1F7E5;</span><span class="ev-name">${g.name}</span><span class="ev-team">${g.team}</span><button class="ev-del" data-type="red" data-mid="${mid}" data-i="${i}">&times;</button></div>`).join('')
      return `
        <div class="detail-section">
          <div class="detail-label goals">&#x26BD; Pencetak Gol</div>
          <div class="event-list" id="ev-goals-${mid}">${goalList}</div>
          <div class="add-event-row">
            <input type="text" placeholder="Nama pemain" id="inp-goal-name-${mid}"/>
            <select id="inp-goal-team-${mid}">${teamOpts}</select>
            <button class="btn-add" data-type="goals" data-mid="${mid}">+ Tambah</button>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label yellow">&#x1F7E8; Kartu Kuning</div>
          <div class="event-list" id="ev-yellow-${mid}">${yelList}</div>
          <div class="add-event-row">
            <input type="text" placeholder="Nama pemain" id="inp-yellow-name-${mid}"/>
            <select id="inp-yellow-team-${mid}">${teamOpts}</select>
            <button class="btn-add yellow-btn" data-type="yellow" data-mid="${mid}">+ Tambah</button>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-label red">&#x1F7E5; Kartu Merah</div>
          <div class="event-list" id="ev-red-${mid}">${redList}</div>
          <div class="add-event-row">
            <input type="text" placeholder="Nama pemain" id="inp-red-name-${mid}"/>
            <select id="inp-red-team-${mid}">${teamOpts}</select>
            <button class="btn-add red-btn" data-type="red" data-mid="${mid}">+ Tambah</button>
          </div>
        </div>`
    }

    function bindDetailEvents(grp: string) {
      const container = document.getElementById('matches-' + grp)
      if (!container) return

      container.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', function (this: HTMLButtonElement) {
          const type = this.dataset.type as keyof MatchDetail
          const mid = this.dataset.mid!
          const nameEl = document.getElementById(`inp-${type}-name-${mid}`) as HTMLInputElement | null
          const teamEl = document.getElementById(`inp-${type}-team-${mid}`) as HTMLSelectElement | null
          if (!nameEl || !teamEl) return
          const name = nameEl.value.trim()
          if (!name) return
          getDetail(mid)[type].push({ name, team: teamEl.value })
          nameEl.value = ''
          save()
          refreshDetailPanel(mid, grp)
          updateStats()
        })
      })

      container.querySelectorAll('.ev-del').forEach(btn => {
        btn.addEventListener('click', function (this: HTMLButtonElement) {
          const type = this.dataset.type as keyof MatchDetail
          const mid = this.dataset.mid!
          const i = parseInt(this.dataset.i!)
          getDetail(mid)[type].splice(i, 1)
          save()
          refreshDetailPanel(mid, grp)
          updateStats()
        })
      })
    }

    function refreshDetailPanel(mid: string, grp: string) {
      let ht = '', at = ''
      for (const [g, arr] of Object.entries(GROUP_MATCHES)) {
        const m = arr.find(x => x.id === mid)
        if (m) { ht = TEAMS[g][m.home]; at = TEAMS[g][m.away]; break }
      }
      const panel = document.getElementById('detail-' + mid)
      if (!panel) return
      const wasOpen = panel.classList.contains('open')
      panel.innerHTML = renderDetailHTML(mid, ht, at)
      if (wasOpen) panel.classList.add('open')
      const toggle = panel.closest('.match-card')?.querySelector('.detail-toggle')
      if (toggle) toggle.classList.toggle('open', hasDetail(mid) || wasOpen)
      bindDetailEvents(grp)
    }

    function renderMatches(grp: string) {
      const teams = TEAMS[grp]
      const container = document.getElementById('matches-' + grp)
      if (!container) return
      container.innerHTML = ''
      GROUP_MATCHES[grp].forEach(m => {
        const ht = teams[m.home], at = teams[m.away]
        const hs = scores[m.id + 'h'], as_ = scores[m.id + 'a']
        const hf = hs !== undefined, af = as_ !== undefined

        const card = document.createElement('div')
        card.className = 'match-card'
        card.innerHTML = `
          <div class="match-score-row">
            <span class="m-team home" title="${ht}">${ht}</span>
            <input class="score-input${hf ? ' filled' : ''}" type="number" min="0" max="99" data-id="${m.id}h" value="${hf ? hs : ''}" placeholder="-"/>
            <span class="m-time">${m.time}</span>
            <input class="score-input${af ? ' filled' : ''}" type="number" min="0" max="99" data-id="${m.id}a" value="${af ? as_ : ''}" placeholder="-"/>
            <span class="m-team away" title="${at}">${at}</span>
            <button class="detail-toggle${hasDetail(m.id) ? ' open' : ''}" data-mid="${m.id}" title="Detail">&#x1F4CB;</button>
          </div>
          <div class="match-detail${hasDetail(m.id) ? ' open' : ''}" id="detail-${m.id}">
            ${renderDetailHTML(m.id, ht, at)}
          </div>`
        container.appendChild(card)
      })

      container.querySelectorAll('.score-input').forEach(inp => {
        inp.addEventListener('input', function (this: HTMLInputElement) {
          const id = this.dataset.id!
          const v = this.value.trim()
          if (v === '') { delete scores[id]; this.classList.remove('filled') }
          else { scores[id] = parseInt(v); this.classList.add('filled') }
          save(); updateStandings(grp); updateKnockout(); updateStats()
        })
      })

      container.querySelectorAll('.detail-toggle').forEach(btn => {
        btn.addEventListener('click', function (this: HTMLButtonElement) {
          const mid = this.dataset.mid!
          const panel = document.getElementById('detail-' + mid)
          if (!panel) return
          const open = panel.classList.toggle('open')
          this.classList.toggle('open', open)
        })
      })

      bindDetailEvents(grp)
    }

    function calcStandings(grp: string): StandingRow[] {
      const teams = TEAMS[grp]
      const st: StandingRow[] = teams.map(t => ({ name: t, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }))
      GROUP_MATCHES[grp].forEach(m => {
        const hs = scores[m.id + 'h'], as_ = scores[m.id + 'a']
        if (hs === undefined || as_ === undefined) return
        const h = hs, a = as_
        if (isNaN(h) || isNaN(a)) return
        const hi = m.home, ai = m.away
        st[hi].mp++; st[ai].mp++
        st[hi].gf += h; st[hi].ga += a; st[hi].gd += h - a
        st[ai].gf += a; st[ai].ga += h; st[ai].gd += a - h
        if (h > a) { st[hi].w++; st[hi].pts += 3; st[ai].l++ }
        else if (h < a) { st[ai].w++; st[ai].pts += 3; st[hi].l++ }
        else { st[hi].d++; st[hi].pts++; st[ai].d++; st[ai].pts++ }
      })
      st.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      return st
    }

    function updateStandings(grp: string) {
      const tbody = document.querySelector('#table-' + grp + ' tbody')
      if (!tbody) return
      const st = calcStandings(grp)
      tbody.innerHTML = ''
      st.forEach((s, i) => {
        const q = i < 2
        const tr = document.createElement('tr')
        if (q) tr.className = 'qualify'
        tr.innerHTML = `<td><span class="rank-b r${i + 1}">${i + 1}</span></td><td class="nm">${s.name}</td><td>${s.mp}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td><td>${s.gf}</td><td>${s.ga}</td><td style="color:${s.gd > 0 ? 'var(--green)' : s.gd < 0 ? '#ff7070' : 'rgba(255,255,255,.5)'}">${s.gd > 0 ? '+' : ''}${s.gd}</td><td style="font-weight:800;color:#fff">${s.pts}</td>`
        tbody.appendChild(tr)
      })
    }

    function getTop(grp: string): [string, string] {
      const s = calcStandings(grp)
      return [s[0]?.name || '?', s[1]?.name || '?']
    }

    function koWin(id: string, h: string, a: string): string {
      const hs = scores[id + 'h'], as_ = scores[id + 'a']
      if (hs === undefined || as_ === undefined) return '?'
      const hi = hs, ai = as_
      if (isNaN(hi) || isNaN(ai)) return '?'
      if (hi > ai) return h; if (ai > hi) return a; return h + ' / ' + a + ' (pen)'
    }

    function koLose(id: string, h: string, a: string): string {
      const hs = scores[id + 'h'], as_ = scores[id + 'a']
      if (hs === undefined || as_ === undefined) return '?'
      const hi = hs, ai = as_
      if (isNaN(hi) || isNaN(ai)) return '?'
      if (hi > ai) return a; if (ai > hi) return h; return h + ' / ' + a + ' (pen)'
    }

    function mkKO(containerId: string, id: string, label: string, h: string, a: string, isFinal: boolean) {
      const el = document.getElementById(containerId)
      if (!el) return
      const hs = scores[id + 'h'], as_ = scores[id + 'a']
      const hf = hs !== undefined, af = as_ !== undefined
      const hTbd = !h || h === '?', aTbd = !a || a === '?'
      let winner = ''
      if (hf && af) {
        const hi = hs!, ai = as_!
        if (hi > ai) winner = h; else if (ai > hi) winner = a; else winner = h + ' / ' + a + ' (adu penalti)'
      }
      const d = document.createElement('div')
      d.className = 'ko-match' + (isFinal ? ' is-final' : '')
      d.innerHTML = `
        <div class="ko-hdr">${label}</div>
        <div class="ko-teams">
          <span class="ko-team home${hTbd ? ' tbd' : ''}">${hTbd ? 'TBD' : h}</span>
          <input class="ko-score${hf ? ' filled' : ''}" type="number" min="0" max="99" data-id="${id}h" value="${hf ? hs : ''}" placeholder="-" ${hTbd || aTbd ? 'disabled' : ''}/>
          <span class="ko-vs">vs</span>
          <input class="ko-score${af ? ' filled' : ''}" type="number" min="0" max="99" data-id="${id}a" value="${af ? as_ : ''}" placeholder="-" ${hTbd || aTbd ? 'disabled' : ''}/>
          <span class="ko-team away${aTbd ? ' tbd' : ''}">${aTbd ? 'TBD' : a}</span>
        </div>
        ${winner ? `<div class="ko-winner${isFinal ? ' gold' : ''}">${isFinal ? '&#x1F947; Juara 1: ' : ' Pemenang: '}${winner}</div>` : ''}`
      el.appendChild(d)
      d.querySelectorAll('.ko-score').forEach(inp => {
        inp.addEventListener('input', function (this: HTMLInputElement) {
          const key = this.dataset.id!
          const v = this.value.trim()
          if (v === '') { delete scores[key]; this.classList.remove('filled') }
          else { scores[key] = parseInt(v); this.classList.add('filled') }
          save(); updateKnockout(); updateStats()
        })
      })
    }

    function updateKnockout() {
      const [jA, ruA] = getTop('A'), [jB, ruB] = getTop('B'), [jC, ruC] = getTop('C'), [jD, ruD] = getTop('D')
      const qfEl = document.getElementById('qf-grid')
      if (qfEl) qfEl.innerHTML = ''
      mkKO('qf-grid', 'QF1', 'QF-1 &middot; 15:45', jA, ruB, false)
      mkKO('qf-grid', 'QF2', 'QF-2 &middot; 16:00', jB, ruA, false)
      mkKO('qf-grid', 'QF3', 'QF-3 &middot; 16:15', jC, ruD, false)
      mkKO('qf-grid', 'QF4', 'QF-4 &middot; 16:30', jD, ruC, false)
      const wQF1 = koWin('QF1', jA, ruB), wQF2 = koWin('QF2', jB, ruA), wQF3 = koWin('QF3', jC, ruD), wQF4 = koWin('QF4', jD, ruC)
      const sfEl = document.getElementById('sf-grid')
      if (sfEl) sfEl.innerHTML = ''
      mkKO('sf-grid', 'SF1', 'SF-1 &middot; 16:45', wQF1, wQF4, false)
      mkKO('sf-grid', 'SF2', 'SF-2 &middot; 17:00', wQF2, wQF3, false)
      const wSF1 = koWin('SF1', wQF1, wQF4), wSF2 = koWin('SF2', wQF2, wQF3)
      const lSF1 = koLose('SF1', wQF1, wQF4), lSF2 = koLose('SF2', wQF2, wQF3)
      const p3El = document.getElementById('p3-grid')
      if (p3El) p3El.innerHTML = ''
      mkKO('p3-grid', 'P3', 'Juara 3 &middot; 17:15', lSF1, lSF2, false)
      const finEl = document.getElementById('final-grid')
      if (finEl) finEl.innerHTML = ''
      mkKO('final-grid', 'FIN', '&#x1F3C6; Grand Final &middot; 17:30', wSF1, wSF2, true)
    }

    function updateStats() {
      const goals: Record<string, { name: string; team: string; count: number }> = {}
      const yellow: Record<string, { name: string; team: string; count: number }> = {}
      const red: Record<string, { name: string; team: string; count: number }> = {}

      const allMatches = Object.values(GROUP_MATCHES).flat()
      allMatches.forEach(m => {
        const d = details[m.id]
        if (!d) return
        d.goals.forEach(g => { const k = g.name + '|' + g.team; if (!goals[k]) goals[k] = { name: g.name, team: g.team, count: 0 }; goals[k].count++ })
        d.yellow.forEach(g => { const k = g.name + '|' + g.team; if (!yellow[k]) yellow[k] = { name: g.name, team: g.team, count: 0 }; yellow[k].count++ })
        d.red.forEach(g => { const k = g.name + '|' + g.team; if (!red[k]) red[k] = { name: g.name, team: g.team, count: 0 }; red[k].count++ })
      })
      KO_MATCHES.forEach(id => {
        const d = details[id]
        if (!d) return
        d.goals.forEach(g => { const k = g.name + '|' + g.team; if (!goals[k]) goals[k] = { name: g.name, team: g.team, count: 0 }; goals[k].count++ })
        d.yellow.forEach(g => { const k = g.name + '|' + g.team; if (!yellow[k]) yellow[k] = { name: g.name, team: g.team, count: 0 }; yellow[k].count++ })
        d.red.forEach(g => { const k = g.name + '|' + g.team; if (!red[k]) red[k] = { name: g.name, team: g.team, count: 0 }; red[k].count++ })
      })

      const renderList = (containerId: string, data: Record<string, { name: string; team: string; count: number }>, type: string) => {
        const el = document.getElementById(containerId)
        if (!el) return
        const items = Object.values(data).sort((a, b) => b.count - a.count)
        if (!items.length) { el.innerHTML = '<div class="stat-empty">Belum ada data</div>'; return }
        el.innerHTML = items.map((s, i) => {
          const suspended = type === 'yellow' && s.count >= 2
          return `<div class="stat-row">
            <span class="stat-rank${i === 0 ? ' top' : ''}">${i + 1}</span>
            <div style="flex:1"><div class="stat-name">${s.name}${suspended ? ' <span class="suspended-badge">AKUM</span>' : ''}</div><div class="stat-team">${s.team}</div></div>
            <span class="stat-count ${type}">${s.count}</span>
          </div>`
        }).join('')
      }
      renderList('stat-goals', goals, 'goals')
      renderList('stat-yellow', yellow, 'yellow')
      renderList('stat-red', red, 'red')
    }

    function init() {
      load()
      ;['A', 'B', 'C', 'D'].forEach(g => { renderMatches(g); updateStandings(g) })
      updateKnockout()
      updateStats()
    }

    document.getElementById('btn-reset-all')?.addEventListener('click', resetAll)

    init()
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
