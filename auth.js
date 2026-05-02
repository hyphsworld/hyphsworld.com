(function(){
  const msgEl = document.getElementById('message');
  const next = new URLSearchParams(location.search).get('next') || 'index.html';

  function show(text, type='') {
    msgEl.textContent = text;
    msgEl.className = 'message ' + type;
  }

  HWAuth.getSession().then((s)=>{
    if (s) location.href = next;
  });

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
