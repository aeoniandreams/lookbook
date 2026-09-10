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

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const AUTH_EMAIL = window.FIREBASE_AUTH_EMAIL;
const BLOCKS_COLLECTION = "blocks";

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

// ---------- 비밀번호 입장 화면 ----------
const authGate = document.getElementById("authGate");
const appRoot = document.getElementById("app");
const passwordInput = document.getElementById("authPasswordInput");
const authError = document.getElementById("authError");
const submitBtn = document.getElementById("authSubmitBtn");

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

async function tryLogin() {
  const password = passwordInput.value;
  if (!password) return;
  submitBtn.disabled = true;
  authError.classList.add("hidden");
  try {
    await signIn(password);
    passwordInput.value = "";
  } catch (err) {
    authError.textContent = "비밀번호가 올바르지 않아요.";
    authError.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
  }
}

submitBtn.addEventListener("click", tryLogin);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryLogin();
});
