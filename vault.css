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

*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

body{
  font-family:Arial, Helvetica, sans-serif;
  color:var(--white);
  background:
    linear-gradient(rgba(0,0,0,.88), rgba(0,0,0,.96)),
    url("album-art.jpg") center center / cover no-repeat fixed;
  min-height:100vh;
  overflow-x:hidden;
}

a{
  text-decoration:none;
  color:inherit;
}

button,
input{
  font:inherit;
}

/* shell */
.vault-shell{
  width:min(1200px,92vw);
  margin:auto;
  padding:40px 0 70px;
}

/* panel */
.vault-panel{
  border:1px solid var(--line);
  border-radius:var(--radius);
  background:linear-gradient(
    180deg,
    rgba(11,11,11,.92) 0%,
    rgba(18,18,18,.96) 100%
  );
  box-shadow:var(--shadow);
  padding:32px;
  backdrop-filter:blur(10px);
}

.vault-hidden{
  display:none;
}

.eyebrow{
  color:var(--highlight-soft);
  font-size:12px;
  letter-spacing:.28em;
  text-transform:uppercase;
}

h1{
  margin:14px 0 12px;
  font-size:clamp(38px,6vw,72px);
  line-height:.95;
  text-transform:uppercase;
}

h2{
  font-size:clamp(28px,4vw,46px);
  text-transform:uppercase;
}

.copy,
.message,
.hint-copy,
.vault-card p{
  color:var(--muted);
  line-height:1.8;
}

/* unlock form */
.vault-form{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  margin-top:26px;
}

.vault-form input{
  flex:1;
  min-width:240px;
  min-height:56px;
  padding:0 18px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(255,255,255,.03);
  color:#fff;
}

.vault-form button{
  min-height:56px;
  padding:0 24px;
  border:none;
  border-radius:999px;
  background:linear-gradient(180deg,var(--accent) 0%, var(--primary) 100%);
  color:#fff;
  font-weight:900;
  letter-spacing:.06em;
  cursor:pointer;
  transition:.2s ease;
}

.vault-form button:hover{
  transform:translateY(-2px);
}

/* helper box */
.code-hint-box,
.elite-banner{
  margin-top:24px;
  padding:20px;
  border-radius:22px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.03);
}

.hint-title{
  color:var(--highlight-soft);
  font-size:13px;
  letter-spacing:.14em;
  text-transform:uppercase;
  margin-bottom:8px;
}

.elite-banner strong{
  display:block;
  font-size:18px;
  margin-bottom:6px;
  color:var(--highlight-soft);
}

.elite-banner span{
  color:var(--muted);
}

/* sections */
.vault-section{
  margin-top:38px;
}

.vault-links{
  margin-top:30px;
}

.vault-links a{
  color:var(--highlight-soft);
  font-weight:700;
}

/* grids */
.vault-grid{
  margin-top:22px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:22px;
}

.vault-song-grid{
  grid-template-columns:repeat(3,1fr);
}

/* cards */
.vault-card{
  border:1px solid rgba(255,255,255,.08);
  border-radius:24px;
  padding:18px;
  background:rgba(255,255,255,.03);
}

.vault-card h3{
  margin:0 0 10px;
  font-size:24px;
  text-transform:uppercase;
}

/* images */
.vault-image{
  width:100%;
  height:320px;
  object-fit:cover;
  border-radius:18px;
  margin-bottom:16px;
}

.song-card .vault-image{
  height:420px;
}

/* audio */
.vault-audio{
  width:100%;
  margin-top:14px;
  filter:contrast(1.1);
}

/* message */
.message{
  margin-top:16px;
  color:#ff8e8e;
}

/* responsive */
@media(max-width:1020px){

  .vault-song-grid{
    grid-template-columns:1fr;
  }

  .song-card .vault-image{
    height:340px;
  }
}

@media(max-width:760px){

  .vault-grid{
    grid-template-columns:1fr;
  }

  .vault-panel{
    padding:22px;
  }

  .vault-form{
    flex-direction:column;
  }

  .vault-form input,
  .vault-form button{
    width:100%;
  }

  .vault-image{
    height:260px;
  }
}

@media(max-width:520px){

  h1{
    font-size:42px;
  }

  h2{
    font-size:30px;
  }

  .vault-card h3{
    font-size:20px;
  }
}