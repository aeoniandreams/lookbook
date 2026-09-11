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
window.FIREBASE_AUTH_EMAIL = "ae0niandreams@gmail.com";

// 관리자 모드 비밀번호도 같은 방식으로 확인해요. Firebase Authentication에
// 위 계정과는 "별도의" 이메일/비밀번호 사용자를 하나 더 만들고, 그 이메일
// 주소를 여기에 적어주세요. 사이드바에서 관리자 모드로 전환할 때 입력한
// 비밀번호를 이 계정으로 로그인 시도해서(성공하면 즉시 로그아웃) 맞는지
// 확인만 하고, 실제 로그인 세션은 위 공용 계정 그대로 유지돼요.
window.FIREBASE_ADMIN_EMAIL = "ae0niandreams-admin@gmail.com";
