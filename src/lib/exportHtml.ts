import type { Funnel, FunnelStep } from "@/types/funnel";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { resolveContactStepCopy } from "@/lib/contactStepCopy";
import { funnelContentFontFamily, funnelGoogleFontsStylesheetHref, funnelLoadsGoogleFont } from "@/lib/funnelTypography";

function getEmbedUrlExport(url: string): string {
  try {
    const u = new URL(url);
    const ytMatch = u.hostname.includes("youtube.com") ? u.searchParams.get("v") : u.hostname === "youtu.be" ? u.pathname.slice(1) : null;
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch}`;
    const vimeoMatch = u.hostname.includes("vimeo.com") && u.pathname.match(/\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (u.hostname.includes("loom.com")) return `https://www.loom.com/embed/${u.pathname.split("/").pop()}`;
    if (u.hostname.includes("wistia.com") || u.hostname.includes("wi.st")) return `https://fast.wistia.net/embed/iframe/${u.pathname.split("/").pop()}`;
    return url;
  } catch { return url; }
}

function buildQuestionLabelMap(steps: FunnelStep[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of steps) {
    if (s.type === "question" && s.question?.text) {
      map[`q${s.order}`] = s.question.text;
    }
  }
  return map;
}

function buildOptionLabelMap(steps: FunnelStep[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of steps) {
    if (s.type === "question" && s.question) {
      for (const opt of s.question.options) {
        map[`q${s.order}_${opt.value}`] = opt.label;
      }
    }
  }
  return map;
}

export function exportFunnelToHtml(funnel: Funnel): string {
  const { settings, steps } = funnel;
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
  const primaryColor = settings.primaryColor || "#1877F2";
  const fontCss = funnelContentFontFamily(settings.fontFamily);
  const googleFontLink =
    funnelLoadsGoogleFont(settings.fontFamily) && settings.fontFamily?.trim()
      ? `<link href="${funnelGoogleFontsStylesheetHref(settings.fontFamily.trim())}" rel="stylesheet">`
      : "";
  const lang = (settings.language || "es") as Language;

  const optionMap: Record<string, boolean> = {};
  sortedSteps.forEach((step) => {
    if (step.type === "question" && step.question) {
      step.question.options.forEach((opt) => {
        optionMap[`q${step.order}_${opt.value}`] = opt.qualifies;
      });
    }
  });

  const resultsStep = sortedSteps.find((s) => s.type === "results");
  const thankYouStep = sortedSteps.find((s) => s.type === "thankyou");

  const stepsHtml = sortedSteps.map((step) => renderStep(step, sortedSteps, primaryColor, lang)).join("\n");

  const totalQuestionSteps = sortedSteps.filter((s) => s.type === "question").length;
  const contactStepEntity = sortedSteps.find((s) => s.type === "contact");
  const contactStepOrder = contactStepEntity?.order ?? 0;
  const contactConsentRequired =
    !!contactStepEntity &&
    contactStepEntity.showContactConsentCheckbox !== false &&
    Boolean((contactStepEntity.contactConsent || "").trim());
  const CONTACT_PROG_JS_PCT = (() => {
    const p = contactStepEntity?.contactProgressPercent;
    const n = p != null ? Math.round(p) : 92;
    return Math.min(99, Math.max(80, n));
  })();
  const CONTACT_PROG_JS_SHOW = contactStepEntity ? contactStepEntity.contactShowNearCompleteProgress !== false : false;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(funnel.name)}</title>
${googleFontLink}
<style>
*{margin:0!important;padding:0!important;box-sizing:border-box}
html,body{margin:0!important;padding:0!important;width:100%;min-height:0;background:#fff;font-family:${fontCss};color:#0d0d0d;-webkit-font-smoothing:antialiased;display:block!important;align-items:unset!important;justify-content:unset!important}
.qf-root{position:relative;width:100%;margin:0!important;padding:0!important;background:#fff}
.step{display:none;position:absolute;top:0;left:0;right:0}
.step.active{display:block;animation:stepIn .38s cubic-bezier(.4,0,.2,1) both}
.step.back-active{display:block;animation:stepInBack .38s cubic-bezier(.4,0,.2,1) both}
@keyframes stepIn{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:translateX(0)}}
@keyframes stepInBack{from{opacity:0;transform:translateX(-36px)}to{opacity:1;transform:translateX(0)}}
.inner{max-width:900px;margin:0 auto!important;padding:32px 40px 80px!important}
h1{font-size:2rem;font-weight:700;line-height:1.2;margin-bottom:12px!important}
h2{font-size:1.5rem;font-weight:700;line-height:1.3;margin-bottom:8px!important}
.subtitle{color:#666;font-size:1.05rem;line-height:1.5;margin-bottom:32px!important}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 32px!important;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none;color:#fff;background:${primaryColor}}
.btn:hover{opacity:.9;transform:translateY(-1px)}
.opts{display:flex;flex-direction:column;gap:12px}
.opts-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.opt{display:flex;align-items:center;gap:12px;padding:16px 20px!important;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:all .2s;font-size:1rem;font-weight:500;background:#fff}
.opt:hover{border-color:${primaryColor}40;background:${primaryColor}08}
.opt.sel{border-color:${primaryColor};background:${primaryColor}0a}
.opt .emoji{font-size:1.3rem}
.form-group{margin-bottom:20px!important}
.form-group label{display:block;font-weight:600;margin-bottom:6px!important;font-size:.9rem}
.form-group input{width:100%;padding:12px 16px!important;border:2px solid #e5e7eb;border-radius:10px;font-size:1rem;transition:border-color .2s;font-family:inherit}
.form-group input:focus{outline:none;border-color:${primaryColor}}
.consent{display:flex;align-items:flex-start;gap:10px;margin:24px 0!important}
.consent input{margin-top:4px!important;accent-color:${primaryColor}}
.consent label{font-size:.85rem;color:#666;cursor:pointer}
.result-icon{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin-bottom:20px!important}
.result-icon.qualified{background:${primaryColor}15}
.result-icon.disqualified{background:#f3f4f6}
.booking-frame{width:100%;min-height:600px;border:none;border-radius:12px}
.video-wrap{position:relative;padding-bottom:56.25%!important;height:0;margin-bottom:24px!important;border-radius:12px;overflow:hidden;background:#000}
.video-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%}
.next-steps{margin-top:32px!important}
.next-step{display:flex;gap:16px;padding:16px 0!important;border-bottom:1px solid #f0f0f0}
.next-step:last-child{border-bottom:none}
.step-num{width:36px;height:36px;border-radius:50%;background:${primaryColor}15;color:${primaryColor};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem;flex-shrink:0}
.step-title{font-weight:600;margin-bottom:2px!important}
.step-desc{color:#666;font-size:.9rem}
.back-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 0!important;color:#666;cursor:pointer;font-size:.9rem;border:none;background:none;margin-bottom:24px!important;font-family:inherit}
.back-btn:hover{color:#333}
.bottom-prog{position:fixed;bottom:0;left:0;right:0;display:none;justify-content:center;background:#fff;border-top:1px solid #f0f0f0;padding:12px 0 14px!important}
.bottom-prog.visible{display:flex}
.bp-inner{width:100%;max-width:900px;padding:0 40px!important;display:flex;align-items:center;gap:16px}
.bp-bar{flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden}
.bp-fill{height:100%;background:${primaryColor};border-radius:3px;transition:width .3s}
.bp-text{font-size:.8rem;color:#999;white-space:nowrap}
.delivery-card{background:#f9fafb;border:2px solid #e5e7eb;border-radius:16px;padding:32px!important;text-align:center}
.delivery-card h2{margin-bottom:8px!important}
.delivery-card p{color:#666;margin-bottom:24px!important}
.contact-card{max-width:420px;margin:0 auto!important;padding:24px 22px 28px!important;border:1px solid #f3f4f6;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.06)}
.contact-badge{display:flex;justify-content:center;margin-bottom:16px!important}
.contact-badge span{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:.74rem;font-weight:700;border-radius:999px;background:#ecfdf5;color:#065f46}
.contact-head{text-align:center;font-size:1.35rem;font-weight:800;line-height:1.2;color:#111;margin:0!important}
.contact-sub{text-align:center;font-size:.92rem;color:#525252;line-height:1.55;margin:14px 0 0!important}
.contact-trust{text-align:center;font-size:.78rem;color:#737373;margin:14px 0 0!important}
${settings.logoUrl ? `.logo{max-height:40px;margin-bottom:32px!important}` : ""}
@media(max-width:640px){
  .inner{padding:24px 20px 70px!important}
  .opts-2{grid-template-columns:1fr}
  h1{font-size:1.5rem}
  h2{font-size:1.25rem}
}
</style>
</head>
<body>
<div class="qf-root" id="qf-root">
${stepsHtml}
</div>
<div class="bottom-prog" id="prog">
<div class="bp-inner">
<div class="bp-bar"><div class="bp-fill" id="progFill" style="width:0%"></div></div>
<div class="bp-text" id="progText">0%</div>
</div>
</div>
<script>
var OPTION_MAP=${JSON.stringify(optionMap)};
var WEBHOOK_URL=${JSON.stringify(settings.webhookUrl || "")};
var RESULTS_STEP=${resultsStep?.order ?? 0};
var THANKYOU_STEP=${thankYouStep?.order ?? 0};
var TOTAL_Q=${totalQuestionSteps};
var CONTACT_STEP=${contactStepOrder};
var CONTACT_PROG_PCT=${CONTACT_PROG_JS_PCT};
var CONTACT_PROG_SHOW=${CONTACT_PROG_JS_SHOW};
var QUALIFIED_ROUTE=${resultsStep?.resultsConfig?.qualifiedRoute ?? 0};
var DISQUALIFIED_ROUTE=${resultsStep?.resultsConfig?.disqualifiedRoute ?? 0};
var CONTACT_CONSENT_REQUIRED=${JSON.stringify(contactConsentRequired)};
var CONSENT_ALERT=${JSON.stringify(t(lang, "contact.consent.alert"))};
var EMAIL_ALERT=${JSON.stringify(t(lang, "contact.email.invalid"))};
var Q_LABELS=${JSON.stringify(buildQuestionLabelMap(sortedSteps))};
var OPT_LABELS=${JSON.stringify(buildOptionLabelMap(sortedSteps))};
var cur=0,hist=[],fd={},cons=false;
function setProg(s){
  var p=document.getElementById('prog');
  var f=document.getElementById('progFill');
  var t=document.getElementById('progText');
  if(s===0||s>=RESULTS_STEP){p.classList.remove('visible');return}
  var onContact=CONTACT_STEP>0&&s===CONTACT_STEP;
  if(onContact&&!CONTACT_PROG_SHOW){p.classList.remove('visible');return}
  p.classList.add('visible');
  var pct;
  if(onContact){pct=CONTACT_PROG_PCT}
  else if(CONTACT_STEP>0){pct=Math.round((s/CONTACT_STEP)*88);if(pct>88)pct=88}
  else{pct=0}
  f.style.width=pct+'%';
  t.textContent=pct+'%';
}
function updateHeight(){
  var root=document.getElementById('qf-root');
  var active=root.querySelector('.step.active,.step.back-active');
  if(active&&root){root.style.height=active.scrollHeight+'px'}
}
function showStep(n,p,back){
  var o=document.getElementById('s'+p);
  var e=document.getElementById('s'+n);
  if(!e)return;
  if(o){o.classList.remove('active','back-active')}
  e.classList.add(back?'back-active':'active');
  setProg(n);
  window.scrollTo({top:0});
  cur=n;
  setTimeout(updateHeight,50);
}
function adv(n){hist.push(cur);showStep(n,cur,false)}
function goBack(){if(hist.length)showStep(hist.pop(),cur,true)}
function selAdv(el,n){
  el.parentElement.querySelectorAll('.opt').forEach(function(o){o.classList.remove('sel')});
  el.classList.add('sel');
  fd['q'+cur]=el.dataset.v;
  hist.push(cur);
  setTimeout(function(){showStep(n,cur,false)},280);
}
function checkQ(){
  var t=0,q=0;
  for(var k in fd){var m=k+'_'+fd[k];if(OPTION_MAP[m]!==undefined){t++;if(OPTION_MAP[m])q++}}
  return t>0&&(q/t)>=0.6;
}
function submitF(e){
  if(e)e.preventDefault();
   var nm=document.getElementById('fn');
   var ln=document.getElementById('fln');
   var em=document.getElementById('fe');
   var ph=document.getElementById('fph');
   var firstName=nm?nm.value.trim():'';
   var lastName=ln?ln.value.trim():'';
   var email=em?em.value.trim():'';
   var phone=ph?ph.value.trim():'';
   if(CONTACT_CONSENT_REQUIRED&&!cons){alert(CONSENT_ALERT);return}
   if(email&&!email.includes('@')){alert(EMAIL_ALERT);return}
   var isQ=checkQ();
   if(WEBHOOK_URL){
      var namedAnswers={};for(var k in fd){var qLabel=Q_LABELS[k];if(qLabel){var optKey=k+'_'+fd[k];namedAnswers[qLabel]=OPT_LABELS[optKey]||fd[k]}};
      var summaryLines=['📋 Resumen del lead','Nombre: '+firstName+' '+lastName];
      if(email)summaryLines.push('Email: '+email);
      if(phone)summaryLines.push('Teléfono: '+phone);
      summaryLines.push('Calificado: '+(isQ?'Sí':'No'),'','📝 Respuestas:');
      for(var k2 in fd){var ql=Q_LABELS[k2];if(ql){var ok=k2+'_'+fd[k2];summaryLines.push('• '+ql+': '+(OPT_LABELS[ok]||fd[k2]))}}
      var summary=summaryLines.join('\n');
      fetch(WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName:firstName,lastName:lastName,email:email,phone:phone,qualified:isQ,answers:namedAnswers,summary:summary,timestamp:new Date().toISOString()})}).catch(function(){});
    }
  var qEl=document.getElementById('resultQ');
  var dEl=document.getElementById('resultD');
  if(qEl)qEl.style.display=isQ?'block':'none';
  if(dEl)dEl.style.display=isQ?'none':'block';
  hist.push(cur);
  showStep(RESULTS_STEP,cur,false);
}
function goQualified(){adv(QUALIFIED_ROUTE)}
function goDisqualified(){adv(DISQUALIFIED_ROUTE)}
(function(){
  if(new URLSearchParams(window.location.search).get('booked')==='1'){showStep(THANKYOU_STEP,0,false)}
  else{document.getElementById('s0').classList.add('active');setTimeout(updateHeight,50)}
  window.addEventListener('resize',updateHeight);
})();
</script>
</body>
</html>`;
}

function renderStep(step: FunnelStep, allSteps: FunnelStep[], primary: string, lang: Language): string {
  const nextOrder = step.order + 1;
  const showBack = step.order > 0 && step.type !== "results" && step.type !== "thankyou";
  const backBtn = showBack ? `<button class="back-btn" onclick="goBack()">${t(lang, "back")}</button>` : "";

  switch (step.type) {
    case "intro": {
      const introVideo = step.introConfig?.showVideo && step.introConfig?.videoUrl
        ? `<div class="video-wrap"><iframe src="${escAttr(getEmbedUrlExport(step.introConfig.videoUrl))}" allowfullscreen></iframe></div>`
        : "";
      return `<div class="step" id="s${step.order}"><div class="inner" style="text-align:center">
${backBtn}
<h1>${escHtml(step.introConfig?.headline || "")}</h1>
${introVideo}
<p class="subtitle">${escHtml(step.introConfig?.description || "")}</p>
<button class="btn" onclick="adv(${nextOrder})">${escHtml(step.introConfig?.cta || t(lang, "start"))}</button>
</div></div>`;
    }

    case "question": {
      const q = step.question;
      if (!q) return "";
      const layoutClass = q.layout === "opts-2" ? "opts-2" : "opts";
      const optsHtml = q.options.map((o) =>
        `<div class="opt" data-v="${escAttr(o.value)}" onclick="selAdv(this,${nextOrder})"><span class="emoji">${o.emoji}</span><span>${escHtml(o.label)}</span></div>`
      ).join("\n");
      return `<div class="step" id="s${step.order}"><div class="inner">
${backBtn}
<h2>${escHtml(q.text)}</h2>
<div style="margin-top:24px" class="${layoutClass}">
${optsHtml}
</div>
</div></div>`;
    }

    case "contact": {
      const fields = step.contactFields || [];
      const fieldsHtml = fields.map((f) => {
        const isLastName = f.fieldType === "text" && f.label.toLowerCase().includes("apellido");
        const inputId = f.fieldType === "email" ? "fe" : f.fieldType === "tel" ? "fph" : isLastName ? "fln" : "fn";
        return `<div class="form-group"><label>${escHtml(f.label)}</label><input type="${f.fieldType}" id="${inputId}" placeholder="${escAttr(f.placeholder)}" ${f.required ? "required" : ""}></div>`;
      }).join("\n");
      const cv = resolveContactStepCopy(step, lang);
      const trustBlk = cv.trustLine ? `<p class="contact-trust">🔒 ${escHtml(cv.trustLine)}</p>` : "";
      const consentHtml =
        step.showContactConsentCheckbox !== false && (step.contactConsent || "").trim()
          ? `<div class="consent"><input type="checkbox" id="consent" onchange="cons=this.checked"><label for="consent">${escHtml(step.contactConsent || t(lang, "contact.consent.default"))}</label></div>`
          : "";
      return `<div class="step" id="s${step.order}"><div class="inner">
${backBtn}
<div class="contact-card">
<div class="contact-badge"><span>✓ ${escHtml(cv.badgeLabel)}</span></div>
<h2 class="contact-head">${escHtml(cv.headline)}</h2>
<p class="contact-sub">${escHtml(cv.subheadline)}</p>${trustBlk}
<form onsubmit="submitF(event);return false" style="margin-top:22px;width:100%">
${fieldsHtml}
${consentHtml}
<button type="submit" class="btn" style="width:100%">${escHtml(step.contactCta || t(lang, "submit"))}</button>
</form>
</div>
</div></div>`;
    }

    case "results": {
      const r = step.resultsConfig;
      if (!r) return "";
      return `<div class="step" id="s${step.order}"><div class="inner">
<div id="resultQ">
<div class="result-icon qualified">✅</div>
<h1>${escHtml(r.qualifiedHeadline)}</h1>
<p class="subtitle">${escHtml(r.qualifiedSubheadline)}</p>
<button class="btn" onclick="goQualified()">${escHtml(r.qualifiedCta)}</button>
</div>
<div id="resultD" style="display:none">
<div class="result-icon disqualified">👋</div>
<h1>${escHtml(r.disqualifiedHeadline)}</h1>
<p class="subtitle">${escHtml(r.disqualifiedSubheadline)}</p>
<button class="btn" onclick="goDisqualified()" style="background:#6b7280">${escHtml(r.disqualifiedCta)}</button>
</div>
</div></div>`;
    }

    case "booking": {
      const url = step.bookingConfig?.bookingUrl || "";
      return `<div class="step" id="s${step.order}"><div class="inner">
${backBtn}
<h2>${t(lang, "booking.title")}</h2>
<p class="subtitle">${t(lang, "booking.subtitle")}</p>
${url ? `<iframe class="booking-frame" src="${escAttr(url)}"></iframe>` : `<p style="color:#999;text-align:center;padding:60px 0">${t(lang, "booking.placeholder")}</p>`}
</div></div>`;
    }

    case "vsl": {
      const v = step.vslConfig;
      const videoUrl = v?.videoUrl || "";
      return `<div class="step" id="s${step.order}"><div class="inner">
${backBtn}
${videoUrl ? `<div class="video-wrap"><iframe src="${escAttr(videoUrl)}" allowfullscreen></iframe></div>` : `<div style="background:#f3f4f6;border-radius:12px;padding:80px 20px;text-align:center;color:#999;margin-bottom:24px">${t(lang, "video.placeholder")}</div>`}
${v?.ctaLabel ? `<div style="text-align:center"><a class="btn" href="${escAttr(v.ctaUrl || "#")}">${escHtml(v.ctaLabel)}</a></div>` : ""}
</div></div>`;
    }

    case "delivery": {
      const d = step.deliveryConfig;
      return `<div class="step" id="s${step.order}"><div class="inner">
<div class="delivery-card">
<h2>${escHtml(d?.resourceTitle || "")}</h2>
<p>${escHtml(d?.resourceDescription || "")}</p>
<a class="btn" href="${escAttr(d?.downloadUrl || "#")}">${escHtml(d?.downloadButtonLabel || t(lang, "download"))}</a>
</div>
</div></div>`;
    }

    case "thankyou": {
      const tc = step.thankYouConfig;
      if (!tc) return "";
      const nsHtml = (tc.nextSteps || []).map((ns) =>
        `<div class="next-step"><div class="step-num">${ns.number}</div><div><div class="step-title">${escHtml(ns.title)}</div><div class="step-desc">${escHtml(ns.description)}</div></div></div>`
      ).join("\n");
      return `<div class="step" id="s${step.order}"><div class="inner">
<div class="result-icon qualified">🎉</div>
<h1>${escHtml(tc.headline)}</h1>
<p class="subtitle">${escHtml(tc.subtitle)}</p>
${nsHtml ? `<div class="next-steps">${nsHtml}</div>` : ""}
</div></div>`;
    }

    default:
      return "";
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
