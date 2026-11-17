const form = document.querySelector("#requestForm");
const message = document.querySelector("#formMessage");
document.querySelector("#year").textContent = new Date().getFullYear();
let config = { whatsappNumber: "" };
fetch("/api/config").then(r => r.json()).then(x => config = x).catch(() => {});
form.addEventListener("submit", async (e) => {
  e.preventDefault(); message.classList.remove("error"); message.textContent = "جارٍ إرسال الطلب...";
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await fetch("/api/leads", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "تعذر إرسال الطلب.");
    message.textContent = "تم استلام طلبك بنجاح. شكراً لثقتك بأبو نجيب!";
    if (result.whatsappNumber) {
      const text = `طلب جديد من الموقع%0Aالاسم: ${encodeURIComponent(data.name)}%0Aرقم التواصل: ${encodeURIComponent(data.phone)}%0Aالخدمة: ${encodeURIComponent(data.service)}%0Aالتفاصيل: ${encodeURIComponent(data.details || "لا توجد")}`;
      const link = document.createElement("a"); link.href = `https://wa.me/${result.whatsappNumber}?text=${text}`; link.target = "_blank"; link.rel = "noopener"; link.className = "btn secondary"; link.style.marginTop = "10px"; link.textContent = "متابعة عبر واتساب"; message.after(link);
    }
    form.reset();
  } catch (err) { message.classList.add("error"); message.textContent = err.message || "حدث خطأ، حاول مرة أخرى."; }
});