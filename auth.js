(function(){
  const msgEl = document.getElementById('message');
  const next = new URLSearchParams(location.search).get('next') || 'index.html';

  function show(text, type='') {
    msgEl.textContent = text;
    msgEl.className = 'message ' + type;
  }

  if (!window.HWAuth) {
    show('Auth client failed to load.', 'error');
    return;
  }

  HWAuth.getSession().then((s)=>{
    if (s) location.href = next;
  });

  if (!HWAuth.isMockAllowed()) {
    show('Auth backend is not connected yet. This page is wired and ready for Supabase/Firebase.', 'error');
  }

  document.getElementById('signupForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    try {
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      await HWAuth.signUpWithEmail(email, password);
      show('Account created. Redirecting…','success');
      setTimeout(()=>location.href = next, 400);
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
      show('Signed in. Redirecting…','success');
      setTimeout(()=>location.href = next, 400);
    } catch (err) {
      show(err.message || 'Sign in failed','error');
    }
  });
})();
