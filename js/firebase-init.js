// Firebase 연동 + 비밀번호 입장 화면 제어.
// 외부 CDN(gstatic.com)이 특정 네트워크/확장 프로그램에서 차단되거나 404가
// 나는 경우가 있어서, Firebase SDK(app+auth+firestore)를 esbuild로 한 파일로
// 묶어 js/vendor/firebase-bundle.js에 직접 포함시켰습니다. 외부 요청 없이
// 저장소 안의 파일만으로 동작합니다.
import {
  initializeApp,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from "./vendor/firebase-bundle.js";

const AUTH_EMAIL = window.FIREBASE_AUTH_EMAIL;
const ADMIN_EMAIL = window.FIREBASE_ADMIN_EMAIL;
const BLOCKS_COLLECTION = "blocks";

// ---------- 비밀번호 입장 화면 DOM ----------
const loadingView = document.getElementById("loadingView");
const authGate = document.getElementById("authGate");
const appRoot = document.getElementById("app");
const passwordInput = document.getElementById("authPasswordInput");
const authError = document.getElementById("authError");
const submitBtn = document.getElementById("authSubmitBtn");

function showFatalError(message) {
  console.error("[Lookbook] " + message);
  loadingView.hidden = true;
  authGate.classList.remove("hidden");
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

// ---------- 관리자 모드 비밀번호 확인 ----------
// 관리자 비밀번호 확인 전용 보조 Firebase 앱 인스턴스. 메인 로그인 세션(위
// app/auth)과 완전히 분리되어 있어서, 비밀번호가 맞는지 확인하는 동안에도
// 실제 로그인 상태는 전혀 바뀌지 않는다.
let adminCheckAuth;
try {
  const adminCheckApp = initializeApp(window.FIREBASE_CONFIG, "adminCheck");
  adminCheckAuth = getAuth(adminCheckApp);
} catch (err) {
  console.error("[Lookbook] 관리자 확인용 보조 앱 초기화에 실패했어요:", err);
}

async function verifyAdminPassword(password) {
  if (!adminCheckAuth || !ADMIN_EMAIL || !password) return false;
  try {
    await signInWithEmailAndPassword(adminCheckAuth, ADMIN_EMAIL, password);
    await signOut(adminCheckAuth);
    return true;
  } catch (err) {
    return false;
  }
}

window.LookbookFirebase = {
  signIn,
  subscribeBlocks,
  saveBlock,
  removeBlock,
  verifyAdminPassword
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

// 로그인 여부 확인이 너무 빨리 끝나면 로딩 화면(이미지 애니메이션 등)이
// 한 프레임 반짝이고 사라지는 것처럼 보일 수 있어서, 페이지가 열린 뒤
// 최소 1초는 로딩 화면이 보이도록 보장한다. 기준 시각(window.__pageLoadStart)은
// index.html의 아무것도 기다리지 않는 스크립트에서 미리 재둔 값이다.
const MIN_LOADING_MS = 1000;
onAuthStateChanged(auth, (user) => {
  const elapsed = Date.now() - (window.__pageLoadStart || Date.now());
  const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
  setTimeout(() => {
    loadingView.hidden = true;
    if (user) showApp();
    else showGate();
  }, remaining);
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
