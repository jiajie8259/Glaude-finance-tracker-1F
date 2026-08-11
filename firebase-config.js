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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const FIREBASE_NOT_CONFIGURED = firebaseConfig.apiKey === "YOUR_API_KEY";

let db = null;
if (!FIREBASE_NOT_CONFIGURED) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
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
