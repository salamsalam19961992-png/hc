// Firebase Configuration Template
// قم بنسخ هذا الملف إلى firebase-config.js وأضف إعدادات Firebase الخاصة بك

const firebaseConfig = {
    // إعدادات Firebase الخاصة بك
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// تصدير الإعدادات للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
} else {
    window.firebaseConfig = firebaseConfig;
}
