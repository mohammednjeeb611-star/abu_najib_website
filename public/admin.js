const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const list = document.querySelector("#leadsList");
const count = document.querySelector("#leadCount");
const dashMessage = document.querySelector("#dashboardMessage");
async function api(url, options={}) {
  const r = await fetch(url, { ...options, headers: { "Content-Type":"application/json", ...(options.headers||{}) } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "حدث خطأ.");
  return data;
}
function showDashboard() { loginPanel.hidden = true; dashboard.hidden = false; loadLeads(); }
loginForm.addEventListener("submit", async e => {
  e.preventDefault(); loginMessage.classList.remove("error"); loginMessage.textContent = "جارٍ التحقق...";
  try { await api("/api/admin/login", {method:"POST", body:JSON.stringify({password:new FormData(loginForm).get("password")})}); showDashboard(); }
  catch(err) { loginMessage.classList.add("error"); loginMessage.textContent = err.message; }
});
document.querySelector("#logoutButton").addEventListener("click", async () => { await api("/api/admin/logout",{method:"POST",body:"{}"}).catch(()=>{}); dashboard.hidden=true; loginPanel.hidden=false; });
async function loadLeads() {
  list.innerHTML = ""; dashMessage.textContent = "جارٍ تحميل الطلبات...";
  try {
    const leads = await api("/api/admin/leads"); count.textContent = leads.length; dashMessage.textContent = "";
    if (!leads.length) { list.innerHTML = '<div class="lead-card">لا توجد طلبات حتى الآن. ستظهر الطلبات الجديدة هنا.</div>'; return; }
    for (const lead of leads) {
      const card = document.createElement("article"); card.className = "lead-card";
      const title = document.createElement("h3"); title.textContent = lead.name;
      const meta = document.createElement("p"); meta.className = "lead-meta"; meta.textContent = `${lead.phone} • ${lead.service} • ${new Date(lead.createdAt).toLocaleString("ar")}`;
      const details = document.createElement("p"); details.textContent = lead.details || "لم يضف العميل تفاصيل.";
      const actions = document.createElement("div"); actions.className = "lead-actions";
      const select = document.createElement("select");
      for (const status of ["جديد","قيد المتابعة","مكتمل","مرفوض"]) { const o=document.createElement("option"); o.value=status; o.textContent=status; o.selected=lead.status===status; select.append(o); }
      select.addEventListener("change", async () => { try { await api(`/api/admin/leads/${encodeURIComponent(lead.id)}`,{method:"PATCH",body:JSON.stringify({status:select.value})}); } catch(e){dashMessage.textContent=e.message;} });
      const del = document.createElement("button"); del.className="danger"; del.textContent="حذف الطلب";
      del.addEventListener("click", async () => { if (!confirm("هل تريد حذف هذا الطلب؟")) return; try { await api(`/api/admin/leads/${encodeURIComponent(lead.id)}`,{method:"DELETE"}); loadLeads(); } catch(e){dashMessage.textContent=e.message;} });
      actions.append(select,del); card.append(title,meta,details,actions); list.append(card);
    }
  } catch(err) { dashMessage.classList.add("error"); dashMessage.textContent=err.message; if(err.message.includes("تسجيل الدخول")) {dashboard.hidden=true;loginPanel.hidden=false;} }
}