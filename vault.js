:root{
  --primary:#7A0C0C;
  --accent:#E53935;
  --black:#020202;
  --panel:#0B0B0B;
  --panel-2:#121212;
  --white:#ffffff;
  --muted:#9A9A9A;
  --line:rgba(255,255,255,.08);
  --highlight-soft:#F2C2A2;
  --radius:28px;
  --shadow:0 24px 60px rgba(0,0,0,.7);
}

*{box-sizing:border-box}

body{
  margin:0;
  min-height:100vh;
  font-family:Arial, Helvetica, sans-serif;
  color:var(--white);
  background:
    linear-gradient(rgba(0,0,0,.88), rgba(0,0,0,.96)),
    url("album-art.jpg") center/cover no-repeat fixed;
}

.vault-shell{
  min-height:100vh;
  display:grid;
  place-items:center;
  padding:24px;
}

.vault-panel{
  width:min(1000px,100%);
  border:1px solid var(--line);
  background:linear-gradient(180deg,rgba(11,11,11,.94) 0%, rgba(18,18,18,.96) 100%);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  padding:32px;
  backdrop-filter:blur(10px);
}

.eyebrow{
  color:var(--highlight-soft);
  font-size:12px;
  letter-spacing:.28em;
  text-transform:uppercase;
}

h1{
  margin:10px 0 14px;
  font-size:clamp(34px,6vw,60px);
  text-transform:uppercase;
}

h2{
  margin:8px 0 18px;
  font-size:clamp(24px,4vw,36px);
  text-transform:uppercase;
}

.copy,.message,.hint-copy{
  color:var(--muted);
  line-height:1.8;
}

.vault-form{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  margin-top:24px;
}

.vault-form input{
  flex:1 1 260px;
  min-height:54px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.03);
  color:#fff;
  padding:0 16px;
}

.vault-form button{
  min-height:54px;
  padding:0 22px;
  border:none;
  border-radius:999px;
  background:linear-gradient(180deg,var(--accent) 0%, var(--primary) 100%);
  color:#fff;
  font-weight:900;
  cursor:pointer;
}

.code-hint-box,
.elite-banner{
  margin-top:22px;
  border:1px solid var(--line);
  border-radius:20px;
  background:rgba(255,255,255,.03);
  padding:18px;
}

.hint-title{
  margin:0 0 8px;
  font-weight:900;
  text-transform:uppercase;
  color:var(--highlight-soft);
}

.elite-banner strong{
  display:block;
  font-size:18px;
  margin-bottom:8px;
  color:var(--highlight-soft);
}

.elite-banner span{
  color:var(--muted);
}

.vault-section{
  margin-top:30px;
}

.vault-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
  margin-top:20px;
}

.vault-card{
  border:1px solid var(--line);
  border-radius:20px;
  background:rgba(255,255,255,.03);
  padding:20px;
  overflow:hidden;
}

.vault-card h3{
  margin:0 0 10px;
  text-transform:uppercase;
}

.vault-card p{
  margin:0;
  color:var(--muted);
  line-height:1.7;
}

.vault-image{
  width:100%;
  height:320px;
  object-fit:cover;
  border-radius:14px;
  margin-bottom:14px;
}

.vault-audio{
  width:100%;
  margin-top:14px;
}

.vault-links{
  margin-top:24px;
}

.vault-links a{
  color:var(--highlight-soft);
  text-decoration:none;
}

.vault-hidden{
  display:none;
}

@media (max-width:700px){
  .vault-grid{
    grid-template-columns:1fr;
  }

  .vault-image{
    height:260px;
  }
}