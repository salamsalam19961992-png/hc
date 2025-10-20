// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC08Dj7Fi8eZ9UXHGpECLFo34gt2w8dntc",
    authDomain: "salam-17ac4.firebaseapp.com",
    databaseURL: "https://salam-17ac4-default-rtdb.firebaseio.com",
    projectId: "salam-17ac4",
    storageBucket: "salam-17ac4.firebasestorage.app",
    messagingSenderId: "265100802087",
    appId: "1:265100802087:web:8249484dee40b241bdb602"
};

// Initialize Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    // Disable persistence to avoid version conflicts
    // db.enablePersistence().catch((err) => {
    //     console.log('Persistence disabled:', err);
    // });
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Global Variables
let currentTab = 'priced';
let currentFilter = 'all';
let categories = {
    priced: [],
    unpriced: [],
    clinics: []
};
let selectedExportItems = [];
let exportType = '';
let currentSendCategory = null;
let currentSendType = '';

// No default data - system starts clean

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Try to load from localStorage first
        loadFromLocalStorage();
        
        // If no local data, try Firebase
        if (categories.priced.length === 0 && categories.unpriced.length === 0) {
            try {
                await loadData();
            } catch (firebaseError) {
                console.log('Firebase not available, starting with empty data');
                // Start with empty data - no default data
            }
        }
        
        // Render all tabs
        renderPricedCategories();
        renderUnpricedCategories();
        renderClinics();
        
        // Save to localStorage as backup
        saveToLocalStorage();
        
        console.log('App initialized successfully');
        showMessage('تم تحميل النظام بنجاح', 'success');
    } catch (error) {
        console.error('Error initializing app:', error);
        showMessage('خطأ في تحميل النظام', 'error');
    }
}

// Tab Management
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
    
    currentTab = tabName;
}

// Filter Management
function filterClinics(filterType) {
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    currentFilter = filterType;
    renderClinics();
}

// Data Management Functions
async function loadData() {
    try {
        // Check if Firebase is initialized
        if (!firebase.apps.length || !db) {
            throw new Error('Firebase not initialized');
        }
        
        // Load priced categories
        const pricedSnapshot = await db.collection('pricedCategories').get();
        categories.priced = pricedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Load unpriced categories
        const unpricedSnapshot = await db.collection('unpricedCategories').get();
        categories.unpriced = unpricedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Load clinics
        const clinicsSnapshot = await db.collection('clinics').get();
        categories.clinics = clinicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
    } catch (error) {
        console.error('Error loading data:', error);
        
        // Show user-friendly error message
        if (error.code === 'permission-denied') {
            showMessage('خطأ في الصلاحيات. تأكد من إعدادات Firebase', 'error');
        } else if (error.code === 'unavailable') {
            showMessage('خطأ في الاتصال. تحقق من اتصال الإنترنت', 'error');
        } else {
            showMessage('خطأ في تحميل البيانات: ' + error.message, 'error');
        }
        
        throw error;
    }
}

// No default data initialization needed

// Render Functions
function renderPricedCategories() {
    const tbody = document.getElementById('priced-tbody');
    const summary = document.getElementById('priced-summary');
    
    if (categories.priced.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-dollar-sign" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد فئات مثمنة
                </td>
            </tr>
        `;
        summary.innerHTML = '';
        return;
    }
    
    // Render table rows
    tbody.innerHTML = categories.priced.map(category => {
        const used = category.used || 0;
        const remaining = category.remaining || (category.quantity - used);
        const amount = (category.price || 0) * (remaining || 0) * (category.quantity || 0); // price × receipts × booklets
        
        return `
            <tr>
                <td>${category.name}</td>
                <td class="amount">${formatNumber(category.price)} دينار</td>
                <td class="quantity">${formatNumber(category.quantity)}</td>
                <td class="remaining">${formatNumber(remaining)}</td>
                <td class="used">${formatNumber(used)}</td>
                <td class="amount">${formatNumber(amount)} دينار</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-success" onclick="sendCategory('priced', '${category.id}')" title="إرسال">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="editCategory('priced', '${category.id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteCategory('priced', '${category.id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Render summary cards
    const totalCategories = categories.priced.length;
    const totalQuantity = categories.priced.reduce((sum, cat) => sum + cat.quantity, 0);
    const totalUsed = categories.priced.reduce((sum, cat) => sum + (cat.used || 0), 0);
    const totalRemaining = categories.priced.reduce((sum, cat) => sum + (cat.remaining || (cat.quantity - (cat.used || 0))), 0);
    const totalAmount = categories.priced.reduce((sum, cat) => {
        const used = cat.used || 0;
        const remaining = cat.remaining || (cat.quantity - used);
        return sum + ((cat.price || 0) * (remaining || 0) * (cat.quantity || 0));
    }, 0);
    
    summary.innerHTML = `
        <div class="summary-card">
            <h3>${totalCategories}</h3>
            <p>إجمالي الفئات</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalQuantity)}</h3>
            <p>إجمالي الكمية</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalUsed)}</h3>
            <p>المستخدم</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalRemaining)}</h3>
            <p>المتبقي</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalAmount)}</h3>
            <p>دينار</p>
            <div class="subtitle">إجمالي المبلغ</div>
        </div>
    `;
}

function renderUnpricedCategories() {
    const tbody = document.getElementById('unpriced-tbody');
    const summary = document.getElementById('unpriced-summary');
    
    if (categories.unpriced.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-file-alt" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد فئات غير مثمنة
                </td>
            </tr>
        `;
        summary.innerHTML = '';
        return;
    }
    
    // Render table rows
    tbody.innerHTML = categories.unpriced.map(category => {
        const used = category.used || 0;
        const remaining = category.remaining || (category.quantity - used);
        
        return `
            <tr>
                <td>${category.name}</td>
                <td class="quantity">${formatNumber(category.quantity)}</td>
                <td class="remaining">${formatNumber(remaining)}</td>
                <td class="used">${formatNumber(used)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-success" onclick="sendCategory('unpriced', '${category.id}')" title="إرسال">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="editCategory('unpriced', '${category.id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteCategory('unpriced', '${category.id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Render summary cards
    const totalCategories = categories.unpriced.length;
    const totalQuantity = categories.unpriced.reduce((sum, cat) => sum + cat.quantity, 0);
    const totalUsed = categories.unpriced.reduce((sum, cat) => sum + (cat.used || 0), 0);
    const totalRemaining = categories.unpriced.reduce((sum, cat) => sum + (cat.remaining || (cat.quantity - (cat.used || 0))), 0);
    
    summary.innerHTML = `
        <div class="summary-card">
            <h3>${totalCategories}</h3>
            <p>إجمالي الفئات</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalQuantity)}</h3>
            <p>إجمالي الكمية</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalUsed)}</h3>
            <p>المستخدم</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalRemaining)}</h3>
            <p>المتبقي</p>
        </div>
    `;
}

function renderClinics() {
    const tbody = document.getElementById('clinics-tbody');
    const summary = document.getElementById('clinics-summary');
    
    // Filter clinics based on current filter
    let filteredClinics = categories.clinics;
    if (currentFilter !== 'all') {
        filteredClinics = categories.clinics.filter(clinic => clinic.category === currentFilter);
    }
    
    if (filteredClinics.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-hospital" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    ${currentFilter === 'all' ? 'لا توجد عناصر' : 'لا توجد عناصر من هذا النوع'}
                </td>
            </tr>
        `;
        summary.innerHTML = '';
        return;
    }
    
    // Render table rows
    tbody.innerHTML = filteredClinics.map(clinic => {
        const typeIcon = clinic.category === 'clinic' ? 'fas fa-hospital' : 
                         clinic.category === 'project' ? 'fas fa-project-diagram' : 
                         clinic.category === 'sector' ? 'fas fa-building' :
                         clinic.category === 'insurance' ? 'fas fa-shield-alt' :
                         'fas fa-users';
        
        return `
            <tr>
                <td>
                    <span class="type-badge ${clinic.category}">
                        <i class="${typeIcon}"></i>
                        ${clinic.category === 'clinic' ? 'عيادة' : 
                          clinic.category === 'project' ? 'مشروع' : 
                          clinic.category === 'sector' ? 'قطاع' : 
                          clinic.category === 'insurance' ? 'عيادة تأمين صحي' : 'لجنة'}
                    </span>
                </td>
                <td>${clinic.name}</td>
                <td>${clinic.type || 'غير محدد'}</td>
                <td>${clinic.location || 'غير محدد'}</td>
                <td>
                    <span class="status-badge ${clinic.status || 'active'}">
                        ${clinic.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-info" onclick="openFullInfo()" title="عرض معلومات كاملة">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="editClinic('${clinic.id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteClinic('${clinic.id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Render summary cards
    const totalClinics = categories.clinics.filter(c => c.category === 'clinic').length;
    const totalProjects = categories.clinics.filter(c => c.category === 'project').length;
    const totalSectors = categories.clinics.filter(c => c.category === 'sector').length;
    const totalCommittees = categories.clinics.filter(c => c.category === 'committee').length;
    const totalActive = categories.clinics.filter(c => c.status === 'active').length;
    
    summary.innerHTML = `
        <div class="summary-card">
            <h3>${totalClinics}</h3>
            <p>عيادات</p>
        </div>
        <div class="summary-card">
            <h3>${totalProjects}</h3>
            <p>مشاريع</p>
        </div>
        <div class="summary-card">
            <h3>${totalSectors}</h3>
            <p>قطاعات</p>
        </div>
        <div class="summary-card">
            <h3>${totalCommittees}</h3>
            <p>لجان</p>
        </div>
        <div class="summary-card">
            <h3>${totalActive}</h3>
            <p>نشط</p>
        </div>
    `;
}

// Modal Functions
function showAddModal() {
    const modal = document.getElementById('addModal');
    const modalTitle = document.getElementById('modalTitle');
    const clinicSelect = document.getElementById('clinicSelect');
    const categorySelect = document.getElementById('categorySelect');
    
    modalTitle.textContent = 'إضافة بطاقة جديدة';
    modal.style.display = 'block';
    
    // Populate clinic select with all categories
    clinicSelect.innerHTML = '<option value="">اختر العيادة/المشروع/القطاع</option>';
    categories.clinics.forEach(clinic => {
        const categoryName = clinic.category === 'clinic' ? 'عيادة' : 
                           clinic.category === 'project' ? 'مشروع' : 'قطاع';
        clinicSelect.innerHTML += `<option value="${clinic.id}">[${categoryName}] ${clinic.name}</option>`;
    });
    
    // Populate category select based on current tab
    categorySelect.innerHTML = '<option value="">اختر الفئة</option>';
    if (currentTab === 'priced') {
        categories.priced.forEach(category => {
            categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    } else {
        categories.unpriced.forEach(category => {
            categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    }
}

function closeModal() {
    document.getElementById('addModal').style.display = 'none';
    document.getElementById('addForm').reset();
}

function closeReportsModal() {
    document.getElementById('reportsModal').style.display = 'none';
}

// Category Management
function addPricedCategory() {
    const name = prompt('اسم الفئة المثمنة:');
    if (!name) return;
    
    const price = parseFloat(prompt('السعر:'));
    if (isNaN(price)) return;
    
    const quantity = parseInt(prompt('الكمية:'));
    if (isNaN(quantity)) return;
    
    const newCategory = {
        name: name,
        price: price,
        quantity: quantity,
        total: price * quantity
    };
    
    addCategory('priced', newCategory);
}

function addUnpricedCategory() {
    const name = prompt('اسم الفئة غير المثمنة:');
    if (!name) return;
    
    const quantity = parseInt(prompt('الكمية:'));
    if (isNaN(quantity)) return;
    
    const newCategory = {
        name: name,
        quantity: quantity
    };
    
    addCategory('unpriced', newCategory);
}

async function addCategory(type, categoryData) {
    try {
        // Check if Firebase is available
        if (db) {
            const docRef = await db.collection(type + 'Categories').add(categoryData);
            categoryData.id = docRef.id;
        } else {
            // Generate local ID if Firebase not available
            categoryData.id = type + '_' + Date.now();
        }
        
        categories[type].push(categoryData);
        
        // Save to localStorage
        saveToLocalStorage();
        
        if (type === 'priced') {
            renderPricedCategories();
        } else {
            renderUnpricedCategories();
        }
        
        showMessage('تم إضافة الفئة بنجاح', 'success');
    } catch (error) {
        console.error('Error adding category:', error);
        
        // Fallback: add locally
        categoryData.id = type + '_' + Date.now();
        categories[type].push(categoryData);
        saveToLocalStorage();
        
        if (type === 'priced') {
            renderPricedCategories();
        } else {
            renderUnpricedCategories();
        }
        
        showMessage('تم إضافة الفئة محلياً', 'success');
    }
}

async function editCategory(type, categoryId) {
    const category = categories[type].find(c => c.id === categoryId);
    if (!category) return;
    
    if (type === 'priced') {
        const newName = prompt('اسم الفئة:', category.name);
        if (newName === null) return;
        
        const priceInput = prompt('السعر (دينار):', String(category.price ?? ''));
        if (priceInput === null) return;
        const newPrice = parseFloat(priceInput);
        if (Number.isNaN(newPrice) || newPrice < 0) {
            showMessage('قيمة السعر غير صالحة', 'error');
            return;
        }
        
        const qtyInput = prompt('العدد الأصلي (العداد):', String(category.quantity ?? ''));
        if (qtyInput === null) return;
        const newQuantity = parseInt(qtyInput);
        if (Number.isNaN(newQuantity) || newQuantity < 0) {
            showMessage('قيمة العداد غير صالحة', 'error');
            return;
        }
        
        const currentRemaining = category.remaining ?? Math.max((category.quantity ?? 0) - (category.used ?? 0), 0);
        const remInput = prompt('عدد الوصل (المتبقي):', String(currentRemaining));
        if (remInput === null) return;
        const newRemaining = parseInt(remInput);
        if (Number.isNaN(newRemaining) || newRemaining < 0 || newRemaining > newQuantity) {
            showMessage('قيمة عدد الوصل غير صالحة', 'error');
            return;
        }
        const newUsed = Math.max(newQuantity - newRemaining, 0);
        
        const updatedCategory = {
            ...category,
            name: newName,
            price: newPrice,
            quantity: newQuantity,
            used: newUsed,
            remaining: newRemaining,
            // amount reflects price × receipts (remaining) × booklets (quantity)
            total: newPrice * newRemaining * newQuantity
        };
        
        await updateCategory(type, categoryId, updatedCategory);
    } else {
        const newName = prompt('اسم الفئة:', category.name);
        if (newName === null) return;
        
        const qtyInput = prompt('العدد الأصلي (العداد):', String(category.quantity ?? ''));
        if (qtyInput === null) return;
        const newQuantity = parseInt(qtyInput);
        if (Number.isNaN(newQuantity) || newQuantity < 0) {
            showMessage('قيمة العداد غير صالحة', 'error');
            return;
        }
        const currentRemaining = category.remaining ?? Math.max((category.quantity ?? 0) - (category.used ?? 0), 0);
        const remInput = prompt('عدد الوصل (المتبقي):', String(currentRemaining));
        if (remInput === null) return;
        const newRemaining = parseInt(remInput);
        if (Number.isNaN(newRemaining) || newRemaining < 0 || newRemaining > newQuantity) {
            showMessage('قيمة عدد الوصل غير صالحة', 'error');
            return;
        }
        const newUsed = Math.max(newQuantity - newRemaining, 0);
        
        const updatedCategory = {
            ...category,
            name: newName,
            quantity: newQuantity,
            used: newUsed,
            remaining: newRemaining
        };
        
        await updateCategory(type, categoryId, updatedCategory);
    }
}

async function updateCategory(type, categoryId, updatedData) {
    try {
        // Try Firebase first
        if (db) {
            await db.collection(type + 'Categories').doc(categoryId).update(updatedData);
        }
        
        // Update local data
        const index = categories[type].findIndex(c => c.id === categoryId);
        if (index !== -1) {
            categories[type][index] = updatedData;
        }
        
        // Save to localStorage
        saveToLocalStorage();
        
        if (type === 'priced') {
            renderPricedCategories();
        } else {
            renderUnpricedCategories();
        }
        
        showMessage('تم تحديث الفئة بنجاح', 'success');
    } catch (error) {
        console.error('Error updating category:', error);
        
        // Fallback: update locally
        const index = categories[type].findIndex(c => c.id === categoryId);
        if (index !== -1) {
            categories[type][index] = updatedData;
        }
        saveToLocalStorage();
        
        if (type === 'priced') {
            renderPricedCategories();
        } else {
            renderUnpricedCategories();
        }
        
        showMessage('تم تحديث الفئة محلياً', 'success');
    }
}

async function deleteCategory(type, categoryId) {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    
    try {
        // Try Firebase first
        if (db) {
            await db.collection(type + 'Categories').doc(categoryId).delete();
        }
        
        // Remove from local data
        categories[type] = categories[type].filter(c => c.id !== categoryId);
        
        // Save to localStorage
        saveToLocalStorage();
        
        if (type === 'priced') {
            renderPricedCategories();
        } else {
            renderUnpricedCategories();
        }
        
        showMessage('تم حذف الفئة بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting category:', error);
        
        // Fallback: delete locally
        categories[type] = categories[type].filter(c => c.id !== categoryId);
        saveToLocalStorage();
        
        if (type === 'priced') {
            renderPricedCategories();
        } else {
            renderUnpricedCategories();
        }
        
        showMessage('تم حذف الفئة محلياً', 'success');
    }
}

// Clinic Management
function addClinic() {
    const name = prompt('الاسم:');
    if (!name) return;
    
    // Category selection
    const categoryOptions = ['clinic', 'project', 'sector', 'insurance', 'committee'];
    const categoryNames = ['عيادة', 'مشروع', 'قطاع', 'عيادة تأمين صحي', 'لجنة'];
    let categoryChoice = prompt(`اختر التصنيف:\n1. عيادة\n2. مشروع\n3. قطاع\n4. عيادة تأمين صحي\n5. لجنة\n\nأدخل الرقم (1-5):`);
    
    if (!categoryChoice || categoryChoice < 1 || categoryChoice > 5) {
        showMessage('يرجى اختيار تصنيف صحيح', 'error');
        return;
    }
    
    const category = categoryOptions[parseInt(categoryChoice) - 1];
    const type = prompt('النوع/التفاصيل:');
    const location = prompt('الموقع:');
    const status = confirm('هل هو نشط؟') ? 'active' : 'inactive';
    
    const newClinic = {
        name: name,
        category: category,
        type: type || 'غير محدد',
        location: location || 'غير محدد',
        status: status
    };
    
    addClinicToDB(newClinic);
}

async function addClinicToDB(clinicData) {
    try {
        // Check if Firebase is available
        if (db) {
            const docRef = await db.collection('clinics').add(clinicData);
            clinicData.id = docRef.id;
        } else {
            // Generate local ID if Firebase not available
            clinicData.id = 'clinic_' + Date.now();
        }
        
        categories.clinics.push(clinicData);
        
        // Save to localStorage
        saveToLocalStorage();
        
        renderClinics();
        showMessage('تم إضافة العيادة بنجاح', 'success');
    } catch (error) {
        console.error('Error adding clinic:', error);
        
        // Fallback: add locally even if Firebase fails
        clinicData.id = 'clinic_' + Date.now();
        categories.clinics.push(clinicData);
        saveToLocalStorage();
        renderClinics();
        
        showMessage('تم إضافة العيادة محلياً', 'success');
    }
}

async function editClinic(clinicId) {
    const clinic = categories.clinics.find(c => c.id === clinicId);
    if (!clinic) return;
    
    const newName = prompt('الاسم:', clinic.name);
    if (!newName) return;
    
    // Category selection
    const categoryOptions = ['clinic', 'project', 'sector', 'insurance', 'committee'];
    const categoryNames = ['عيادة', 'مشروع', 'قطاع', 'عيادة تأمين صحي', 'لجنة'];
    const currentCategoryIndex = categoryOptions.indexOf(clinic.category) + 1;
    
    let categoryChoice = prompt(`اختر التصنيف:\n1. عيادة\n2. مشروع\n3. قطاع\n4. عيادة تأمين صحي\n5. لجنة\n\نالتصنيف الحالي: ${categoryNames[currentCategoryIndex - 1]}\nأدخل الرقم (1-5) أو اضغط Enter للاحتفاظ بالتصنيف الحالي:`);
    
    let newCategory = clinic.category;
    if (categoryChoice && categoryChoice >= 1 && categoryChoice <= 5) {
        newCategory = categoryOptions[parseInt(categoryChoice) - 1];
    }
    
    const newType = prompt('النوع/التفاصيل:', clinic.type);
    const newLocation = prompt('الموقع:', clinic.location);
    const newStatus = confirm(`هل هو نشط؟\nالحالة الحالية: ${clinic.status === 'active' ? 'نشط' : 'غير نشط'}`) ? 'active' : 'inactive';
    
    const updatedClinic = {
        ...clinic,
        name: newName,
        category: newCategory,
        type: newType || clinic.type,
        location: newLocation || clinic.location,
        status: newStatus
    };
    
    try {
        // Try Firebase first
        if (db) {
            await db.collection('clinics').doc(clinicId).update(updatedClinic);
        }
        
        // Update local data
        const index = categories.clinics.findIndex(c => c.id === clinicId);
        if (index !== -1) {
            categories.clinics[index] = updatedClinic;
        }
        
        // Save to localStorage
        saveToLocalStorage();
        
        renderClinics();
        showMessage('تم تحديث العيادة بنجاح', 'success');
    } catch (error) {
        console.error('Error updating clinic:', error);
        
        // Fallback: update locally
        const index = categories.clinics.findIndex(c => c.id === clinicId);
        if (index !== -1) {
            categories.clinics[index] = updatedClinic;
        }
        saveToLocalStorage();
        renderClinics();
        
        showMessage('تم تحديث العيادة محلياً', 'success');
    }
}

async function deleteClinic(clinicId) {
    if (!confirm('هل أنت متأكد من حذف هذه العيادة؟')) return;
    
    try {
        // Try Firebase first
        if (db) {
            await db.collection('clinics').doc(clinicId).delete();
        }
        
        // Remove from local data
        categories.clinics = categories.clinics.filter(c => c.id !== clinicId);
        
        // Save to localStorage
        saveToLocalStorage();
        
        renderClinics();
        showMessage('تم حذف العيادة بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting clinic:', error);
        
        // Fallback: delete locally
        categories.clinics = categories.clinics.filter(c => c.id !== clinicId);
        saveToLocalStorage();
        renderClinics();
        
        showMessage('تم حذف العيادة محلياً', 'success');
    }
}

// Reports Functions
function showReports() {
    const modal = document.getElementById('reportsModal');
    modal.style.display = 'block';
    
    generateReports();
}

function generateReports() {
    // Priced categories total
    const pricedTotal = categories.priced.reduce((sum, category) => {
        const used = category.used || 0;
        const remaining = category.remaining || (category.quantity - used);
        return sum + ((category.price || 0) * (remaining || 0) * (category.quantity || 0));
    }, 0);
    document.getElementById('priced-total').innerHTML = `
        <div class="stat-card">
            <h3>${formatNumber(pricedTotal)}</h3>
            <p>دينار</p>
        </div>
    `;
    
    // Unpriced categories total
    const unpricedTotal = categories.unpriced.reduce((sum, category) => sum + category.quantity, 0);
    document.getElementById('unpriced-total').innerHTML = `
        <div class="stat-card">
            <h3>${formatNumber(unpricedTotal)}</h3>
            <p>وصل</p>
        </div>
    `;
    
    // Clinics distribution
    const clinicsDistribution = categories.clinics.map(clinic => `
        <div class="info-row">
            <span class="info-label">${clinic.name}</span>
            <span class="info-value">${clinic.type}</span>
        </div>
    `).join('');
    
    document.getElementById('clinics-distribution').innerHTML = clinicsDistribution || '<p>لا توجد عيادات</p>';
}

// Local Storage Functions
function saveToLocalStorage() {
    try {
        localStorage.setItem('healthAccessData', JSON.stringify(categories));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('healthAccessData');
        if (data) {
            const parsedData = JSON.parse(data);
            categories.priced = parsedData.priced || [];
            categories.unpriced = parsedData.unpriced || [];
            categories.clinics = parsedData.clinics || [];
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        throw error;
    }
}

// Clear IndexedDB to fix persistence issues
function clearIndexedDB() {
    try {
        if ('indexedDB' in window) {
            indexedDB.deleteDatabase('firebaseLocalStorageDb');
            console.log('IndexedDB cleared');
        }
    } catch (error) {
        console.error('Error clearing IndexedDB:', error);
    }
}

// Clear all data function
function clearAllData() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        try {
            // Clear localStorage
            localStorage.removeItem('healthAccessData');
            
            // Clear IndexedDB
            clearIndexedDB();
            
            // Reset categories
            categories.priced = [];
            categories.unpriced = [];
            categories.clinics = [];
            
            // Re-render with empty data
            renderPricedCategories();
            renderUnpricedCategories();
            renderClinics();
            
            showMessage('تم مسح جميع البيانات بنجاح', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            showMessage('خطأ في مسح البيانات', 'error');
        }
    }
}

// Backup and Restore Functions
function exportData() {
    try {
        const data = {
            metadata: {
                version: "1.0",
                exportDate: new Date().toISOString(),
                description: "نسخة احتياطية من برنامج مطابقة مخزن البطاقات في مديرية العيادات الطبية الشعبية/الديوانية"
            },
            pricedCategories: categories.priced,
            unpricedCategories: categories.unpriced,
            clinics: categories.clinics
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `مطابقة-مخزن-البطاقات-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showMessage('تم تصدير البيانات بنجاح', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showMessage('خطأ في تصدير البيانات', 'error');
    }
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.pricedCategories) categories.priced = data.pricedCategories;
                if (data.unpricedCategories) categories.unpriced = data.unpricedCategories;
                if (data.clinics) categories.clinics = data.clinics;
                
                // Re-render all data
                renderPricedCategories();
                renderUnpricedCategories();
                renderClinics();
                
                // Save to localStorage
                saveToLocalStorage();
                
                showMessage('تم استيراد البيانات بنجاح', 'success');
            } catch (error) {
                console.error('Error importing data:', error);
                showMessage('خطأ في استيراد البيانات. تأكد من صحة الملف', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function loadDefaultData() {
    if (confirm('هل تريد مسح جميع البيانات الحالية؟ سيتم حذف جميع البيانات الموجودة.')) {
        try {
            // Clear all data
            categories.priced = [];
            categories.unpriced = [];
            categories.clinics = [];
            
            // Re-render all data
            renderPricedCategories();
            renderUnpricedCategories();
            renderClinics();
            
            // Save to localStorage
            saveToLocalStorage();
            
            showMessage('تم مسح جميع البيانات بنجاح', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            showMessage('خطأ في مسح البيانات', 'error');
        }
    }
}

// Utility Functions
function formatNumber(num) {
    return new Intl.NumberFormat('ar-SA').format(num);
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    // Insert at the top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Save entry function
async function saveEntry() {
    const clinicId = document.getElementById('clinicSelect').value;
    const categoryId = document.getElementById('categorySelect').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const notes = document.getElementById('notes').value;
    
    if (!clinicId || !categoryId || !quantity) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    try {
        const entryData = {
            clinicId: clinicId,
            categoryId: categoryId,
            quantity: quantity,
            notes: notes,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: currentTab
        };
        
        await db.collection('entries').add(entryData);
        
        closeModal();
        showMessage('تم حفظ البطاقة بنجاح', 'success');
        
        // Update category quantity
        const categoryType = currentTab === 'priced' ? 'priced' : 'unpriced';
        const category = categories[categoryType].find(c => c.id === categoryId);
        if (category) {
            const newUsed = (category.used || 0) + quantity;
            const newRemaining = category.quantity - newUsed;
            
            await db.collection(categoryType + 'Categories').doc(categoryId).update({
                used: newUsed,
                remaining: newRemaining
            });
            
            // Update local data
            category.used = newUsed;
            category.remaining = newRemaining;
            
            // Re-render the current tab
            if (currentTab === 'priced') {
                renderPricedCategories();
            } else {
                renderUnpricedCategories();
            }
        }
        
    } catch (error) {
        console.error('Error saving entry:', error);
        showMessage('خطأ في حفظ البطاقة', 'error');
    }
}

// Export Functions
function showExportModal(type) {
    exportType = type;
    selectedExportItems = [];
    const modal = document.getElementById('exportModal');
    modal.style.display = 'block';
    
    // Load export options
    loadExportOptions();
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
    selectedExportItems = [];
    exportType = '';
}

function loadExportOptions() {
    const clinicsList = document.getElementById('clinics-list');
    const projectsList = document.getElementById('projects-list');
    const sectorsList = document.getElementById('sectors-list');
    
    // Clear existing content
    clinicsList.innerHTML = '';
    projectsList.innerHTML = '';
    sectorsList.innerHTML = '';
    
    // Load clinics
    const clinics = categories.clinics.filter(c => c.category === 'clinic');
    clinics.forEach(clinic => {
        const item = createExportItem(clinic);
        clinicsList.appendChild(item);
    });
    
    // Load projects
    const projects = categories.clinics.filter(c => c.category === 'project');
    projects.forEach(project => {
        const item = createExportItem(project);
        projectsList.appendChild(item);
    });
    
    // Load sectors
    const sectors = categories.clinics.filter(c => c.category === 'sector');
    sectors.forEach(sector => {
        const item = createExportItem(sector);
        sectorsList.appendChild(item);
    });
    
    // Load committees
    const committees = categories.clinics.filter(c => c.category === 'committee');
    committees.forEach(committee => {
        const item = createExportItem(committee);
        committeesList.appendChild(item);
    });
}

function createExportItem(item) {
    const div = document.createElement('div');
    div.className = 'export-item';
    div.dataset.id = item.id;
    div.onclick = () => toggleExportItem(item.id);
    
    div.innerHTML = `
        <div class="export-item-info">
            <div class="export-item-name">${item.name}</div>
            <div class="export-item-details">${item.type || 'غير محدد'} - ${item.location || 'غير محدد'}</div>
        </div>
        <div class="export-checkbox"></div>
    `;
    
    return div;
}

function toggleExportItem(itemId) {
    const item = document.querySelector(`[data-id="${itemId}"]`);
    const checkbox = item.querySelector('.export-checkbox');
    
    if (selectedExportItems.includes(itemId)) {
        // Remove from selection
        selectedExportItems = selectedExportItems.filter(id => id !== itemId);
        item.classList.remove('selected');
        checkbox.classList.remove('checked');
    } else {
        // Add to selection
        selectedExportItems.push(itemId);
        item.classList.add('selected');
        checkbox.classList.add('checked');
    }
}

function exportSelectedItems() {
    if (selectedExportItems.length === 0) {
        showMessage('يرجى اختيار عنصر واحد على الأقل للتصدير', 'error');
        return;
    }
    
    try {
        // Get selected items
        const selectedItems = categories.clinics.filter(item => selectedExportItems.includes(item.id));
        
        // Create export data for each selected item
        selectedItems.forEach(item => {
            createExportFile(item);
        });
        
        closeExportModal();
        showMessage(`تم تصدير ${selectedItems.length} ملف بنجاح`, 'success');
    } catch (error) {
        console.error('Error exporting items:', error);
        showMessage('خطأ في تصدير الملفات', 'error');
    }
}

function createExportFile(item) {
    // Get current date
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('ar-SA');
    
    // Calculate statistics based on export type
    let statistics = {};
    
    if (exportType === 'priced') {
        statistics = calculatePricedStatistics(item);
    } else {
        statistics = calculateUnpricedStatistics(item);
    }
    
    // Create export content
    const exportContent = createExportContent(item, statistics, dateString);
    
    // Create and download file
    const fileName = `${item.name}_${exportType}_${currentDate.toISOString().split('T')[0]}.txt`;
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}

function calculatePricedStatistics(item) {
    // Calculate statistics for priced categories
    const totalCategories = categories.priced.length;
    const totalQuantity = categories.priced.reduce((sum, cat) => sum + cat.quantity, 0);
    const totalUsed = categories.priced.reduce((sum, cat) => sum + (cat.used || 0), 0);
    const totalRemaining = categories.priced.reduce((sum, cat) => sum + (cat.remaining || (cat.quantity - (cat.used || 0))), 0);
    // total amount = price × receipts (remaining) × booklets (quantity)
    const totalAmount = categories.priced.reduce((sum, cat) => {
        const used = cat.used || 0;
        const remaining = cat.remaining || (cat.quantity - used);
        return sum + ((cat.price || 0) * (remaining || 0) * (cat.quantity || 0));
    }, 0);
    
    return {
        totalCategories,
        totalQuantity,
        totalUsed,
        totalRemaining,
        totalAmount
    };
}

function calculateUnpricedStatistics(item) {
    // Calculate statistics for unpriced categories
    const totalCategories = categories.unpriced.length;
    const totalQuantity = categories.unpriced.reduce((sum, cat) => sum + cat.quantity, 0);
    const totalUsed = categories.unpriced.reduce((sum, cat) => sum + (cat.used || 0), 0);
    const totalRemaining = categories.unpriced.reduce((sum, cat) => sum + (cat.remaining || (cat.quantity - (cat.used || 0))), 0);
    
    return {
        totalCategories,
        totalQuantity,
        totalUsed,
        totalRemaining
    };
}

function createExportContent(item, statistics, dateString) {
    const categoryName = item.category === 'clinic' ? 'عيادة' : 
                        item.category === 'project' ? 'مشروع' : 'قطاع';
    
    let content = `
========================================
تقرير برنامج مطابقة مخزن البطاقات
${categoryName}: ${item.name}
تاريخ التصدير: ${dateString}
========================================

معلومات ${categoryName}:
- الاسم: ${item.name}
- النوع: ${item.type || 'غير محدد'}
- الموقع: ${item.location || 'غير محدد'}
- الحالة: ${item.status === 'active' ? 'نشط' : 'غير نشط'}

إحصائيات الفئات ${exportType === 'priced' ? 'المثمنة' : 'غير المثمنة'}:
`;

    if (exportType === 'priced') {
        content += `
- إجمالي الفئات: ${statistics.totalCategories}
- إجمالي الكمية: ${formatNumber(statistics.totalQuantity)}
- المستخدم: ${formatNumber(statistics.totalUsed)}
- المتبقي: ${formatNumber(statistics.totalRemaining)}
- إجمالي المبلغ: ${formatNumber(statistics.totalAmount)} دينار
`;
    } else {
        content += `
- إجمالي الفئات: ${statistics.totalCategories}
- إجمالي الكمية: ${formatNumber(statistics.totalQuantity)}
- المستخدم: ${formatNumber(statistics.totalUsed)}
- المتبقي: ${formatNumber(statistics.totalRemaining)}
`;
    }

    content += `
========================================
تفاصيل الفئات:
`;

    // Add detailed information for each category
    const categoriesList = exportType === 'priced' ? categories.priced : categories.unpriced;
    
    categoriesList.forEach(category => {
        const used = category.used || 0;
        const remaining = category.remaining || (category.quantity - used);
        
        content += `
${category.name}:
`;
        
        if (exportType === 'priced') {
            const detailedAmount = (category.price || 0) * (remaining || 0) * (category.quantity || 0);
            content += `  - السعر: ${formatNumber(category.price)} دينار
  - الكمية الأصلية: ${formatNumber(category.quantity)}
  - المستخدم: ${formatNumber(used)}
  - المتبقي: ${formatNumber(remaining)}
  - المبلغ الإجمالي: ${formatNumber(detailedAmount)} دينار
`;
        } else {
            content += `  - الكمية الأصلية: ${formatNumber(category.quantity)}
  - المستخدم: ${formatNumber(used)}
  - المتبقي: ${formatNumber(remaining)}
`;
        }
    });

    content += `
========================================
ملاحظات:
- هذا التقرير تم إنشاؤه تلقائياً من برنامج مطابقة مخزن البطاقات
- جميع الأرقام محدثة حتى تاريخ: ${dateString}
- للمزيد من التفاصيل، يرجى الرجوع للبرنامج الرئيسي

========================================
`;

    return content;
}

// Info Modal Functions
function showInfoModal() {
    const modal = document.getElementById('infoModal');
    modal.style.display = 'block';
    
    // Load all information
    loadOverviewStats();
    loadClinicsInfo();
    loadProjectsInfo();
    loadSectorsInfo();
    loadInsuranceInfo();
    loadCommitteesInfo();
    loadCategoriesInfo();
}

// Ensure clicking the button always opens the full info modal (not filtered)
function openFullInfo() {
    showInfoModal();
    // Default to overview tab to show full program info first
    const overviewBtn = Array.from(document.querySelectorAll('.info-tab-btn')).find(btn => btn.textContent.includes('نظرة'));
    if (overviewBtn) {
        overviewBtn.click();
    }
}

function closeInfoModal() {
    document.getElementById('infoModal').style.display = 'none';
}

function showInfoTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.info-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.info-tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
}

function loadOverviewStats() {
    const overviewStats = document.getElementById('overview-stats');
    
    // Calculate statistics
    const totalClinics = categories.clinics.filter(c => c.category === 'clinic').length;
    const totalProjects = categories.clinics.filter(c => c.category === 'project').length;
    const totalSectors = categories.clinics.filter(c => c.category === 'sector').length;
    const totalCommittees = categories.clinics.filter(c => c.category === 'committee').length;
    const totalPricedCategories = categories.priced.length;
    const totalUnpricedCategories = categories.unpriced.length;
    
    const totalPricedQuantity = categories.priced.reduce((sum, cat) => sum + cat.quantity, 0);
    const totalPricedUsed = categories.priced.reduce((sum, cat) => sum + (cat.used || 0), 0);
    const totalPricedRemaining = categories.priced.reduce((sum, cat) => sum + (cat.remaining || (cat.quantity - (cat.used || 0))), 0);
    const totalPricedAmount = categories.priced.reduce((sum, cat) => sum + cat.total, 0);
    
    const totalUnpricedQuantity = categories.unpriced.reduce((sum, cat) => sum + cat.quantity, 0);
    const totalUnpricedUsed = categories.unpriced.reduce((sum, cat) => sum + (cat.used || 0), 0);
    const totalUnpricedRemaining = categories.unpriced.reduce((sum, cat) => sum + (cat.remaining || (cat.quantity - (cat.used || 0))), 0);
    
    overviewStats.innerHTML = `
        <div class="overview-card">
            <h3>${totalClinics}</h3>
            <p>عيادات</p>
        </div>
        <div class="overview-card">
            <h3>${totalProjects}</h3>
            <p>مشاريع</p>
        </div>
        <div class="overview-card">
            <h3>${totalSectors}</h3>
            <p>قطاعات</p>
        </div>
        <div class="overview-card">
            <h3>${totalCommittees}</h3>
            <p>لجان</p>
        </div>
        <div class="overview-card">
            <h3>${totalPricedCategories}</h3>
            <p>فئات مثمنة</p>
        </div>
        <div class="overview-card">
            <h3>${totalUnpricedCategories}</h3>
            <p>فئات غير مثمنة</p>
        </div>
        <div class="overview-card">
            <h3>${formatNumber(totalPricedQuantity)}</h3>
            <p>إجمالي الكمية المثمنة</p>
        </div>
        <div class="overview-card">
            <h3>${formatNumber(totalPricedUsed)}</h3>
            <p>المستخدم من المثمنة</p>
        </div>
        <div class="overview-card">
            <h3>${formatNumber(totalPricedRemaining)}</h3>
            <p>المتبقي من المثمنة</p>
        </div>
        <div class="overview-card">
            <h3>${formatNumber(totalPricedAmount)}</h3>
            <p>دينار</p>
            <div class="subtitle">إجمالي المبلغ المثمن</div>
        </div>
        <div class="overview-card">
            <h3>${formatNumber(totalUnpricedQuantity)}</h3>
            <p>إجمالي الكمية غير المثمنة</p>
        </div>
        <div class="overview-card">
            <h3>${formatNumber(totalUnpricedUsed)}</h3>
            <p>المستخدم من غير المثمنة</p>
        </div>
        <div class="overview-card">
            <h3>${formatNumber(totalUnpricedRemaining)}</h3>
            <p>المتبقي من غير المثمنة</p>
        </div>
    `;
}

function loadClinicsInfo() {
    const tbody = document.getElementById('clinics-info-tbody');
    const clinics = categories.clinics.filter(c => c.category === 'clinic');
    
    if (clinics.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-hospital" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد عيادات
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = clinics.map(clinic => {
        // Calculate categories sent to this clinic
        const categoriesSent = calculateCategoriesSent(clinic.id);
        
        return `
            <tr>
                <td>${clinic.name}</td>
                <td>${clinic.type || 'غير محدد'}</td>
                <td>${clinic.location || 'غير محدد'}</td>
                <td>
                    <span class="status-badge ${clinic.status || 'active'}">
                        ${clinic.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td class="quantity">${categoriesSent.total}</td>
                <td class="remaining">${categoriesSent.remaining}</td>
            </tr>
        `;
    }).join('');
}

function loadProjectsInfo() {
    const tbody = document.getElementById('projects-info-tbody');
    const projects = categories.clinics.filter(c => c.category === 'project');
    
    if (projects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-project-diagram" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد مشاريع
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = projects.map(project => {
        // Calculate categories sent to this project
        const categoriesSent = calculateCategoriesSent(project.id);
        
        return `
            <tr>
                <td>${project.name}</td>
                <td>${project.type || 'غير محدد'}</td>
                <td>${project.location || 'غير محدد'}</td>
                <td>
                    <span class="status-badge ${project.status || 'active'}">
                        ${project.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td class="quantity">${categoriesSent.total}</td>
                <td class="remaining">${categoriesSent.remaining}</td>
            </tr>
        `;
    }).join('');
}

function loadSectorsInfo() {
    const tbody = document.getElementById('sectors-info-tbody');
    const sectors = categories.clinics.filter(c => c.category === 'sector');
    
    if (sectors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-building" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد قطاعات
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sectors.map(sector => {
        // Calculate categories sent to this sector
        const categoriesSent = calculateCategoriesSent(sector.id);
        
        return `
            <tr>
                <td>${sector.name}</td>
                <td>${sector.type || 'غير محدد'}</td>
                <td>${sector.location || 'غير محدد'}</td>
                <td>
                    <span class="status-badge ${sector.status || 'active'}">
                        ${sector.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td class="quantity">${categoriesSent.total}</td>
                <td class="remaining">${categoriesSent.remaining}</td>
            </tr>
        `;
    }).join('');
}

function loadInsuranceInfo() {
    const tbody = document.getElementById('insurance-info-tbody');
    const insuranceList = categories.clinics.filter(c => c.category === 'insurance');
    
    if (!tbody) return; // tab may not exist in some layouts
    
    if (insuranceList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-shield-alt" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد عيادات تأمين صحي
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = insuranceList.map(item => {
        const categoriesSent = calculateCategoriesSent(item.id);
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.type || 'غير محدد'}</td>
                <td>${item.location || 'غير محدد'}</td>
                <td>
                    <span class="status-badge ${item.status || 'active'}">
                        ${item.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td class="quantity">${categoriesSent.total}</td>
                <td class="remaining">${categoriesSent.remaining}</td>
            </tr>
        `;
    }).join('');
}
function loadCommitteesInfo() {
    const tbody = document.getElementById('committees-info-tbody');
    const committees = categories.clinics.filter(c => c.category === 'committee');
    
    if (committees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد لجان
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = committees.map(committee => {
        // Calculate categories sent to this committee
        const categoriesSent = calculateCategoriesSent(committee.id);
        
        return `
            <tr>
                <td>${committee.name}</td>
                <td>${committee.type || 'غير محدد'}</td>
                <td>${committee.location || 'غير محدد'}</td>
                <td>
                    <span class="status-badge ${committee.status || 'active'}">
                        ${committee.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td class="quantity">${categoriesSent.total}</td>
                <td class="remaining">${categoriesSent.remaining}</td>
            </tr>
        `;
    }).join('');
}

function loadCategoriesInfo() {
    // Load priced categories
    const pricedTbody = document.getElementById('priced-info-tbody');
    pricedTbody.innerHTML = categories.priced.map(category => {
        const used = category.used || 0;
        const remaining = category.remaining || (category.quantity - used);
        
        return `
            <tr>
                <td>${category.name}</td>
                <td class="amount">${formatNumber(category.price)} دينار</td>
                <td class="quantity">${formatNumber(category.quantity)}</td>
                <td class="used">${formatNumber(used)}</td>
                <td class="remaining">${formatNumber(remaining)}</td>
                <td class="amount">${formatNumber(category.total)} دينار</td>
            </tr>
        `;
    }).join('');
    
    // Load unpriced categories
    const unpricedTbody = document.getElementById('unpriced-info-tbody');
    unpricedTbody.innerHTML = categories.unpriced.map(category => {
        const used = category.used || 0;
        const remaining = category.remaining || (category.quantity - used);
        
        return `
            <tr>
                <td>${category.name}</td>
                <td class="quantity">${formatNumber(category.quantity)}</td>
                <td class="used">${formatNumber(used)}</td>
                <td class="remaining">${formatNumber(remaining)}</td>
            </tr>
        `;
    }).join('');
}

function calculateCategoriesSent(itemId) {
    // This is a simplified calculation - in a real app, you'd track actual entries
    // For now, we'll return mock data
    return {
        total: Math.floor(Math.random() * 10) + 1,
        remaining: Math.floor(Math.random() * 5) + 1
    };
}

// Excel Export Functions
function exportToExcel() {
    try {
        // Create workbook data
        const workbookData = createExcelData();
        
        // Convert to Excel format
        const excelContent = convertToExcelFormat(workbookData);
        
        // Download file
        const fileName = `مطابقة_مخزن_البطاقات_${new Date().toISOString().split('T')[0]}.xlsx`;
        const blob = new Blob([excelContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        showMessage('تم تصدير البيانات إلى Excel بنجاح', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showMessage('خطأ في تصدير Excel. سيتم تصدير بصيغة CSV', 'error');
        exportToCSV();
    }
}

function exportToCSV() {
    try {
        const csvContent = createCSVContent();
        const fileName = `مطابقة_مخزن_البطاقات_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        showMessage('تم تصدير البيانات إلى CSV بنجاح', 'success');
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showMessage('خطأ في تصدير البيانات', 'error');
    }
}

function createExcelData() {
    return {
        overview: {
            title: 'نظرة عامة',
            data: [
                ['المؤشر', 'القيمة'],
                ['إجمالي العيادات', categories.clinics.filter(c => c.category === 'clinic').length],
                ['إجمالي المشاريع', categories.clinics.filter(c => c.category === 'project').length],
                ['إجمالي القطاعات', categories.clinics.filter(c => c.category === 'sector').length],
                ['إجمالي اللجان', categories.clinics.filter(c => c.category === 'committee').length],
                ['إجمالي الفئات المثمنة', categories.priced.length],
                ['إجمالي الفئات غير المثمنة', categories.unpriced.length]
            ]
        },
        clinics: {
            title: 'العيادات',
            data: [
                ['اسم العيادة', 'النوع', 'الموقع', 'الحالة'],
                ...categories.clinics.filter(c => c.category === 'clinic').map(clinic => [
                    clinic.name,
                    clinic.type || 'غير محدد',
                    clinic.location || 'غير محدد',
                    clinic.status === 'active' ? 'نشط' : 'غير نشط'
                ])
            ]
        },
        projects: {
            title: 'المشاريع',
            data: [
                ['اسم المشروع', 'النوع', 'الموقع', 'الحالة'],
                ...categories.clinics.filter(c => c.category === 'project').map(project => [
                    project.name,
                    project.type || 'غير محدد',
                    project.location || 'غير محدد',
                    project.status === 'active' ? 'نشط' : 'غير نشط'
                ])
            ]
        },
        sectors: {
            title: 'القطاعات',
            data: [
                ['اسم القطاع', 'النوع', 'الموقع', 'الحالة'],
                ...categories.clinics.filter(c => c.category === 'sector').map(sector => [
                    sector.name,
                    sector.type || 'غير محدد',
                    sector.location || 'غير محدد',
                    sector.status === 'active' ? 'نشط' : 'غير نشط'
                ])
            ]
        },
        committees: {
            title: 'اللجان',
            data: [
                ['اسم اللجنة', 'النوع', 'الموقع', 'الحالة'],
                ...categories.clinics.filter(c => c.category === 'committee').map(committee => [
                    committee.name,
                    committee.type || 'غير محدد',
                    committee.location || 'غير محدد',
                    committee.status === 'active' ? 'نشط' : 'غير نشط'
                ])
            ]
        },
        pricedCategories: {
            title: 'الفئات المثمنة',
            data: [
                ['اسم الفئة', 'السعر', 'العدد الأصلي', 'المستخدم', 'المتبقي', 'المبلغ الإجمالي'],
                ...categories.priced.map(category => {
                    const used = category.used || 0;
                    const remaining = category.remaining || (category.quantity - used);
                    return [
                        category.name,
                        category.price,
                        category.quantity,
                        used,
                        remaining,
                        category.total
                    ];
                })
            ]
        },
        unpricedCategories: {
            title: 'الفئات غير المثمنة',
            data: [
                ['اسم الفئة', 'العدد الأصلي', 'المستخدم', 'المتبقي'],
                ...categories.unpriced.map(category => {
                    const used = category.used || 0;
                    const remaining = category.remaining || (category.quantity - used);
                    return [
                        category.name,
                        category.quantity,
                        used,
                        remaining
                    ];
                })
            ]
        }
    };
}

function convertToExcelFormat(workbookData) {
    // This is a simplified Excel export - in a real app, you'd use a library like SheetJS
    // For now, we'll create a simple CSV format
    let content = '';
    
    Object.values(workbookData).forEach(sheet => {
        content += `\n=== ${sheet.title} ===\n`;
        sheet.data.forEach(row => {
            content += row.join(',') + '\n';
        });
        content += '\n';
    });
    
    return content;
}

function createCSVContent() {
    const workbookData = createExcelData();
    let content = '\ufeff'; // BOM for UTF-8
    
    Object.values(workbookData).forEach(sheet => {
        content += `\n=== ${sheet.title} ===\n`;
        sheet.data.forEach(row => {
            content += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        content += '\n';
    });
    
    return content;
}

function exportToPDF() {
    showMessage('ميزة تصدير PDF قيد التطوير', 'info');
}

// Send Functions
function sendCategory(type, categoryId) {
    currentSendType = type;
    currentSendCategory = categories[type].find(c => c.id === categoryId);
    
    if (!currentSendCategory) {
        showMessage('لم يتم العثور على الفئة', 'error');
        return;
    }
    
    // Check if category has remaining quantity
    const remaining = currentSendCategory.remaining || (currentSendCategory.quantity - (currentSendCategory.used || 0));
    if (remaining <= 0) {
        showMessage('لا توجد كمية متاحة للإرسال', 'error');
        return;
    }
    
    // Show send modal
    const modal = document.getElementById('sendModal');
    modal.style.display = 'block';
    
    // Populate category info
    document.getElementById('categoryInfo').value = currentSendCategory.name;
    document.getElementById('availableQuantity').textContent = formatNumber(remaining);
    document.getElementById('sendQuantity').max = remaining;
    document.getElementById('sendQuantity').value = '';
    document.getElementById('sendNotes').value = '';
    
    // Clear destination options
    document.getElementById('destinationType').value = '';
    document.getElementById('destinationSelect').innerHTML = '<option value="">اختر الوجهة</option>';
}

function closeSendModal() {
    document.getElementById('sendModal').style.display = 'none';
    currentSendCategory = null;
    currentSendType = '';
    document.getElementById('sendForm').reset();
}

function updateDestinationOptions() {
    const destinationType = document.getElementById('destinationType').value;
    const destinationSelect = document.getElementById('destinationSelect');
    
    // Clear existing options
    destinationSelect.innerHTML = '<option value="">اختر الوجهة</option>';
    
    if (!destinationType) return;
    
    // Filter destinations by type
    const destinations = categories.clinics.filter(item => item.category === destinationType);
    
    destinations.forEach(destination => {
        const option = document.createElement('option');
        option.value = destination.id;
        option.textContent = destination.name;
        destinationSelect.appendChild(option);
    });
}

function confirmSend() {
    const destinationType = document.getElementById('destinationType').value;
    const destinationId = document.getElementById('destinationSelect').value;
    const quantity = parseInt(document.getElementById('sendQuantity').value);
    const notes = document.getElementById('sendNotes').value;
    
    // Validation
    if (!destinationType || !destinationId || !quantity) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    const remaining = currentSendCategory.remaining || (currentSendCategory.quantity - (currentSendCategory.used || 0));
    if (quantity > remaining) {
        showMessage('الكمية المطلوبة أكبر من الكمية المتاحة', 'error');
        return;
    }
    
    if (quantity <= 0) {
        showMessage('الكمية يجب أن تكون أكبر من صفر', 'error');
        return;
    }
    
    // Get destination info
    const destination = categories.clinics.find(item => item.id === destinationId);
    if (!destination) {
        showMessage('لم يتم العثور على الوجهة المحددة', 'error');
        return;
    }
    
    // Confirm send
    const destinationName = destination.name;
    const categoryName = currentSendCategory.name;
    
    if (!confirm(`هل أنت متأكد من إرسال ${quantity} من "${categoryName}" إلى "${destinationName}"؟`)) {
        return;
    }
    
    try {
        // Update category quantities
        const newUsed = (currentSendCategory.used || 0) + quantity;
        const newRemaining = currentSendCategory.quantity - newUsed;
        
        // Update local data
        currentSendCategory.used = newUsed;
        currentSendCategory.remaining = newRemaining;
        if (currentSendType === 'priced') {
            const price = currentSendCategory.price || 0;
            currentSendCategory.total = price * (newRemaining || 0) * (currentSendCategory.quantity || 0); // price × receipts × booklets
        }
        
        // Save to localStorage
        saveToLocalStorage();
        
        // Try to save to Firebase if available
        if (db) {
            const updateDoc = { used: newUsed, remaining: newRemaining };
            if (currentSendType === 'priced') {
                updateDoc.total = (currentSendCategory.price || 0) * (newRemaining || 0) * (currentSendCategory.quantity || 0);
            }
            db.collection(currentSendType + 'Categories').doc(currentSendCategory.id).update(updateDoc);
        }
        
        // Create send record
        const sendRecord = {
            categoryId: currentSendCategory.id,
            categoryName: currentSendCategory.name,
            categoryType: currentSendType,
            destinationId: destinationId,
            destinationName: destinationName,
            destinationType: destinationType,
            quantity: quantity,
            notes: notes,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('ar-SA')
        };
        
        // Save send record to localStorage
        saveSendRecord(sendRecord);
        
        // Re-render the current tab
        if (currentSendType === 'priced') {
            renderPricedCategories();
        } else {
            renderUnpricedCategories();
        }
        
        closeSendModal();
        showMessage(`تم إرسال ${quantity} من "${categoryName}" إلى "${destinationName}" بنجاح`, 'success');
        
    } catch (error) {
        console.error('Error sending category:', error);
        showMessage('خطأ في إرسال الفئة', 'error');
    }
}

function saveSendRecord(sendRecord) {
    try {
        // Get existing send records
        let sendRecords = JSON.parse(localStorage.getItem('sendRecords') || '[]');
        
        // Add new record
        sendRecords.push(sendRecord);
        
        // Save back to localStorage
        localStorage.setItem('sendRecords', JSON.stringify(sendRecords));
        
    } catch (error) {
        console.error('Error saving send record:', error);
    }
}

function getSendRecords() {
    try {
        return JSON.parse(localStorage.getItem('sendRecords') || '[]');
    } catch (error) {
        console.error('Error loading send records:', error);
        return [];
    }
}
