// Firebase 연동 + 비밀번호 입장 화면 제어.
// 이 파일은 <script type="module">로 로드되어 공식 Firebase CDN(gstatic.com)에서
// 직접 모듈을 가져옵니다. 별도의 빌드 도구 없이 정적 사이트에서 쓰는 표준 방식입니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const AUTH_EMAIL = window.FIREBASE_AUTH_EMAIL;
const BLOCKS_COLLECTION = "blocks";

// ---------- 비밀번호 입장 화면 DOM ----------
const authGate = document.getElementById("authGate");
const appRoot = document.getElementById("app");
const passwordInput = document.getElementById("authPasswordInput");
const authError = document.getElementById("authError");
const submitBtn = document.getElementById("authSubmitBtn");

function showFatalError(message) {
  console.error("[Lookbook] " + message);
  authError.textContent = message;
  authError.classList.remove("hidden");
}

let app, auth, db;
try {
  app = initializeApp(window.FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  showFatalError(
    "Firebase 초기화에 실패했습니다. js/firebase-config.js의 값을 다시 확인해주세요. (" +
      (err && err.message ? err.message : err) +
      ")"
  );
  throw err;
}

async function signIn(password) {
  await setPersistence(auth, browserLocalPersistence);
  await signInWithEmailAndPassword(auth, AUTH_EMAIL, password);
}

function subscribeBlocks(callback) {
  return onSnapshot(collection(db, BLOCKS_COLLECTION), (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

async function saveBlock(block) {
  await setDoc(doc(db, BLOCKS_COLLECTION, block.id), block);
}

async function removeBlock(block) {
  await deleteDoc(doc(db, BLOCKS_COLLECTION, block.id));
}

window.LookbookFirebase = {
  signIn,
  subscribeBlocks,
  saveBlock,
  removeBlock
};

// ---------- 비밀번호 입장 화면 동작 ----------
function showGate() {
  authGate.classList.remove("hidden");
  appRoot.classList.add("hidden");
}

function showApp() {
  authGate.classList.add("hidden");
  appRoot.classList.remove("hidden");
  window.dispatchEvent(new CustomEvent("firebase-ready"));
}

onAuthStateChanged(auth, (user) => {
  if (user) showApp();
  else showGate();
});

function describeAuthError(err) {
  const code = err && err.code;
  console.error("[Lookbook] 로그인 실패:", code, err);
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "비밀번호가 올바르지 않아요.";
    case "auth/unauthorized-domain":
      return "이 주소(도메인)가 Firebase에 승인되지 않았어요. Authentication → Settings → 승인된 도메인을 확인해주세요.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "Firebase 설정 값(API 키)이 올바르지 않아요. js/firebase-config.js를 확인해주세요.";
    case "auth/operation-not-allowed":
      return "이메일/비밀번호 로그인이 꺼져 있어요. Authentication → Sign-in method에서 켜주세요.";
    case "auth/network-request-failed":
      return "네트워크 오류예요. 인터넷 연결을 확인해주세요.";
    case "auth/too-many-requests":
      return "시도가 너무 많아요. 잠시 후 다시 시도해주세요.";
    default:
      return `로그인에 실패했어요. (${code || (err && err.message) || "알 수 없는 오류"})`;
  }
}

async function tryLogin() {
  const password = passwordInput.value;
  if (!password) return;
  submitBtn.disabled = true;
  authError.classList.add("hidden");
  try {
    await signIn(password);
    passwordInput.value = "";
  } catch (err) {
    authError.textContent = describeAuthError(err);
    authError.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
  }
}

submitBtn.addEventListener("click", tryLogin);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryLogin();
});
