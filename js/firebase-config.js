// Firebase 콘솔(https://console.firebase.google.com) > 프로젝트 설정 > 일반 >
// "내 앱" 섹션에서 웹 앱을 추가하면 아래와 같은 형태의 설정 값을 받을 수 있어요.
// 그 값을 그대로 이 자리에 붙여넣으면 됩니다.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDwqT_kLLINGh1yxSTtUQoRyIdlfn8cvp4",
  authDomain: "lookbook-a4512.firebaseapp.com",
  projectId: "lookbook-a4512",
  storageBucket: "lookbook-a4512.firebasestorage.app",
  messagingSenderId: "697597192526",
  appId: "1:697597192526:web:90b00afaf6caef3740561f",
};

// 지인들이 입장 화면에서 입력할 "공용 비밀번호"는 Firebase Authentication에
// 이메일/비밀번호 사용자 한 명을 만들어서 관리해요. 그 사용자의 이메일 주소를
// 여기에 적어주세요. (이메일 자체는 화면에 노출되지 않고, 코드 안에서만 쓰여요)
// 이 계정은 "읽기 전용" 권한만 가져요 — Firestore 보안 규칙에서 쓰기는
// 아래 관리자 계정에게만 허용하도록 막아주세요.
window.FIREBASE_AUTH_EMAIL = "user@gmail.com";

// 관리자 모드 비밀번호도 같은 방식으로, 위 계정과는 "별도의" 이메일/비밀번호
// 사용자로 관리해요. 사이드바에서 관리자 모드로 전환할 때 입력한 비밀번호를
// 이 계정으로 실제 로그인해서 확인하고, 카드 저장/삭제도 전부 이 계정을 통해
// 나가요. Firestore 보안 규칙에서 쓰기(write)를 이 이메일로 로그인된 경우만
// 허용하도록 설정해야 실제로 안전해져요 (콘솔 → Firestore Database → Rules):
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /blocks/{blockId} {
//         allow read: if request.auth != null;
//         allow write: if request.auth != null
//                      && request.auth.token.email == "aeoniandreams@gmail.com";
//       }
//     }
//   }
window.FIREBASE_ADMIN_EMAIL = "aeoniandreams@gmail.com";
