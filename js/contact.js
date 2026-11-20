const contactForm = document.querySelector(".contact-form");
const contactToast = document.querySelector("#contact-toast");
let contactToastTimer;

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  contactForm.reset();
  contactToast.textContent = "Message sent..! Thank you for contacting us.";
  contactToast.hidden = false;

  window.clearTimeout(contactToastTimer);
  contactToastTimer = window.setTimeout(() => {
    contactToast.hidden = true;
  }, 3000);
});
