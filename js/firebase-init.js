// Firebase 연동 + 비밀번호 입장 화면 제어.
// 이 파일은 <script type="module">로 로드되어 공식 Firebase CDN(gstatic.com)에서
// 직접 모듈을 가져옵니다. 별도의 빌드 도구 없이 정적 사이트에서 쓰는 표준 방식이에요.
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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const AUTH_EMAIL = window.FIREBASE_AUTH_EMAIL;
const BLOCKS_COLLECTION = "blocks";

// 업로드 전에 이미지를 적당한 크기로 줄여서(최대 1600px, JPEG 85%) 용량과
// Storage 비용을 아낀다.
function compressImage(file, maxDim = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          blob ? resolve(blob) : reject(new Error("이미지 변환 실패"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 불러오지 못했어요"));
    };
    img.src = objectUrl;
  });
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

async function uploadImage(blockId, imageId, file) {
  const blob = await compressImage(file);
  const path = `block-images/${blockId}/${imageId}.jpg`;
  await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(ref(storage, path));
  return { url, path };
}

async function deleteImagePath(path) {
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    console.warn("이미지 삭제 실패:", path, err);
  }
}

async function saveBlock(block) {
  await setDoc(doc(db, BLOCKS_COLLECTION, block.id), block);
}

async function removeBlock(block) {
  await Promise.all((block.images || []).map((img) => (img.path ? deleteImagePath(img.path) : null)));
  await deleteDoc(doc(db, BLOCKS_COLLECTION, block.id));
}

window.LookbookFirebase = {
  signIn,
  subscribeBlocks,
  uploadImage,
  deleteImagePath,
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
