const CSS = `
:root{--navy:#0d1b2e;--card:#1b2c42;--card2:#162338;--green:#00ff62;--text:#e8edf4;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:var(--navy);color:var(--text);font-size:13px;line-height:1.7;}
.hdr{background:var(--card);padding:14px 20px;display:flex;align-items:center;gap:14px;border-bottom:2px solid #00ff6233;position:sticky;top:0;z-index:100;}
.hdr img{height:40px;}
.hdr-txt h1{font-size:17px;font-weight:900;color:#f9e060;}
.hdr-txt p{font-size:11px;color:#aaa;margin-top:1px;}
.hdr-btns{margin-left:auto;display:flex;gap:8px;}
.hdr-btns a{padding:8px 16px;border-radius:7px;font-weight:700;font-size:12px;text-decoration:none;background:#00ff6222;color:var(--green);border:1px solid #00ff6244;white-space:nowrap;}
.hdr-btns a:hover{background:#00ff6233;}
@media(max-width:520px){.hdr{padding:12px 14px;gap:10px;}.hdr img{height:32px;}.hdr-txt h1{font-size:14px;}.hdr-txt p{font-size:10px;}.hdr-btns a{padding:7px 10px;font-size:11px;}}
.content{max-width:800px;margin:0 auto;padding:16px;}
.sec{margin-bottom:24px;}
.sec-title{font-size:13px;font-weight:800;color:var(--green);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;padding-left:10px;border-left:3px solid var(--green);}
.card{background:var(--card);border-radius:10px;padding:14px 16px;font-size:13px;}
.rule{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #ffffff08;}
.rule:last-child{border-bottom:none;}
.rnum{color:var(--green);font-weight:800;font-size:12px;min-width:22px;margin-top:1px;}
.rtxt{flex:1;line-height:1.7;}
.rtxt strong{color:#f9e060;}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:700;}
.badge-r{background:#ff3b3b22;color:#ff6b6b;border:1px solid #ff3b3b44;}
.badge-y{background:#f9e06022;color:#f9e060;border:1px solid #f9e06044;}
.badge-g{background:#00ff6222;color:var(--green);border:1px solid #00ff6244;}
.highlight-box{background:linear-gradient(135deg,#f9e06011,#f9e06022);border:1px solid #f9e06044;border-radius:8px;padding:12px 14px;font-size:12.5px;line-height:1.7;margin-top:8px;}
`

const BODY_HTML = `
<header class="hdr">
  <img src="/turnament/logo.png" alt="Zains"/>
  <div class="hdr-txt">
    <h1>Ketentuan &ndash; Champions Cup #5</h1>
    <p>Minggu, 26 Juli 2026 &nbsp;&middot;&nbsp; 08:00 WIB &nbsp;&middot;&nbsp; @Zains Minisoccer Cibadak</p>
  </div>
  <div class="hdr-btns">
    <a href="/turnamen/skor">Papan Skor</a>
  </div>
</header>

<div class="content">

  <div class="sec">
    <div class="sec-title">A. Ketentuan Umum</div>
    <div class="card">
      <div class="rule"><div class="rnum">1</div><div class="rtxt">Turnamen ini terbuka untuk <strong>24 tim</strong> yang telah terdaftar dan melunasi biaya pendaftaran.</div></div>
      <div class="rule"><div class="rnum">2</div><div class="rtxt">Setiap tim wajib hadir <strong>15 menit sebelum</strong> jadwal pertandingan pertamanya. Keterlambatan lebih dari 5 menit dinyatakan <strong>WO (Walk Over)</strong>.</div></div>
      <div class="rule"><div class="rnum">3</div><div class="rtxt">Setiap tim minimal membawa <strong>5 pemain</strong> inti dan maksimal <strong>10 pemain</strong> (termasuk cadangan).</div></div>
      <div class="rule"><div class="rnum">4</div><div class="rtxt">Pemain wajib menggunakan <strong>kostum seragam</strong> (kaos seragam satu warna/motif). Tim tamu wajib membawa rompi/vest jika warna kostum sama dengan tim tuan rumah.</div></div>
      <div class="rule"><div class="rnum">5</div><div class="rtxt">Setiap pemain hanya boleh terdaftar di <strong>satu tim</strong>. Pemain ganda (main di dua tim) akan mengakibatkan diskualifikasi tim.</div></div>
      <div class="rule"><div class="rnum">6</div><div class="rtxt">Keputusan wasit dan panitia bersifat <strong>final dan tidak dapat diganggu gugat</strong>.</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">B. Peraturan Pertandingan</div>
    <div class="card">
      <div class="rule"><div class="rnum">1</div><div class="rtxt">Durasi setiap pertandingan adalah <strong>15 menit</strong> tanpa perpanjangan waktu di fase grup.</div></div>
      <div class="rule"><div class="rnum">2</div><div class="rtxt">Jumlah pemain di lapangan: <strong>5 vs 5</strong> (termasuk kiper). Minimal 3 pemain untuk bisa bertanding.</div></div>
      <div class="rule"><div class="rnum">3</div><div class="rtxt">Pergantian pemain <strong>bebas (rolling substitution)</strong> dan dapat dilakukan kapan saja saat bola mati.</div></div>
      <div class="rule"><div class="rnum">4</div><div class="rtxt">Tendangan gawang, tendangan sudut, dan lemparan ke dalam mengikuti aturan <strong>futsal standar</strong>.</div></div>
      <div class="rule"><div class="rnum">5</div><div class="rtxt">Pada fase gugur: jika skor seri setelah 15 menit, langsung dilanjutkan dengan <strong>adu penalti</strong> (3 penendang per tim, golden goal jika masih seri).</div></div>
      <div class="rule"><div class="rnum">6</div><div class="rtxt"><strong>Kick-in</strong> menggantikan throw-in. Bola harus statis dan diinjak sebelum ditendang.</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">C. Kartu &amp; Sanksi</div>
    <div class="card">
      <div class="rule"><div class="rnum">1</div><div class="rtxt"><span class="badge badge-y">&#x1F7E8; Kartu Kuning</span> &mdash; Peringatan. Akumulasi <strong>2 kartu kuning</strong> dalam satu pertandingan = kartu merah.</div></div>
      <div class="rule"><div class="rnum">2</div><div class="rtxt"><span class="badge badge-r">&#x1F7E5; Kartu Merah</span> &mdash; Pemain langsung keluar dan tidak dapat digantikan. Tim bermain dengan kekurangan satu pemain.</div></div>
      <div class="rule"><div class="rnum">3</div><div class="rtxt">Pemain yang mendapat kartu merah <strong>tidak dapat bermain</strong> pada pertandingan berikutnya (minimal 1 match skors).</div></div>
      <div class="rule"><div class="rnum">4</div><div class="rtxt">Tindakan kekerasan fisik yang disengaja dapat dikenai <strong>skors lebih dari 1 match</strong> atas keputusan panitia.</div></div>
      <div class="rule"><div class="rnum">5</div><div class="rtxt">Protes terhadap keputusan wasit hanya boleh dilakukan oleh <strong>kapten tim</strong> dan wajib dilakukan dengan sopan.</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">D. Fase Grup &amp; Klasemen</div>
    <div class="card">
      <div class="rule"><div class="rnum">1</div><div class="rtxt">Sistem poin: <strong>Menang = 3 poin</strong>, Seri = 1 poin, Kalah = 0 poin.</div></div>
      <div class="rule"><div class="rnum">2</div><div class="rtxt"><strong>Tiebreaker</strong> (jika poin sama): (1) Selisih Gol &rarr; (2) Gol Masuk terbanyak &rarr; (3) Head-to-Head.</div></div>
      <div class="rule"><div class="rnum">3</div><div class="rtxt"><strong>Hanya 1 tim teratas</strong> (Juara Grup) dari setiap grup yang lolos ke Perempat Final.</div></div>
      <div class="rule"><div class="rnum">4</div><div class="rtxt">Hasil WO dihitung sebagai kekalahan 0&ndash;3 bagi tim yang WO.</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">E. Fair Play &amp; Etika</div>
    <div class="card">
      <div class="rule"><div class="rnum">1</div><div class="rtxt">Pemain dan official tim wajib menjaga <strong>sportivitas</strong> &mdash; tidak memancing keributan, tidak mengintimidasi wasit.</div></div>
      <div class="rule"><div class="rnum">2</div><div class="rtxt">Penonton/suporter dilarang memasuki area lapangan selama pertandingan berlangsung.</div></div>
      <div class="rule"><div class="rnum">3</div><div class="rtxt">Panitia berhak mendiskualifikasi tim yang terbukti melakukan <strong>kecurangan</strong> atau menyebabkan kerusuhan.</div></div>
      <div class="rule"><div class="rnum">4</div><div class="rtxt">Semua pemain wajib berjabat tangan sebelum dan sesudah pertandingan.</div></div>
    </div>
  </div>

  <div class="highlight-box">
    &#x26BD; Dengan mendaftar, setiap tim menyatakan <strong>setuju dan tunduk</strong> pada seluruh ketentuan yang berlaku. Selamat bertanding dan junjung tinggi sportivitas!
  </div>

</div>
`

export const metadata = {
  title: 'Ketentuan – Zains Champions Cup #5',
}

export default function TurnamenPage() {
  return (
    <div style={{ background: '#0d1b2e', minHeight: '100vh' }}>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </div>
  )
}
