/* =====================================================================
   Firebase 設定檔（共用於 expense-dashboard.html 與 expense-upload.html）

   ⚠️ 使用前必看：
   1. 去 https://console.firebase.google.com 建立一個 Firebase 專案
      （沒有的話，免費的 Spark 方案就夠這個用途）
   2. 專案設定 → 一般 → 新增網頁應用程式，複製它給你的 firebaseConfig
      物件，貼到下面覆蓋掉 YOUR_XXX 的部分
   3. 左側選單開啟 Firestore Database → 建立資料庫（正式環境模式即可）
   4. 到 Firestore 的「規則」分頁，設定存取規則。最簡單但「僅限你自己
      使用」的規則範例（不建議公開分享網址）：

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /transactions/{txId} {
              allow read, write: if true;
            }
          }
        }

      如果之後想加保護，建議改成需要登入(Firebase Authentication)才能
      讀寫，這份檔案目前沒有做登入機制。
   ===================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyB-JV7IFk4wRtNG3C5ugrqSO-h98xVZ37M",
  authDomain: "glaude-finance-tracker-1f.firebaseapp.com",
  projectId: "glaude-finance-tracker-1f",
  storageBucket: "glaude-finance-tracker-1f.firebasestorage.app",
  messagingSenderId: "551294320640",
  appId: "1:551294320640:web:caec827a871f18a25898e5",
  measurementId: "G-FCW04KDJQ0"
};

const FIREBASE_NOT_CONFIGURED = firebaseConfig.apiKey === "YOUR_API_KEY";

/* ⚠️ 白名單：只有這個 email 能登入成功（Google登入用任何帳號都能點進去，
   靠這個檢查擋掉非本人帳號）。請換成你自己實際會用來登入的 Gmail。 */
const ALLOWED_EMAIL = "your-email@gmail.com";

let db = null;
let auth = null;
if (!FIREBASE_NOT_CONFIGURED) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
}

/* =====================================================================
   登入驗證閘門
   用法：在頁面最後呼叫 initAuthGate(function(user){ ...這裡放原本要執行的初始化程式碼... })
   沒登入時會蓋一層全螢幕登入畫面，擋住底下所有內容跟操作。

   ⚠️ 記得先去 Firebase Console → Authentication → Sign-in method
   啟用「Email/Password」，再到「Users」分頁手動新增你自己的帳號密碼
   （不要開放任何人自行註冊）。
   ===================================================================== */
function initAuthGate(onReady){
  if (FIREBASE_NOT_CONFIGURED) { onReady(null); return; }

  injectAuthGateStyles();

  const overlay = document.createElement('div');
  overlay.id = 'auth-gate-overlay';
  overlay.innerHTML = `
    <div class="auth-box">
      <div class="auth-lock">🔒</div>
      <div class="auth-title">需要登入</div>
      <div class="auth-sub">這是個人支出紀錄，請先登入才能繼續。</div>
      <button id="auth-google-btn" type="button" class="auth-btn google">🔵 使用 Google 帳號登入</button>
      <div class="auth-divider"><span>或用 Email</span></div>
      <form id="auth-form">
        <input type="email" id="auth-email" placeholder="Email" autocomplete="username">
        <input type="password" id="auth-password" placeholder="密碼" autocomplete="current-password">
        <button id="auth-submit" type="submit" class="auth-btn">登入</button>
      </form>
      <div id="auth-error" class="auth-error"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const emailInput = document.getElementById('auth-email');
  const pwInput = document.getElementById('auth-password');
  const errorBox = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  const googleBtn = document.getElementById('auth-google-btn');
  const authForm = document.getElementById('auth-form');

  async function doLogin(){
    errorBox.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = '登入中…';
    try{
      await auth.signInWithEmailAndPassword(emailInput.value.trim(), pwInput.value);
    } catch(err){
      errorBox.textContent = translateAuthError(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '登入';
    }
  }
  authForm.addEventListener('submit', e=>{ e.preventDefault(); doLogin(); });

  googleBtn.addEventListener('click', async ()=>{
    errorBox.textContent = '';
    googleBtn.disabled = true;
    try{
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      // 白名單檢查在 onAuthStateChanged 裡統一處理
    } catch(err){
      errorBox.textContent = translateAuthError(err);
    } finally {
      googleBtn.disabled = false;
    }
  });

  auth.onAuthStateChanged(async user=>{
    if(user){
      const emailOk = (user.email || '').toLowerCase() === ALLOWED_EMAIL.toLowerCase();
      if(!emailOk){
        errorBox.textContent = `此帳號（${user.email}）未授權，已自動登出。`;
        await auth.signOut();
        return;
      }
      overlay.style.display = 'none';
      showLogoutBar(user);
      onReady(user);
    } else {
      overlay.style.display = 'flex';
      removeLogoutBar();
    }
  });
}

function showLogoutBar(user){
  removeLogoutBar();
  const bar = document.createElement('div');
  bar.id = 'logout-bar';
  bar.innerHTML = `<span>👤 ${user.email}</span><button id="logout-btn">登出</button>`;
  document.body.appendChild(bar);
  document.getElementById('logout-btn').addEventListener('click', ()=> auth.signOut());
}
function removeLogoutBar(){
  const el = document.getElementById('logout-bar');
  if(el) el.remove();
}

function translateAuthError(err){
  const map = {
    'auth/invalid-email': 'Email 格式不正確',
    'auth/user-not-found': '找不到這個帳號',
    'auth/wrong-password': '密碼錯誤',
    'auth/invalid-credential': 'Email 或密碼錯誤',
    'auth/too-many-requests': '嘗試太多次，請稍後再試'
  };
  return map[err.code] || ('登入失敗：' + err.message);
}

function injectAuthGateStyles(){
  if(document.getElementById('auth-gate-styles')) return;
  const style = document.createElement('style');
  style.id = 'auth-gate-styles';
  style.textContent = `
    #auth-gate-overlay{
      position:fixed; inset:0; z-index:999;
      background: var(--ink, #0F1E29);
      display:flex; align-items:center; justify-content:center;
      padding:20px;
    }
    #auth-gate-overlay .auth-box{
      width:100%; max-width:340px;
      background: var(--panel, #16283A);
      border:1px solid var(--line-strong, rgba(237,230,214,0.28));
      border-radius:18px;
      padding:32px 28px;
      text-align:center;
      font-family:'Noto Sans TC', sans-serif;
    }
    #auth-gate-overlay .auth-lock{ font-size:28px; margin-bottom:10px; }
    #auth-gate-overlay .auth-title{
      font-family:'Noto Serif TC', serif; font-weight:700; font-size:20px;
      color: var(--paper, #EDE6D6); margin-bottom:6px;
    }
    #auth-gate-overlay .auth-sub{
      font-size:12.5px; color:rgba(237,230,214,0.6); margin-bottom:20px;
    }
    #auth-gate-overlay input{
      width:100%; box-sizing:border-box; background: var(--panel-2, #1D3348);
      border:1px solid var(--line-strong, rgba(237,230,214,0.28));
      color: var(--paper, #EDE6D6); padding:11px 14px; border-radius:10px;
      font-size:14px; margin-bottom:10px; font-family:'Noto Sans TC', sans-serif;
    }
    #auth-gate-overlay input:focus{ outline:none; border-color: var(--gold, #C9973F); }
    #auth-gate-overlay .auth-btn{
      width:100%; padding:12px; border-radius:10px; border:none;
      background: var(--gold, #C9973F); color:#1B1206; font-weight:700;
      font-size:14px; cursor:pointer; font-family:'Noto Sans TC', sans-serif;
    }
    #auth-gate-overlay .auth-btn:hover{ background: var(--gold-soft, #E7C888); }
    #auth-gate-overlay .auth-btn:disabled{ opacity:.5; cursor:not-allowed; }
    #auth-gate-overlay .auth-btn.google{
      background: #fff; color:#1F1F1F; margin-bottom:14px;
      display:flex; align-items:center; justify-content:center; gap:8px;
    }
    #auth-gate-overlay .auth-btn.google:hover{ background:#f1f1f1; }
    #auth-gate-overlay .auth-divider{
      display:flex; align-items:center; gap:10px; margin:6px 0 14px;
      font-size:11.5px; color:rgba(237,230,214,0.4);
    }
    #auth-gate-overlay .auth-divider::before,
    #auth-gate-overlay .auth-divider::after{
      content:''; flex:1; height:1px; background: var(--line-strong, rgba(237,230,214,0.28));
    }
    #auth-gate-overlay .auth-error{
      margin-top:12px; font-size:12.5px; color:#E79684; min-height:16px;
    }
    #logout-bar{
      position:fixed; top:14px; right:14px; z-index:998;
      display:flex; align-items:center; gap:10px;
      background: var(--panel, #16283A);
      border:1px solid var(--line-strong, rgba(237,230,214,0.28));
      border-radius:999px; padding:7px 8px 7px 16px;
      font-size:12.5px; color: var(--paper, #EDE6D6);
      font-family:'Noto Sans TC', sans-serif;
    }
    #logout-bar button{
      background: rgba(237,230,214,0.08); border:1px solid var(--line-strong, rgba(237,230,214,0.28));
      color: var(--paper, #EDE6D6); padding:6px 14px; border-radius:999px;
      font-size:12px; cursor:pointer; font-family:'Noto Sans TC', sans-serif;
    }
    #logout-bar button:hover{ border-color: var(--gold, #C9973F); color: var(--gold-soft, #E7C888); }
  `;
  document.head.appendChild(style);
}

/* 這 9 張卡的共用清單，跟主頁面（credit-card-dashboard.html）保持一致 */
const CARD_LIST = [
  { id: "taishin",  name: "台新 Richart 卡",       accent: "#C9973F" },
  { id: "dawa",     name: "永豐 DaWay 卡",          accent: "#4EA491" },
  { id: "linebank", name: "聯邦 LINE BANK 熊大卡",  accent: "#8E6BC9" },
  { id: "laidian",  name: "聯邦賴點卡",             accent: "#8E6BC9" },
  { id: "kumamon",  name: "玉山熊本熊卡",           accent: "#C1543C" },
  { id: "fubonj",   name: "富邦 J 卡",              accent: "#3F7FBF" },
  { id: "dbseco",   name: "星展 eco 永續極簡卡",    accent: "#C9973F" },
  { id: "dbsfly",   name: "星展飛行卡",             accent: "#4EA491" },
  { id: "ctbc",     name: "中國信託中華電信聯名卡", accent: "#3F7FBF" }
];

function cardNameById(id) {
  const c = CARD_LIST.find(c => c.id === id);
  return c ? c.name : id;
}
function cardAccentById(id) {
  const c = CARD_LIST.find(c => c.id === id);
  return c ? c.accent : "#C9973F";
}
