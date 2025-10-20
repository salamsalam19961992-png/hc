// ملف البيانات الافتراضية - يمكن استيراده وإضافته بسهولة
// Default Data File - Can be imported and added easily

// الفئات المثمنة الافتراضية
const defaultPricedCategories = [
    { id: '1', name: 'فئة 1500 دينار', price: 1500, quantity: 100, total: 150000, used: 0, remaining: 100 },
    { id: '2', name: 'فئة 3000 دينار', price: 3000, quantity: 100, total: 300000, used: 0, remaining: 100 },
    { id: '3', name: 'فئة 4000 دينار', price: 4000, quantity: 100, total: 400000, used: 0, remaining: 100 },
    { id: '4', name: 'فئة 5000 دينار', price: 5000, quantity: 100, total: 500000, used: 0, remaining: 100 },
    { id: '5', name: 'فئة 25000 دينار', price: 25000, quantity: 50, total: 1250000, used: 0, remaining: 50 },
    { id: '6', name: 'فئة 40000 دينار', price: 40000, quantity: 50, total: 2000000, used: 0, remaining: 50 }
];

// الفئات غير المثمنة الافتراضية
const defaultUnpricedCategories = [
    { id: '1', name: 'وصل الحاسبة 92', quantity: 50, used: 0, remaining: 50 },
    { id: '2', name: 'وصل الحاسبة 37', quantity: 50, used: 0, remaining: 50 },
    { id: '3', name: 'وصل قبض تامينات الجناح الخاص', quantity: 50, used: 0, remaining: 50 },
    { id: '4', name: 'قائمة حساب الجناح الخاص', quantity: 50, used: 0, remaining: 50 },
    { id: '5', name: 'تقارير امراض مزمنة', quantity: 50, used: 0, remaining: 50 },
    { id: '6', name: 'بطاقة امرض مزمنة', quantity: 50, used: 0, remaining: 50 },
    { id: '7', name: 'مستند اخراج تخزين للبطاقات', quantity: 50, used: 0, remaining: 50 },
    { id: '8', name: 'مستند اخراج تخزين للادوية', quantity: 50, used: 0, remaining: 50 },
    { id: '9', name: 'مستند ادخال تخزين', quantity: 50, used: 0, remaining: 50 },
    { id: '10', name: 'قرار لجنة طبية', quantity: 50, used: 0, remaining: 50 }
];

// العيادات والمشاريع والقطاعات الافتراضية
// يمكنك إضافة أسماء العيادات والمشاريع والقطاعات هنا
const defaultClinics = [
    // العيادات
    { id: 'clinic_1', name: 'عيادة القلب', category: 'clinic', type: 'تخصصية', location: 'الطابق الأول', status: 'active' },
    { id: 'clinic_2', name: 'عيادة العيون', category: 'clinic', type: 'تخصصية', location: 'الطابق الثاني', status: 'active' },
    { id: 'clinic_3', name: 'عيادة الأسنان', category: 'clinic', type: 'تخصصية', location: 'الطابق الأول', status: 'active' },
    { id: 'clinic_4', name: 'عيادة الأطفال', category: 'clinic', type: 'عامة', location: 'الطابق الأرضي', status: 'active' },
    { id: 'clinic_5', name: 'عيادة النساء', category: 'clinic', type: 'تخصصية', location: 'الطابق الثاني', status: 'active' },
    
    // المشاريع
    { id: 'project_1', name: 'مشروع الصحة المدرسية', category: 'project', type: 'تعليمي', location: 'المدارس', status: 'active' },
    { id: 'project_2', name: 'مشروع التوعية الصحية', category: 'project', type: 'توعوي', location: 'المجتمع', status: 'active' },
    { id: 'project_3', name: 'مشروع الفحص الشامل', category: 'project', type: 'وقائي', location: 'المراكز الصحية', status: 'active' },
    { id: 'project_4', name: 'مشروع التطعيم', category: 'project', type: 'وقائي', location: 'جميع المناطق', status: 'active' },
    
    // القطاعات
    { id: 'sector_1', name: 'قطاع الطوارئ', category: 'sector', type: 'طوارئ', location: 'المستشفى الرئيسي', status: 'active' },
    { id: 'sector_2', name: 'قطاع الجراحة', category: 'sector', type: 'جراحي', location: 'المستشفى الرئيسي', status: 'active' },
    { id: 'sector_3', name: 'قطاع المختبرات', category: 'sector', type: 'تشخيصي', location: 'المبنى الجانبي', status: 'active' },
    { id: 'sector_4', name: 'قطاع الأشعة', category: 'sector', type: 'تشخيصي', location: 'المبنى الجانبي', status: 'active' }
];

// دالة لتحميل البيانات الافتراضية
function loadDefaultData() {
    return {
        priced: defaultPricedCategories,
        unpriced: defaultUnpricedCategories,
        clinics: defaultClinics
    };
}

// دالة لحفظ البيانات الحالية
function saveCurrentData() {
    return {
        priced: categories.priced,
        unpriced: categories.unpriced,
        clinics: categories.clinics,
        timestamp: new Date().toISOString()
    };
}

// دالة لاستعادة البيانات المحفوظة
function restoreData(savedData) {
    categories.priced = savedData.priced || [];
    categories.unpriced = savedData.unpriced || [];
    categories.clinics = savedData.clinics || [];
    
    // إعادة عرض البيانات
    renderPricedCategories();
    renderUnpricedCategories();
    renderClinics();
    
    // حفظ في localStorage
    saveToLocalStorage();
    
    showMessage('تم استعادة البيانات بنجاح', 'success');
}

// تصدير البيانات للاستخدام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        defaultPricedCategories,
        defaultUnpricedCategories,
        defaultClinics,
        loadDefaultData,
        saveCurrentData,
        restoreData
    };
} else {
    window.defaultData = {
        defaultPricedCategories,
        defaultUnpricedCategories,
        defaultClinics,
        loadDefaultData,
        saveCurrentData,
        restoreData
    };
}
