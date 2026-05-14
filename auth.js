(function(){
  const msgEl = document.getElementById('message');
  const next = new URLSearchParams(location.search).get('next') || 'account.html';
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const GOOGLE_REDIRECT_URL = 'https://hyphsworld.com/account.html';

  function show(text, type='') {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'message ' + type;
  }

  function redirectToNext(delay) {
    setTimeout(()=>location.href = next, delay || 400);
  }

  async function refreshPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') {
        await window.HWPoints.refresh();
        if (typeof window.HWPoints.render === 'function') window.HWPoints.render();
      }
    } catch (err) {}
  }

  HWAuth.getSession().then(async (s)=>{
    if (s) {
      await refreshPoints();
      show('Already logged in. Opening account management…','success');
      redirectToNext(350);
    }
  });

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async ()=>{
      try {
        googleLoginBtn.disabled = true;
        show('Opening Google ID tunnel…','success');
        await HWAuth.signInWithGoogle({ redirectTo: GOOGLE_REDIRECT_URL });
      } catch (err) {
        googleLoginBtn.disabled = false;
        show(err.message || 'Google login failed','error');
      }
    });
  }

  document.getElementById('signupForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    try {
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      await HWAuth.signUpWithEmail(email, password);
      await refreshPoints();
      show('Account created. Duck Sauce said welcome way too loud. Redirecting…','success');
      redirectToNext(400);
    } catch (err) {
      show(err.message || 'Sign up failed','error');
    }
  });

  document.getElementById('signinForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    try {
      const email = document.getElementById('signinEmail').value.trim();
      const password = document.getElementById('signinPassword').value;
      await HWAuth.signInWithEmail(email, password);
      await refreshPoints();
      show('Signed in. Buck opened the clipboard. Redirecting…','success');
      redirectToNext(400);
    } catch (err) {
      show(err.message || 'Sign in failed','error');
    }
  });
})();
