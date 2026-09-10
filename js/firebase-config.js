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
