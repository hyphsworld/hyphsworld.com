const loginBtn = document.getElementById("loginBtn");
const loginModal = document.getElementById("loginModal");
const emailInput = document.getElementById("emailInput");
const saveBtn = document.getElementById("saveEmailBtn");
const closeLogin = document.getElementById("closeLogin");

function openLogin() {
  loginModal.style.display = "flex";
}

function closeModal() {
  loginModal.style.display = "none";
}

if (loginBtn) loginBtn.onclick = openLogin;
if (closeLogin) closeLogin.onclick = closeModal;

if (saveBtn) {
  saveBtn.onclick = () => {
    const email = emailInput.value.trim();

    if (!email || !email.includes("@")) {
      alert("Enter valid email");
      return;
    }

    localStorage.setItem("hyphUserEmail", email);

    // Save current points
    const points = localStorage.getItem("hyphsworldCoolPoints") || 0;
    localStorage.setItem("hyphUserPoints", points);

    closeModal();
    location.reload();
  };
}
