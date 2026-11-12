// ==============================================================================
// FILE: frontend/src/services/firebase.js
// MÔ TẢ: Khởi tạo Firebase Authentication & Google Sign-In Provider
// ==============================================================================

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDlKmoRXZHtA452D9zOZgnpDSfKD-8EV5g",
  authDomain: "matchingai-4bfba.firebaseapp.com",
  projectId: "matchingai-4bfba",
  storageBucket: "matchingai-4bfba.firebasestorage.app",
  messagingSenderId: "685369627851",
  appId: "1:685369627851:web:17e808dbfd227b9069774e",
  measurementId: "G-YZS95LPMFW"
};

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// Khởi tạo Auth & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Đảm bảo Google popup luôn hỏi chọn tài khoản (tránh tự động đăng nhập nhầm)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Đăng nhập bằng Google qua Popup của Firebase
 * Trả về dữ liệu người dùng để đồng bộ vào cơ sở dữ liệu PostgreSQL
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  return {
    email: user.email,
    full_name: user.displayName || user.email?.split('@')[0] || 'Người dùng Google',
    avatar_url: user.photoURL || null,
    firebase_uid: user.uid,
  };
}

export async function signOutFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn("Lỗi khi đăng xuất Firebase:", error);
  }
}
