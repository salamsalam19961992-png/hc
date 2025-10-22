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
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        // Disable persistence to avoid version conflicts
        // db.enablePersistence().catch((err) => {
        //     console.log('Persistence disabled:', err);
        // });
    } else {
        console.warn('Firebase not loaded, using localStorage fallback');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Global Variables
let currentTab = 'priced';
let currentFilter = 'all';
let categories = {
    priced: [],
    unpriced: [],
    clinics: [],
    warehouse: [],
    carriedOver: []
};
let selectedExportItems = [];
let exportType = '';
let currentSendCategory = null;
let currentSendType = '';
let useHijriCalendar = true; // true for Hijri, false for Gregorian

// No default data - system starts clean

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Try to load from Firebase first
            try {
                await loadData();
            } catch (firebaseError) {
            console.log('Firebase not available, trying localStorage');
            // Fallback to localStorage
            loadFromLocalStorage();
            }
        
        // If still no data, start with empty arrays
        if (categories.priced.length === 0 && categories.unpriced.length === 0 && categories.clinics.length === 0) {
            console.log('Starting with empty data');
        }
        
        // Render all tabs
        renderPricedCategories();
        renderUnpricedCategories();
        renderWarehouse();
        renderCarriedOver();
        renderClinics();
        
        // Save to Firebase and localStorage as backup
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
        saveToLocalStorage();
        
        console.log('App initialized successfully');
        showMessage('تم تحميل النظام بنجاح', 'success');
        
        // Load calendar preference
        loadCalendarPreference();
        
        // Start real-time date updates
        startDateTimeUpdates();
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
        
        // Load warehouse items
        const warehouseSnapshot = await db.collection('warehouse').get();
        categories.warehouse = warehouseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Load carried over items
        const carriedOverSnapshot = await db.collection('carriedOver').get();
        categories.carriedOver = carriedOverSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
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

async function saveData() {
    try {
        // Check if Firebase is initialized
        if (!firebase.apps.length || !db) {
            throw new Error('Firebase not initialized');
        }
        
        // Save priced categories
        const batch = db.batch();
        
        // Clear existing priced categories
        const pricedSnapshot = await db.collection('pricedCategories').get();
        pricedSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new priced categories
        categories.priced.forEach(category => {
            const docRef = db.collection('pricedCategories').doc();
            batch.set(docRef, category);
        });
        
        // Clear existing unpriced categories
        const unpricedSnapshot = await db.collection('unpricedCategories').get();
        unpricedSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new unpriced categories
        categories.unpriced.forEach(category => {
            const docRef = db.collection('unpricedCategories').doc();
            batch.set(docRef, category);
        });
        
        // Clear existing clinics
        const clinicsSnapshot = await db.collection('clinics').get();
        clinicsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new clinics
        categories.clinics.forEach(clinic => {
            const docRef = db.collection('clinics').doc();
            batch.set(docRef, clinic);
        });
        
        // Clear existing warehouse items
        const warehouseSnapshot = await db.collection('warehouse').get();
        warehouseSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new warehouse items
        categories.warehouse.forEach(item => {
            const docRef = db.collection('warehouse').doc();
            batch.set(docRef, item);
        });
        
        // Clear existing carried over items
        const carriedOverSnapshot = await db.collection('carriedOver').get();
        carriedOverSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new carried over items
        categories.carriedOver.forEach(item => {
            const docRef = db.collection('carriedOver').doc();
            batch.set(docRef, item);
        });
        
        // Commit the batch
        await batch.commit();
        
        console.log('Data saved to Firebase successfully');
        
    } catch (error) {
        console.error('Error saving data to Firebase:', error);
        
        // Show user-friendly error message
        if (error.code === 'permission-denied') {
            showMessage('خطأ في الصلاحيات. تأكد من إعدادات Firebase', 'error');
        } else if (error.code === 'unavailable') {
            showMessage('خطأ في الاتصال. تحقق من اتصال الإنترنت', 'error');
        } else {
            showMessage('خطأ في حفظ البيانات: ' + error.message, 'error');
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
        const bookletCount = category.bookletCount || 1;
        const amount = (category.price || 0) * (category.quantity || 0) * (category.remaining || 1); // price × quantity × remaining
        
        return `
            <tr>
                <td>${category.name}</td>
                <td class="amount">${formatNumber(category.price)} دينار</td>
                <td class="quantity">${formatNumber(category.quantity)}</td>
                <td class="used">${formatNumber(used)}</td>
                <td class="remaining">${formatNumber(category.remaining || 0)}</td>
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
    const totalRemaining = categories.priced.reduce((sum, cat) => sum + (cat.remaining || 0), 0);
    const totalAmount = categories.priced.reduce((sum, cat) => {
        return sum + ((cat.price || 0) * (cat.quantity || 0) * (cat.remaining || 1));
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
        const bookletCount = category.bookletCount || 1;
        
        return `
            <tr>
                <td>${category.name}</td>
                <td class="quantity">${formatNumber(category.quantity)}</td>
                <td class="used">${formatNumber(used)}</td>
                <td class="remaining">${formatNumber(bookletCount)}</td>
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

function renderWarehouse() {
    const tbody = document.getElementById('warehouse-tbody');
    const summary = document.getElementById('warehouse-summary');
    
    if (categories.warehouse.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-warehouse" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد أصناف في المخزن
                </td>
            </tr>
        `;
        summary.innerHTML = '';
        return;
    }
    
    // Render table rows
    tbody.innerHTML = categories.warehouse.map(item => {
        const totalAmount = (item.price || 0) * (item.quantity || 0) * (item.used || 0);
        const entryDate = formatGregorianDateNumbers(item.entryDate || item.createdAt);
        
        // تحديد نوع المصدر
        let sourceType = '';
        if (item.originalType === 'priced') {
            sourceType = '<span class="badge badge-success">محول من مثمن</span>';
        } else if (item.originalType === 'unpriced') {
            sourceType = '<span class="badge badge-info">محول من غير مثمن</span>';
        } else if (item.originalType === 'default_priced') {
            sourceType = '<span class="badge badge-primary">افتراضي مثمن</span>';
        } else if (item.originalType === 'default_unpriced') {
            sourceType = '<span class="badge badge-secondary">افتراضي غير مثمن</span>';
        } else {
            sourceType = '<span class="badge badge-light">مُدخل يدوياً</span>';
        }
        
        const typeBadge = item.type === 'priced' ? 
            '<span class="type-badge priced">مثمن</span>' : 
            '<span class="type-badge unpriced">غير مثمن</span>';
        
        return `
            <tr>
                <td>
                    ${item.name}
                    <br><small>${sourceType}</small>
                </td>
                <td>${typeBadge}</td>
                <td class="quantity">${formatNumber(item.quantity)}</td>
                <td class="quantity">${formatNumber(item.remaining || 0)}</td>
                <td class="amount">${item.price > 0 ? formatNumber(item.price) + ' دينار' : 'غير مثمن'}</td>
                <td class="amount">${totalAmount > 0 ? formatNumber(totalAmount) + ' دينار' : 'غير مثمن'}</td>
                <td>${entryDate}</td>
                <td>${item.user || 'غير محدد'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-info" onclick="sendWarehouseItem('${item.id}')" title="إرسال">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="editWarehouseItem('${item.id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteWarehouseItem('${item.id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Render summary cards
    const totalItems = categories.warehouse.length;
    const totalQuantity = categories.warehouse.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = categories.warehouse.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0) * (item.used || 0)), 0);
    const lowStockItems = categories.warehouse.filter(item => (item.quantity || 0) < 10).length;
    
    summary.innerHTML = `
        <div class="summary-card">
            <h3>${totalItems}</h3>
            <p>إجمالي الأصناف</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalQuantity)}</h3>
            <p>إجمالي الكمية</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalValue)}</h3>
            <p>دينار</p>
            <div class="subtitle">إجمالي القيمة</div>
        </div>
        <div class="summary-card">
            <h3>${lowStockItems}</h3>
            <p>منخفض المخزون</p>
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
                <td colspan="9" style="text-align: center; padding: 40px; color: #7f8c8d;">
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
        
        // Calculate categories sent to this clinic
        const categoriesSent = calculateCategoriesSent(clinic.id);
        
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
                <td class="quantity">${categoriesSent.total}</td>
                <td class="quantity">${formatNumber(categoriesSent.totalQuantity)}</td>
                <td class="amount">${formatNumber(categoriesSent.totalAmount)} دينار</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-info" onclick="showClinicDetails('${clinic.id}')" title="عرض تفاصيل العيادة">
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
    const totalAmountGroup = document.getElementById('totalAmountGroup');
    
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
        totalAmountGroup.style.display = 'block';
        
        // Remove existing event listeners to prevent duplicates
        const bookletCount = document.getElementById('bookletCount');
        const receiptCount = document.getElementById('receiptCount');
        const quantity = document.getElementById('quantity');
        
        // Clone elements to remove all event listeners
        const newBookletCount = bookletCount.cloneNode(true);
        const newReceiptCount = receiptCount.cloneNode(true);
        const newQuantity = quantity.cloneNode(true);
        
        bookletCount.parentNode.replaceChild(newBookletCount, bookletCount);
        receiptCount.parentNode.replaceChild(newReceiptCount, receiptCount);
        quantity.parentNode.replaceChild(newQuantity, quantity);
        
        // Add event listeners for automatic calculation
        document.getElementById('bookletCount').addEventListener('input', calculatePricedTotal);
        document.getElementById('receiptCount').addEventListener('input', calculatePricedTotal);
        document.getElementById('quantity').addEventListener('input', calculatePricedTotal);
        categorySelect.addEventListener('change', calculatePricedTotal);
    } else {
        categories.unpriced.forEach(category => {
            categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
        totalAmountGroup.style.display = 'none';
    }
}

function calculatePricedTotal() {
    const categoryId = document.getElementById('categorySelect').value;
    const bookletCount = parseFloat(document.getElementById('bookletCount').value) || 0;
    const receiptCount = parseFloat(document.getElementById('receiptCount').value) || 0;
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    
    if (categoryId && currentTab === 'priced') {
        const category = categories.priced.find(c => c.id === categoryId);
        if (category && category.price) {
            const total = category.price * quantity * bookletCount;
            document.getElementById('totalAmount').value = total.toFixed(2);
        }
    }
}

function closeModal() {
    document.getElementById('addModal').style.display = 'none';
    document.getElementById('addForm').reset();
}

// Add Category Functions
function showAddCategoryModal() {
    document.getElementById('addCategoryModal').style.display = 'block';
    document.getElementById('addCategoryForm').reset();
    // Add event listeners for automatic calculation
    document.getElementById('categoryPrice').addEventListener('input', calculateCategoryTotal);
    document.getElementById('categoryQuantity').addEventListener('input', calculateCategoryTotal);
    document.getElementById('categoryBookletCount').addEventListener('input', calculateCategoryTotal);
    document.getElementById('categoryUsed').addEventListener('input', calculateCategoryTotal);
}

function closeAddCategoryModal() {
    document.getElementById('addCategoryModal').style.display = 'none';
    document.getElementById('addCategoryForm').reset();
    document.getElementById('addCategoryTitle').textContent = 'إضافة فئة جديدة';
    document.getElementById('addCategoryModal').removeAttribute('data-category-id');
    document.getElementById('addCategoryModal').removeAttribute('data-category-type');
}

function toggleCategoryPriceField() {
    // Always show price and total fields since all categories are priced now
    const priceInput = document.getElementById('categoryPrice');
    const totalInput = document.getElementById('categoryTotal');
    
    // Add event listeners for automatic calculation
    priceInput.addEventListener('input', calculateCategoryTotal);
    document.getElementById('categoryQuantity').addEventListener('input', calculateCategoryTotal);
    document.getElementById('categoryBookletCount').addEventListener('input', calculateCategoryTotal);
    document.getElementById('categoryUsed').addEventListener('input', calculateCategoryTotal);
}

function calculateCategoryTotal() {
    const price = parseFloat(document.getElementById('categoryPrice').value) || 0;
    const quantity = parseFloat(document.getElementById('categoryQuantity').value) || 0;
    const bookletCount = parseFloat(document.getElementById('categoryBookletCount').value) || 0;
    const used = parseFloat(document.getElementById('categoryUsed').value) || 0;
    
    const total = price * quantity * bookletCount;
    document.getElementById('categoryTotal').value = total.toFixed(2);
}

async function saveNewCategory() {
    // Check if this is an edit operation
    const categoryId = document.getElementById('addCategoryModal').getAttribute('data-category-id');
    if (categoryId) {
        await updateExistingCategory();
        return;
    }
    const name = document.getElementById('categoryName').value.trim();
    const price = parseFloat(document.getElementById('categoryPrice').value) || 0;
    const quantity = parseInt(document.getElementById('categoryQuantity').value) || 0;
    const bookletCount = parseInt(document.getElementById('categoryBookletCount').value) || 1;
    const used = parseInt(document.getElementById('categoryUsed').value) || 0;
    const notes = document.getElementById('categoryNotes').value.trim();
    
    if (!name || !quantity || price <= 0) {
        showMessage('يرجى ملء جميع الحقول المطلوبة والسعر', 'error');
        return;
    }
    
    // Check for duplicate name
    const existingCategory = categories.priced.find(cat => cat.name.toLowerCase() === name.toLowerCase());
    if (existingCategory) {
        showMessage('اسم الفئة موجود بالفعل، يرجى اختيار اسم آخر', 'error');
        return;
    }
    
    try {
        const newCategory = {
            name: name,
            type: 'priced',
            price: price,
            quantity: quantity,
            bookletCount: bookletCount,
            used: used,
            remaining: bookletCount,
            total: price * quantity * bookletCount,
            notes: notes,
            createdAt: new Date().toISOString()
        };
        
        // Add to Firebase
        if (db) {
            try {
                const docRef = await db.collection('pricedCategories').add(newCategory);
                newCategory.id = docRef.id;
                console.log('Category added to Firebase successfully');
            } catch (firebaseError) {
                console.log('Firebase add failed, using localStorage backup:', firebaseError.message);
                newCategory.id = 'priced_' + Date.now();
            }
        } else {
            newCategory.id = 'priced_' + Date.now();
        }
        
        // Add to local data
        categories.priced.push(newCategory);
        
        // Save to localStorage as backup
        saveToLocalStorage();
        
        // Re-render the appropriate tab
        renderPricedCategories();
        
        closeAddCategoryModal();
        showMessage('تم إضافة الفئة بنجاح', 'success');
    } catch (error) {
        console.error('Error adding category:', error);
        showMessage('خطأ في إضافة الفئة', 'error');
    }
}

// Edit Category Functions
function editCategory(categoryId, type) {
    const category = categories[type].find(c => c.id === categoryId);
    if (!category) {
        showMessage('الفئة غير موجودة', 'error');
        return;
    }
    
    // Fill the form with existing data
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryPrice').value = category.price || 0;
    document.getElementById('categoryQuantity').value = category.quantity || 0;
    document.getElementById('categoryBookletCount').value = category.bookletCount || 1;
    document.getElementById('categoryUsed').value = category.used || 0;
    document.getElementById('categoryNotes').value = category.notes || '';
    
    // Update title
    document.getElementById('addCategoryTitle').textContent = 'تعديل الفئة';
    
    // Show modal
    document.getElementById('addCategoryModal').style.display = 'block';
    toggleCategoryPriceField();
    
    // Force update the booklet count field
    setTimeout(() => {
        document.getElementById('categoryBookletCount').value = category.bookletCount || 1;
    }, 100);
    
    // Store current category ID for update
    document.getElementById('addCategoryModal').setAttribute('data-category-id', categoryId);
    document.getElementById('addCategoryModal').setAttribute('data-category-type', type);
}

async function updateExistingCategory() {
    const categoryId = document.getElementById('addCategoryModal').getAttribute('data-category-id');
    const categoryType = document.getElementById('addCategoryModal').getAttribute('data-category-type');
    
    if (!categoryId || !categoryType) {
        showMessage('خطأ في تحديد الفئة', 'error');
        return;
    }
    
    const name = document.getElementById('categoryName').value.trim();
    const price = parseFloat(document.getElementById('categoryPrice').value) || 0;
    const quantity = parseInt(document.getElementById('categoryQuantity').value) || 0;
    const bookletCount = parseInt(document.getElementById('categoryBookletCount').value) || 1;
    const used = parseInt(document.getElementById('categoryUsed').value) || 0;
    const notes = document.getElementById('categoryNotes').value.trim();
    
    if (!name || !quantity || price <= 0) {
        showMessage('يرجى ملء جميع الحقول المطلوبة والسعر', 'error');
        return;
    }
    
    // Check for duplicate name (excluding current category)
    const existingCategory = categories.priced.find(cat => cat.name.toLowerCase() === name.toLowerCase() && cat.id !== categoryId);
    if (existingCategory) {
        showMessage('اسم الفئة موجود بالفعل، يرجى اختيار اسم آخر', 'error');
        return;
    }
    
    try {
        const updatedCategory = {
            name: name,
            type: 'priced',
            price: price,
            quantity: quantity,
            bookletCount: bookletCount,
            used: used,
            remaining: bookletCount,
            total: price * quantity * bookletCount,
            notes: notes,
            updatedAt: new Date().toISOString()
        };
        
        // Update in Firebase
        if (db) {
            try {
                const docRef = db.collection('pricedCategories').doc(categoryId);
                const doc = await docRef.get();
                
                if (doc.exists) {
                    await docRef.update(updatedCategory);
                    console.log('Category updated in Firebase successfully');
                } else {
                    await docRef.set({ id: categoryId, ...updatedCategory });
                    console.log('Category created in Firebase successfully');
                }
            } catch (firebaseError) {
                console.log('Firebase update failed, using localStorage backup:', firebaseError.message);
            }
        }
        
        // Update local data
        const index = categories.priced.findIndex(c => c.id === categoryId);
        if (index !== -1) {
            categories.priced[index] = { ...categories.priced[index], ...updatedCategory };
        }
        
        // Save to localStorage as backup
        saveToLocalStorage();
        
        // Re-render the appropriate tab
        renderPricedCategories();
        
        closeAddCategoryModal();
        showMessage('تم تحديث الفئة بنجاح', 'success');
    } catch (error) {
        console.error('Error updating category:', error);
        showMessage('خطأ في تحديث الفئة', 'error');
    }
}

function closeReportsModal() {
    document.getElementById('reportsModal').style.display = 'none';
}

// Category Management
async function addPricedCategory() {
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

async function addUnpricedCategory() {
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
        
        // Save to Firebase and localStorage
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
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
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
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
        
        const currentBookletCount = category.remaining ?? Math.max((category.quantity ?? 0) - (category.used ?? 0), 0);
        const remInput = prompt('عدد الجلد:', String(currentBookletCount));
        if (remInput === null) return;
        const newBookletCount = parseInt(remInput);
        if (Number.isNaN(newBookletCount) || newBookletCount < 0 || newBookletCount > newQuantity) {
            showMessage('قيمة عدد الجلد غير صالحة', 'error');
            return;
        }
        const updatedCategory = {
            ...category,
            name: newName,
            price: newPrice,
            quantity: newQuantity,
            // Keep used as is - don't change it
            used: category.used || 0,
            remaining: newBookletCount,
            // amount reflects price × quantity × bookletCount
            total: newPrice * newQuantity * newBookletCount
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
        const currentBookletCount = category.remaining ?? Math.max((category.quantity ?? 0) - (category.used ?? 0), 0);
        const remInput = prompt('عدد الجلد:', String(currentBookletCount));
        if (remInput === null) return;
        const newBookletCount = parseInt(remInput);
        if (Number.isNaN(newBookletCount) || newBookletCount < 0 || newBookletCount > newQuantity) {
            showMessage('قيمة عدد الجلد غير صالحة', 'error');
            return;
        }
        const updatedCategory = {
            ...category,
            name: newName,
            quantity: newQuantity,
            // Keep used as is - don't change it
            used: category.used || 0,
            remaining: newBookletCount
        };
        
        await updateCategory(type, categoryId, updatedCategory);
    }
}

async function updateCategory(type, categoryId, updatedData) {
    try {
        // Update local data first
        const index = categories[type].findIndex(c => c.id === categoryId);
        if (index !== -1) {
            categories[type][index] = { ...categories[type][index], ...updatedData };
        }
        
        // Try Firebase update if document exists
        if (db) {
            try {
                const docRef = db.collection(type + 'Categories').doc(categoryId);
                const doc = await docRef.get();
                
                if (doc.exists) {
                    await docRef.update(updatedData);
                    console.log('Category updated in Firebase successfully');
                } else {
                    // Document doesn't exist, create it
                    await docRef.set({ id: categoryId, ...updatedData });
                    console.log('Category created in Firebase successfully');
                }
            } catch (firebaseError) {
                console.log('Firebase update failed, using localStorage backup:', firebaseError.message);
            }
        }
        
        // Save to localStorage as backup
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
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
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
        // Remove from local data first
        categories[type] = categories[type].filter(c => c.id !== categoryId);
        
        // Try Firebase delete if document exists
        if (db) {
            try {
                const docRef = db.collection(type + 'Categories').doc(categoryId);
                const doc = await docRef.get();
                
                if (doc.exists) {
                    await docRef.delete();
                    console.log('Category deleted from Firebase successfully');
                } else {
                    console.log('Category not found in Firebase, already deleted locally');
                    // This is normal, don't show as error
                }
            } catch (firebaseError) {
                console.log('Firebase delete failed, using localStorage backup:', firebaseError.message);
            }
        }
        
        // Save to localStorage as backup
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
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
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
async function addClinic() {
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
        
        // Save to Firebase and localStorage
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
            // Don't show error to user as localStorage backup is working
        }
        saveToLocalStorage();
        
        renderClinics();
        showMessage('تم إضافة العيادة بنجاح', 'success');
    } catch (error) {
        console.error('Error adding clinic:', error);
        
        // Fallback: add locally even if Firebase fails
        clinicData.id = 'clinic_' + Date.now();
        categories.clinics.push(clinicData);
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
            // Don't show error to user as localStorage backup is working
        }
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
        
        // Save to Firebase and localStorage
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
            // Don't show error to user as localStorage backup is working
        }
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
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
            // Don't show error to user as localStorage backup is working
        }
        saveToLocalStorage();
        renderClinics();
        
        showMessage('تم تحديث العيادة محلياً', 'success');
    }
}

async function deleteClinic(clinicId) {
    if (!confirm('هل أنت متأكد من حذف هذه العيادة؟')) return;
    
    try {
        // Remove from local data first
        categories.clinics = categories.clinics.filter(c => c.id !== clinicId);
        
        // Try Firebase delete if document exists
        if (db) {
            try {
                const docRef = db.collection('clinics').doc(clinicId);
                const doc = await docRef.get();
                
                if (doc.exists) {
                    await docRef.delete();
                    console.log('Clinic deleted from Firebase successfully');
                } else {
                    console.log('Clinic not found in Firebase, already deleted locally');
                    // This is normal, don't show as error
                }
            } catch (firebaseError) {
                console.log('Firebase delete failed, using localStorage backup:', firebaseError.message);
            }
        }
        
        // Save to localStorage as backup
        saveToLocalStorage();
        
        renderClinics();
        showMessage('تم حذف العيادة بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting clinic:', error);
        
        // Fallback: delete locally
        categories.clinics = categories.clinics.filter(c => c.id !== clinicId);
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
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
        return sum + ((category.price || 0) * (category.quantity || 0) * (category.used || 0));
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
            categories.warehouse = parsedData.warehouse || [];
            categories.carriedOver = parsedData.carriedOver || [];
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
async function clearAllData() {
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
            categories.warehouse = [];
            
            // Re-render with empty data
            renderPricedCategories();
            renderUnpricedCategories();
            renderWarehouse();
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
            clinics: categories.clinics,
            warehouse: categories.warehouse
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `مطابقة-مخزن-البطاقات-${formatCurrentDateForFileName()}.json`;
        link.click();
        
        showMessage('تم تصدير البيانات بنجاح', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showMessage('خطأ في تصدير البيانات', 'error');
    }
}

async function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.pricedCategories) categories.priced = data.pricedCategories;
                if (data.unpricedCategories) categories.unpriced = data.unpricedCategories;
                if (data.clinics) categories.clinics = data.clinics;
                if (data.warehouse) categories.warehouse = data.warehouse;
                
                // Re-render all data
                renderPricedCategories();
                renderUnpricedCategories();
                renderWarehouse();
                renderClinics();
                
                // Save to Firebase and localStorage
                try {
                    await saveData();
                } catch (error) {
                    console.log('Firebase save failed, using localStorage backup');
                }
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

async function loadDefaultData() {
    if (confirm('هل تريد مسح جميع البيانات الحالية؟ سيتم حذف جميع البيانات الموجودة.')) {
        try {
            // Clear all data
            categories.priced = [];
            categories.unpriced = [];
            categories.clinics = [];
            categories.warehouse = [];
            
            // Re-render all data
            renderPricedCategories();
            renderUnpricedCategories();
            renderWarehouse();
            renderClinics();
            
            // Save to Firebase and localStorage
            try {
                await saveData();
            } catch (error) {
                console.log('Firebase save failed, using localStorage backup');
            }
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

function formatArabicDate(dateString) {
    if (!dateString) return 'غير محدد';
    
    try {
        // Check if moment-hijri is available
        if (typeof moment !== 'undefined' && moment.iHijri) {
            const hijriMoment = moment(dateString).iHijri();
            const gregorianMoment = moment(dateString);
            
            // Format Hijri date
            const hijriDate = hijriMoment.format('iYYYY/iMM/iDD');
            const hijriMonthName = hijriMoment.format('iMMMM');
            const hijriYear = hijriMoment.format('iYYYY');
            const hijriDay = hijriMoment.format('iDD');
            
            // Format time
            const time = gregorianMoment.format('HH:mm:ss');
            
            // Create beautiful Arabic format
            const arabicHijriDate = `${hijriDay} ${hijriMonthName} ${hijriYear} هـ`;
            const arabicTime = `الساعة ${time}`;
            
            return `${arabicHijriDate} - ${arabicTime}`;
        } else {
            // Fallback to regular Arabic date
            const date = new Date(dateString);
            const arabicDate = new Intl.DateTimeFormat('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(date);
            
            return arabicDate;
        }
    } catch (error) {
        return dateString;
    }
}

// Format Gregorian date with numbers only
function formatGregorianDateNumbers(dateString) {
    if (!dateString) return 'غير محدد';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'تاريخ غير صحيح';
        
        // Format as YYYY/MM/DD - HH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}/${month}/${day} - ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error('Error formatting Gregorian date:', error);
        return 'تاريخ غير صحيح';
    }
}

function getCurrentArabicDateTime() {
    try {
        // Check if moment-hijri is available
        if (typeof moment !== 'undefined' && moment.iHijri) {
            const now = moment();
            const hijriNow = now.iHijri();
            
            // Format Hijri date
            const hijriDate = hijriNow.format('iYYYY/iMM/iDD');
            const hijriMonthName = hijriNow.format('iMMMM');
            const hijriYear = hijriNow.format('iYYYY');
            const hijriDay = hijriNow.format('iDD');
            
            // Format time
            const time = now.format('HH:mm:ss');
            
            // Create beautiful Arabic format
            const arabicHijriDate = `${hijriDay} ${hijriMonthName} ${hijriYear} هـ`;
            const arabicTime = `الساعة ${time}`;
            
            return `${arabicHijriDate} - ${arabicTime}`;
        } else {
            // Fallback to regular Arabic date
            const now = new Date();
            return new Intl.DateTimeFormat('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(now);
        }
    } catch (error) {
        return new Date().toLocaleString('ar-SA');
    }
}

function getBeautifulDateTime() {
    try {
        if (typeof moment !== 'undefined' && moment.iHijri) {
            const now = moment();
            const hijriNow = now.iHijri();
            
            // Get day name in Arabic
            const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const dayName = dayNames[now.day()];
            
            // Format Hijri date beautifully
            const hijriDay = hijriNow.format('iDD');
            const hijriMonthName = hijriNow.format('iMMMM');
            const hijriYear = hijriNow.format('iYYYY');
            
            // Format time beautifully
            const time = now.format('HH:mm:ss');
            
            return `${dayName}، ${hijriDay} ${hijriMonthName} ${hijriYear} هـ - الساعة ${time}`;
        } else {
            return getCurrentArabicDateTime();
        }
    } catch (error) {
        return getCurrentArabicDateTime();
    }
}

function formatDateForFileName() {
    try {
        if (typeof moment !== 'undefined' && moment.iHijri) {
            const now = moment();
            const hijriNow = now.iHijri();
            
            const hijriDate = hijriNow.format('iYYYY-iMM-iDD');
            const time = now.format('HH-mm-ss');
            
            return `${hijriDate}_${time}`;
        } else {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            return `${date}_${time}`;
        }
    } catch (error) {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `${date}_${time}`;
    }
}

// Gregorian (Miladi) Date Functions
function formatGregorianDate(dateString) {
    if (!dateString) return 'غير محدد';
    
    try {
        const date = new Date(dateString);
        const gregorianDate = new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
        
        return gregorianDate;
    } catch (error) {
        return dateString;
    }
}

function getCurrentGregorianDateTime() {
    try {
        const now = new Date();
        const gregorianDate = new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(now);
        
        return gregorianDate;
    } catch (error) {
        return new Date().toLocaleString('ar-SA');
    }
}

function getBeautifulGregorianDateTime() {
    try {
        const now = new Date();
        
        // Get day name in Arabic
        const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const dayName = dayNames[now.getDay()];
        
        // Get month name in Arabic
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                           'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthName = monthNames[now.getMonth()];
        
        // Format time
        const time = now.toLocaleTimeString('ar-SA', { hour12: false });
        
        return `${dayName}، ${now.getDate()} ${monthName} ${now.getFullYear()} م - الساعة ${time}`;
    } catch (error) {
        return getCurrentGregorianDateTime();
    }
}

function formatGregorianDateForFileName() {
    try {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `${date}_${time}`;
    } catch (error) {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `${date}_${time}`;
    }
}

// Date conversion functions
function hijriToGregorian(hijriDate) {
    try {
        if (typeof moment !== 'undefined' && moment.iHijri) {
            const hijriMoment = moment.iHijri(hijriDate);
            const gregorianMoment = hijriMoment.toGregorian();
            return gregorianMoment.format('YYYY-MM-DD');
        }
        return null;
    } catch (error) {
        console.error('Error converting Hijri to Gregorian:', error);
        return null;
    }
}

function gregorianToHijri(gregorianDate) {
    try {
        if (typeof moment !== 'undefined' && moment.iHijri) {
            const gregorianMoment = moment(gregorianDate);
            const hijriMoment = gregorianMoment.iHijri();
            return hijriMoment.format('iYYYY-iMM-iDD');
        }
        return null;
    } catch (error) {
        console.error('Error converting Gregorian to Hijri:', error);
        return null;
    }
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
    const bookletCount = parseInt(document.getElementById('bookletCount').value) || 0;
    const receiptCount = parseInt(document.getElementById('receiptCount').value) || 0;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
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
            bookletCount: bookletCount,
            receiptCount: receiptCount,
            totalAmount: totalAmount,
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
    const fileName = `${item.name}_${exportType}_${formatCurrentDateForFileName()}.txt`;
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
    // total amount = price × quantity × booklets
    const totalAmount = categories.priced.reduce((sum, cat) => {
        const bookletCount = cat.bookletCount || 1;
        return sum + ((cat.price || 0) * (cat.quantity || 0) * (bookletCount || 1));
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
        const bookletCount = category.remaining || (category.quantity - used);
        
        content += `
${category.name}:
`;
        
        if (exportType === 'priced') {
            const detailedAmount = (category.price || 0) * (category.quantity || 0) * (category.used || 0);
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

// Show detailed clinic information with materials and amounts
function showClinicDetails(clinicId) {
    const clinic = categories.clinics.find(c => c.id === clinicId);
    if (!clinic) {
        showMessage('العيادة غير موجودة', 'error');
        return;
    }
    
    const categoriesSent = calculateCategoriesSent(clinicId);
    
    // Create detailed modal content
    const modalContent = `
        <div class="modal" id="clinicDetailsModal" style="display: block;">
            <div class="modal-content" style="max-width: 1000px;">
                <div class="modal-header">
                    <h3><i class="fas fa-hospital"></i> تفاصيل العيادة: ${clinic.name}</h3>
                    <button class="close-btn" onclick="closeClinicDetailsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="clinic-info-section">
                        <h4><i class="fas fa-info-circle"></i> معلومات العيادة</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>اسم العيادة:</label>
                                <span>${clinic.name}</span>
                            </div>
                            <div class="info-item">
                                <label>النوع:</label>
                                <span>${clinic.type || 'غير محدد'}</span>
                            </div>
                            <div class="info-item">
                                <label>الموقع:</label>
                                <span>${clinic.location || 'غير محدد'}</span>
                            </div>
                            <div class="info-item">
                                <label>الحالة:</label>
                                <span class="status-badge ${clinic.status || 'active'}">
                                    ${clinic.status === 'active' ? 'نشط' : 'غير نشط'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="materials-summary-section">
                        <h4><i class="fas fa-chart-bar"></i> ملخص المواد المجهزة</h4>
                        <div class="summary-cards">
                            <div class="summary-card">
                                <h3>${categoriesSent.total}</h3>
                                <p>إجمالي الأصناف</p>
                            </div>
                            <div class="summary-card">
                                <h3>${formatNumber(categoriesSent.totalQuantity)}</h3>
                                <p>إجمالي الكمية</p>
                            </div>
                            <div class="summary-card">
                                <h3>${formatNumber(categoriesSent.totalAmount)}</h3>
                                <p>المبلغ الإجمالي (دينار)</p>
                            </div>
                            <div class="summary-card">
                                <h3>${formatNumber(categoriesSent.remaining)}</h3>
                                <p>المتبقي</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="materials-details-section">
                        <h4><i class="fas fa-list"></i> تفاصيل المواد المجهزة</h4>
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>اسم المادة</th>
                                        <th>النوع</th>
                                        <th>الكمية</th>
                                        <th>المتبقي</th>
                                        <th>السعر</th>
                                        <th>المبلغ الإجمالي</th>
                                        <th>تاريخ الإرسال</th>
                                        <th>وقت الإرسال</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${categoriesSent.categories.length > 0 ? 
                                        categoriesSent.categories.map(category => `
                                            <tr>
                                                <td>${category.name}</td>
                                                <td>
                                                    <span class="type-badge ${category.type === 'مثمن' ? 'priced' : 'unpriced'}">
                                                        ${category.type}
                                                    </span>
                                                </td>
                                                <td class="quantity">${formatNumber(category.quantity)}</td>
                                                <td class="quantity">${formatNumber(category.remaining)}</td>
                                                <td class="amount">${category.price > 0 ? formatNumber(category.price) + ' دينار' : 'غير مثمن'}</td>
                                                <td class="amount">${category.totalAmount > 0 ? formatNumber(category.totalAmount) + ' دينار' : 'غير مثمن'}</td>
                                                <td class="date">${category.date || 'غير محدد'}</td>
                                                <td class="time">${category.timestamp ? new Date(category.timestamp).toLocaleTimeString('ar-SA') : 'غير محدد'}</td>
                                            </tr>
                                        `).join('') :
                                        `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #7f8c8d;">لا توجد مواد مجهزة لهذه العيادة</td></tr>`
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeClinicDetailsModal()">إغلاق</button>
                    <button class="btn btn-success" onclick="printClinicDetails('${clinicId}')">
                        <i class="fas fa-print"></i> طباعة التقرير
                    </button>
                    <button class="btn btn-primary" onclick="exportClinicDetailsToExcel('${clinicId}')">
                        <i class="fas fa-file-excel"></i> تصدير Excel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalContent);
}

function closeClinicDetailsModal() {
    const modal = document.getElementById('clinicDetailsModal');
    if (modal) {
        modal.remove();
    }
}

function printClinicDetails(clinicId) {
    const clinic = categories.clinics.find(c => c.id === clinicId);
    if (!clinic) return;
    
    const categoriesSent = calculateCategoriesSent(clinicId);
    
    const printContent = `
        <html dir="rtl">
        <head>
            <title>تقرير تفاصيل العيادة - ${clinic.name}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
                .header { text-align: center; margin-bottom: 30px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; }
                .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                .summary-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                .amount { text-align: left; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير تفاصيل العيادة</h1>
                <p><strong>تاريخ التقرير:</strong> ${getCurrentDateTime()}</p>
            </div>
            
            <h2>معلومات العيادة</h2>
            <div class="info-grid">
                <div class="info-item">
                    <label>اسم العيادة:</label>
                    <span>${clinic.name}</span>
                </div>
                <div class="info-item">
                    <label>النوع:</label>
                    <span>${clinic.type || 'غير محدد'}</span>
                </div>
                <div class="info-item">
                    <label>الموقع:</label>
                    <span>${clinic.location || 'غير محدد'}</span>
                </div>
                <div class="info-item">
                    <label>الحالة:</label>
                    <span>${clinic.status === 'active' ? 'نشط' : 'غير نشط'}</span>
                </div>
            </div>
            
            <h2>ملخص المواد المجهزة</h2>
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>${categoriesSent.total}</h3>
                    <p>إجمالي الأصناف</p>
                </div>
                <div class="summary-card">
                    <h3>${formatNumber(categoriesSent.totalQuantity)}</h3>
                    <p>إجمالي الكمية</p>
                </div>
                <div class="summary-card">
                    <h3>${formatNumber(categoriesSent.totalAmount)}</h3>
                    <p>المبلغ الإجمالي (دينار)</p>
                </div>
                <div class="summary-card">
                    <h3>${formatNumber(categoriesSent.remaining)}</h3>
                    <p>المتبقي</p>
                </div>
            </div>
            
            <h2>تفاصيل المواد المجهزة</h2>
            <table>
                <thead>
                    <tr>
                        <th>اسم المادة</th>
                        <th>النوع</th>
                        <th>الكمية</th>
                        <th>المتبقي</th>
                        <th>السعر</th>
                        <th>المبلغ الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoriesSent.categories.length > 0 ? 
                        categoriesSent.categories.map(category => `
                            <tr>
                                <td>${category.name}</td>
                                <td>${category.type}</td>
                                <td>${formatNumber(category.quantity)}</td>
                                <td>${formatNumber(category.remaining)}</td>
                                <td>${category.price > 0 ? formatNumber(category.price) + ' دينار' : 'غير مثمن'}</td>
                                <td>${category.totalAmount > 0 ? formatNumber(category.totalAmount) + ' دينار' : 'غير مثمن'}</td>
                            </tr>
                        `).join('') :
                        `<tr><td colspan="6" style="text-align: center;">لا توجد مواد مجهزة لهذه العيادة</td></tr>`
                    }
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function exportClinicDetailsToExcel(clinicId) {
    const clinic = categories.clinics.find(c => c.id === clinicId);
    if (!clinic) return;
    
    try {
        const categoriesSent = calculateCategoriesSent(clinicId);
        const currentDateTime = getCurrentDateTime();
        
        if (typeof XLSX !== 'undefined') {
            // Create Excel workbook
            const wb = XLSX.utils.book_new();
            
            // Clinic info sheet
            const clinicInfoData = [
                ['تقرير تفاصيل العيادة'],
                ['تاريخ التقرير', currentDateTime],
                [''],
                ['معلومات العيادة'],
                ['اسم العيادة', clinic.name],
                ['النوع', clinic.type || 'غير محدد'],
                ['الموقع', clinic.location || 'غير محدد'],
                ['الحالة', clinic.status === 'active' ? 'نشط' : 'غير نشط'],
                [''],
                ['ملخص المواد المجهزة'],
                ['إجمالي الأصناف', categoriesSent.total],
                ['إجمالي الكمية', categoriesSent.totalQuantity],
                ['المبلغ الإجمالي (دينار)', categoriesSent.totalAmount],
                ['المتبقي', categoriesSent.remaining]
            ];
            
            const clinicInfoWS = XLSX.utils.aoa_to_sheet(clinicInfoData);
            XLSX.utils.book_append_sheet(wb, clinicInfoWS, 'معلومات العيادة');
            
            // Materials details sheet
            const materialsData = [
                ['اسم المادة', 'النوع', 'الكمية', 'المتبقي', 'السعر', 'المبلغ الإجمالي']
            ];
            
            categoriesSent.categories.forEach(category => {
                materialsData.push([
                    category.name,
                    category.type,
                    category.quantity,
                    category.remaining,
                    category.price > 0 ? category.price : 'غير مثمن',
                    category.totalAmount > 0 ? category.totalAmount : 'غير مثمن'
                ]);
            });
            
            const materialsWS = XLSX.utils.aoa_to_sheet(materialsData);
            XLSX.utils.book_append_sheet(wb, materialsWS, 'تفاصيل المواد');
            
            // Save file
            const fileName = `تفاصيل_العيادة_${clinic.name.replace(/\s+/g, '_')}_${formatCurrentDateForFileName()}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            showMessage(`تم تصدير تفاصيل العيادة إلى Excel بنجاح: ${fileName}`, 'success');
        } else {
            // Fallback to CSV
            exportClinicDetailsToCSV(clinicId);
        }
    } catch (error) {
        console.error('Error exporting clinic details:', error);
        showMessage('خطأ في تصدير تفاصيل العيادة', 'error');
    }
}

function exportClinicDetailsToCSV(clinicId) {
    const clinic = categories.clinics.find(c => c.id === clinicId);
    if (!clinic) return;
    
    try {
        const categoriesSent = calculateCategoriesSent(clinicId);
        const currentDateTime = getCurrentDateTime();
        
        let csvContent = '\ufeff'; // BOM for UTF-8
        
        csvContent += `تقرير تفاصيل العيادة\n`;
        csvContent += `تاريخ التقرير,${currentDateTime}\n\n`;
        csvContent += `معلومات العيادة\n`;
        csvContent += `اسم العيادة,${clinic.name}\n`;
        csvContent += `النوع,${clinic.type || 'غير محدد'}\n`;
        csvContent += `الموقع,${clinic.location || 'غير محدد'}\n`;
        csvContent += `الحالة,${clinic.status === 'active' ? 'نشط' : 'غير نشط'}\n\n`;
        csvContent += `ملخص المواد المجهزة\n`;
        csvContent += `إجمالي الأصناف,${categoriesSent.total}\n`;
        csvContent += `إجمالي الكمية,${categoriesSent.totalQuantity}\n`;
        csvContent += `المبلغ الإجمالي (دينار),${categoriesSent.totalAmount}\n`;
        csvContent += `المتبقي,${categoriesSent.remaining}\n\n`;
        csvContent += `تفاصيل المواد المجهزة\n`;
        csvContent += `اسم المادة,النوع,الكمية,المتبقي,السعر,المبلغ الإجمالي\n`;
        
        categoriesSent.categories.forEach(category => {
            csvContent += `"${category.name}","${category.type}",${category.quantity},${category.remaining},"${category.price > 0 ? category.price : 'غير مثمن'}","${category.totalAmount > 0 ? category.totalAmount : 'غير مثمن'}"\n`;
        });
        
        const fileName = `تفاصيل_العيادة_${clinic.name.replace(/\s+/g, '_')}_${formatCurrentDateForFileName()}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        showMessage(`تم تصدير تفاصيل العيادة إلى CSV بنجاح: ${fileName}`, 'success');
    } catch (error) {
        console.error('Error exporting clinic details to CSV:', error);
        showMessage('خطأ في تصدير تفاصيل العيادة', 'error');
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
    const totalInsurance = categories.clinics.filter(c => c.category === 'insurance').length;
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
            <p>الأجنحة الخاصة</p>
        </div>
        <div class="overview-card">
            <h3>${totalInsurance}</h3>
            <p>عيادة تأمين صحي</p>
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
                <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
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
                <td class="quantity">${formatNumber(categoriesSent.totalQuantity)}</td>
                <td class="amount">${formatNumber(categoriesSent.totalAmount)} دينار</td>
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
        const bookletCount = category.remaining || (category.quantity - used);
        
        return `
            <tr>
                <td>${category.name}</td>
                <td class="amount">${formatNumber(category.price)} دينار</td>
                <td class="quantity">${formatNumber(category.quantity)}</td>
                <td class="used">${formatNumber(used)}</td>
                <td class="remaining">${formatNumber(bookletCount)}</td>
                <td class="amount">${formatNumber(category.total)} دينار</td>
            </tr>
        `;
    }).join('');
    
    // Load unpriced categories
    const unpricedTbody = document.getElementById('unpriced-info-tbody');
    unpricedTbody.innerHTML = categories.unpriced.map(category => {
        const used = category.used || 0;
        const bookletCount = category.remaining || (category.quantity - used);
        
        return `
            <tr>
                <td>${category.name}</td>
                <td class="quantity">${formatNumber(category.quantity)}</td>
                <td class="used">${formatNumber(used)}</td>
                <td class="remaining">${formatNumber(bookletCount)}</td>
            </tr>
        `;
    }).join('');
}

function calculateCategoriesSent(itemId) {
    // Calculate actual categories sent to this clinic/item using send records
    let totalCategories = 0;
    let totalAmount = 0;
    let totalQuantity = 0;
    let bookletQuantity = 0;
    let categoriesList = [];
    
    // Get send records from localStorage
    const sendRecords = getSendRecords();
    
    // Filter records for this specific clinic/item
    const clinicRecords = sendRecords.filter(record => record.destinationId === itemId);
    
    // Process each send record
    clinicRecords.forEach(record => {
        totalCategories++;
        totalQuantity += record.quantity || 0;
        
        // Find the category to get its details
        let category = null;
        if (record.categoryType === 'priced') {
            category = categories.priced.find(c => c.id === record.categoryId);
        } else {
            category = categories.unpriced.find(c => c.id === record.categoryId);
        }
        
        if (category) {
            const categoryAmount = (category.price || 0) * (category.quantity || 0) * (category.bookletCount || 1);
            totalAmount += categoryAmount;
            bookletQuantity += record.quantity || 0;
            
            categoriesList.push({
                name: category.name,
                type: record.categoryType === 'priced' ? 'مثمن' : 'غير مثمن',
                quantity: record.quantity || 0,
                remaining: record.quantity || 0,
                price: category.price || 0,
                totalAmount: categoryAmount,
                timestamp: record.timestamp || '',
                date: record.date || ''
            });
        }
    });
    
    return {
        total: totalCategories,
        totalAmount: totalAmount,
        totalQuantity: totalQuantity,
        remaining: bookletQuantity,
        categories: categoriesList
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
        const fileName = `مطابقة_مخزن_البطاقات_${formatCurrentDateForFileName()}.xlsx`;
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
        const fileName = `مطابقة_مخزن_البطاقات_${formatCurrentDateForFileName()}.csv`;
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
                    const bookletCount = category.remaining || (category.quantity - used);
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
                    const bookletCount = category.remaining || (category.quantity - used);
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
    const remaining = currentSendCategory.remaining || currentSendCategory.bookletCount || 1;
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

async function confirmSend() {
    const destinationType = document.getElementById('destinationType').value;
    const destinationId = document.getElementById('destinationSelect').value;
    const quantity = parseInt(document.getElementById('sendQuantity').value);
    const notes = document.getElementById('sendNotes').value;
    
    // Validation
    if (!destinationType || !destinationId || !quantity) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    const remaining = currentSendCategory.remaining || currentSendCategory.bookletCount || 1;
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
        const newRemaining = (currentSendCategory.remaining || currentSendCategory.bookletCount || 1) - quantity;
        
        // Update local data
        currentSendCategory.used = newUsed;
        currentSendCategory.remaining = Math.max(newRemaining, 0);
        if (currentSendType === 'priced') {
            const price = currentSendCategory.price || 0;
            currentSendCategory.total = price * (currentSendCategory.quantity || 0) * (currentSendCategory.remaining || 1); // price × quantity × remaining
        }
        
        // Save to localStorage first
        saveToLocalStorage();
        
        // Try to save to Firebase if available
        if (db) {
            try {
                const updateDoc = { used: newUsed, remaining: newRemaining };
                if (currentSendType === 'priced') {
                    updateDoc.total = (currentSendCategory.price || 0) * (currentSendCategory.quantity || 0) * (currentSendCategory.remaining || 1);
                }
                
                // Check if document exists before updating
                const docRef = db.collection(currentSendType + 'Categories').doc(currentSendCategory.id);
                const doc = await docRef.get();
                
                if (doc.exists) {
                    await docRef.update(updateDoc);
                    console.log('Category updated in Firebase successfully');
                } else {
                    // Document doesn't exist, create it
                    await docRef.set({ id: currentSendCategory.id, ...updateDoc });
                    console.log('Category created in Firebase successfully');
                }
            } catch (firebaseError) {
                console.log('Firebase update failed, using localStorage backup:', firebaseError.message);
            }
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

// Warehouse Management Functions
function addWarehouseItem() {
    const modal = document.getElementById('warehouseModal');
    modal.style.display = 'block';
    document.getElementById('warehouseForm').reset();
    // Reset price field visibility
    toggleWarehousePriceField();
    // Remove existing event listeners to prevent duplicates
    const itemQuantity = document.getElementById('itemQuantity');
    const itemUsed = document.getElementById('itemUsed');
    
    // Clone elements to remove all event listeners
    const newItemQuantity = itemQuantity.cloneNode(true);
    const newItemUsed = itemUsed.cloneNode(true);
    
    itemQuantity.parentNode.replaceChild(newItemQuantity, itemQuantity);
    itemUsed.parentNode.replaceChild(newItemUsed, itemUsed);
    
    // Add event listeners for auto-calculation
    document.getElementById('itemQuantity').addEventListener('input', calculateRemaining);
    document.getElementById('itemUsed').addEventListener('input', calculateRemaining);
}

function toggleWarehousePriceField() {
    const itemType = document.getElementById('itemType').value;
    const priceGroup = document.getElementById('itemPriceGroup');
    const totalGroup = document.getElementById('itemTotalGroup');
    const priceInput = document.getElementById('itemPrice');
    
    if (itemType === 'priced') {
        priceGroup.style.display = 'block';
        totalGroup.style.display = 'block';
        priceInput.required = true;
        // Remove existing event listeners to prevent duplicates
        const priceInput = document.getElementById('itemPrice');
        const itemQuantity = document.getElementById('itemQuantity');
        const itemUsed = document.getElementById('itemUsed');
        
        // Clone elements to remove all event listeners
        const newPriceInput = priceInput.cloneNode(true);
        const newItemQuantity = itemQuantity.cloneNode(true);
        const newItemUsed = itemUsed.cloneNode(true);
        
        priceInput.parentNode.replaceChild(newPriceInput, priceInput);
        itemQuantity.parentNode.replaceChild(newItemQuantity, itemQuantity);
        itemUsed.parentNode.replaceChild(newItemUsed, itemUsed);
        
        // Add event listeners for automatic calculation
        document.getElementById('itemPrice').addEventListener('input', calculateWarehouseTotal);
        document.getElementById('itemQuantity').addEventListener('input', calculateWarehouseTotal);
        document.getElementById('itemUsed').addEventListener('input', calculateWarehouseTotal);
    } else {
        priceGroup.style.display = 'none';
        totalGroup.style.display = 'none';
        priceInput.required = false;
        priceInput.value = '';
        document.getElementById('itemTotal').value = '';
    }
}

function calculateWarehouseTotal() {
    const price = parseFloat(document.getElementById('itemPrice').value) || 0;
    const quantity = parseFloat(document.getElementById('itemQuantity').value) || 0;
    const used = parseFloat(document.getElementById('itemUsed').value) || 0;
    
    const total = price * quantity;
    document.getElementById('itemTotal').value = total.toFixed(2);
}

function calculateRemaining() {
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 0;
    const used = parseInt(document.getElementById('itemUsed').value) || 0;
    const remaining = Math.max(quantity - used, 0);
    document.getElementById('itemRemaining').value = remaining;
}

function closeWarehouseModal() {
    document.getElementById('warehouseModal').style.display = 'none';
    document.getElementById('warehouseForm').reset();
}

// Send warehouse item to clinic
function sendWarehouseItem(itemId) {
    const item = categories.warehouse.find(i => i.id === itemId);
    if (!item) {
        showMessage('العنصر غير موجود', 'error');
        return;
    }
    
    if (item.remaining <= 0) {
        showMessage('لا يوجد متبقي من هذا العنصر', 'error');
        return;
    }
    
    // Create clinic selection modal
    const modalContent = `
        <div class="modal" id="sendWarehouseModal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-paper-plane"></i> إرسال ${item.name} إلى العيادة</h3>
                    <button class="close-btn" onclick="closeSendWarehouseModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="item-info">
                        <h4>معلومات العنصر:</h4>
                        <p><strong>الاسم:</strong> ${item.name}</p>
                        <p><strong>النوع:</strong> ${item.type === 'priced' ? 'مثمن' : 'غير مثمن'}</p>
                        <p><strong>المتبقي:</strong> ${formatNumber(item.remaining)}</p>
                        ${item.price > 0 ? `<p><strong>السعر:</strong> ${formatNumber(item.price)} دينار</p>` : ''}
                    </div>
                    
                    <div class="form-group">
                        <label for="clinicSelectSend">اختر العيادة:</label>
                        <select id="clinicSelectSend" required>
                            <option value="">اختر العيادة</option>
                            ${categories.clinics.map(clinic => 
                                `<option value="${clinic.id}">${clinic.name} (${clinic.type || 'غير محدد'})</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="sendQuantity">الكمية المرسلة:</label>
                        <input type="number" id="sendQuantity" min="1" max="${item.remaining}" value="${item.remaining}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sendNotes">ملاحظات الإرسال:</label>
                        <textarea id="sendNotes" rows="3" placeholder="ملاحظات إضافية"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeSendWarehouseModal()">إلغاء</button>
                    <button class="btn btn-primary" onclick="confirmSendWarehouseItem('${itemId}')">إرسال</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
}

function closeSendWarehouseModal() {
    const modal = document.getElementById('sendWarehouseModal');
    if (modal) {
        modal.remove();
    }
}

async function confirmSendWarehouseItem(itemId) {
    const clinicId = document.getElementById('clinicSelectSend').value;
    const sendQuantity = parseInt(document.getElementById('sendQuantity').value);
    const sendNotes = document.getElementById('sendNotes').value.trim();
    
    if (!clinicId || !sendQuantity) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    const item = categories.warehouse.find(i => i.id === itemId);
    const clinic = categories.clinics.find(c => c.id === clinicId);
    
    if (!item || !clinic) {
        showMessage('العنصر أو العيادة غير موجود', 'error');
        return;
    }
    
    if (sendQuantity > item.remaining) {
        showMessage('الكمية المطلوبة أكبر من المتوفر', 'error');
        return;
    }
    
    try {
        // Update warehouse item
        item.used = (item.used || 0) + sendQuantity;
        item.remaining = item.remaining - sendQuantity;
        item.sentTo = clinicId;
        
        // Add to clinic's received items (if you want to track this)
        if (!clinic.receivedItems) {
            clinic.receivedItems = [];
        }
        
        clinic.receivedItems.push({
            itemId: itemId,
            itemName: item.name,
            quantity: sendQuantity,
            sentDate: new Date().toISOString(),
            notes: sendNotes
        });
        
        await saveData();
        renderWarehouse();
        closeSendWarehouseModal();
        
        showMessage(`تم إرسال ${sendQuantity} من ${item.name} إلى ${clinic.name} بنجاح`, 'success');
    } catch (error) {
        console.error('Error sending warehouse item:', error);
        showMessage('خطأ في إرسال العنصر', 'error');
    }
}

async function saveWarehouseItem() {
    const name = document.getElementById('itemName').value.trim();
    const itemType = document.getElementById('itemType').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 0;
    const used = parseInt(document.getElementById('itemUsed').value) || 0;
    const remaining = parseInt(document.getElementById('itemRemaining').value) || 0;
    const price = parseFloat(document.getElementById('itemPrice').value) || 0;
    const supplier = document.getElementById('itemSupplier').value.trim();
    const notes = document.getElementById('itemNotes').value.trim();
    
    if (!name || !itemType || !quantity) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (itemType === 'priced' && !price) {
        showMessage('يرجى إدخال السعر للمواد المثمنة', 'error');
        return;
    }
    
    const newItem = {
        name: name,
        type: itemType,
        quantity: quantity,
        used: used,
        remaining: remaining,
        price: price,
        totalAmount: price * quantity * used,
        supplier: supplier,
        notes: notes,
        entryDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        user: 'المستخدم الحالي',
        sentTo: null,
        originalType: 'manual'
    };
    
    try {
        // Check if Firebase is available
        if (db) {
            const docRef = await db.collection('warehouse').add(newItem);
            newItem.id = docRef.id;
        } else {
            // Generate local ID if Firebase not available
            newItem.id = 'warehouse_' + Date.now();
        }
        
        categories.warehouse.push(newItem);
        
        // Save to Firebase and localStorage
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
        saveToLocalStorage();
        
        renderWarehouse();
        closeWarehouseModal();
        showMessage('تم إضافة الصنف للمخزن بنجاح', 'success');
    } catch (error) {
        console.error('Error adding warehouse item:', error);
        showMessage('خطأ في إضافة الصنف للمخزن', 'error');
    }
}

async function editWarehouseItem(itemId) {
    const item = categories.warehouse.find(i => i.id === itemId);
    if (!item) return;
    
    const newName = prompt('اسم الصنف:', item.name);
    if (newName === null) return;
    
    const quantityInput = prompt('الكمية:', String(item.quantity ?? ''));
    if (quantityInput === null) return;
    const newQuantity = parseFloat(quantityInput);
    if (Number.isNaN(newQuantity) || newQuantity < 0) {
        showMessage('قيمة الكمية غير صالحة', 'error');
        return;
    }
    
    const priceInput = prompt('السعر (دينار):', String(item.price ?? ''));
    if (priceInput === null) return;
    const newPrice = parseFloat(priceInput);
    if (Number.isNaN(newPrice) || newPrice < 0) {
        showMessage('قيمة السعر غير صالحة', 'error');
        return;
    }
    
    const updatedItem = {
        ...item,
        name: newName,
        quantity: newQuantity,
        price: newPrice,
        totalAmount: newPrice * newQuantity
    };
    
    try {
        // Try Firebase first
        if (db) {
            await db.collection('warehouse').doc(itemId).update(updatedItem);
        }
        
        // Update local data
        const index = categories.warehouse.findIndex(i => i.id === itemId);
        if (index !== -1) {
            categories.warehouse[index] = updatedItem;
        }
        
        // Save to Firebase and localStorage
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
        saveToLocalStorage();
        
        renderWarehouse();
        showMessage('تم تحديث الصنف بنجاح', 'success');
    } catch (error) {
        console.error('Error updating warehouse item:', error);
        showMessage('خطأ في تحديث الصنف', 'error');
    }
}

async function deleteWarehouseItem(itemId) {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف من المخزن؟')) return;
    
    try {
        // Try Firebase first
        if (db) {
            await db.collection('warehouse').doc(itemId).delete();
        }
        
        // Remove from local data
        categories.warehouse = categories.warehouse.filter(i => i.id !== itemId);
        
        // Save to Firebase and localStorage
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
        saveToLocalStorage();
        
        renderWarehouse();
        showMessage('تم حذف الصنف من المخزن بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting warehouse item:', error);
        showMessage('خطأ في حذف الصنف', 'error');
    }
}

function showWarehouseReports() {
    const modal = document.getElementById('warehouseReportsModal');
    modal.style.display = 'block';
    generateWarehouseReports();
}

function closeWarehouseReportsModal() {
    document.getElementById('warehouseReportsModal').style.display = 'none';
}

function generateWarehouseReports() {
    const totalItems = categories.warehouse.length;
    const totalValue = categories.warehouse.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0) * (item.used || 0)), 0);
    const lowStockItems = categories.warehouse.filter(item => (item.quantity || 0) < 10).length;
    
    document.getElementById('warehouse-total-items').innerHTML = `
        <div class="stat-card">
            <h3>${totalItems}</h3>
            <p>صنف</p>
        </div>
    `;
    
    document.getElementById('warehouse-total-value').innerHTML = `
        <div class="stat-card">
            <h3>${formatNumber(totalValue)}</h3>
            <p>دينار</p>
        </div>
    `;
    
    document.getElementById('warehouse-low-stock').innerHTML = `
        <div class="stat-card">
            <h3>${lowStockItems}</h3>
            <p>صنف</p>
        </div>
    `;
    
    // Generate detailed report
    const detailsContainer = document.getElementById('warehouse-details');
    detailsContainer.innerHTML = `
        <div class="warehouse-report-details">
            <h4>تفاصيل تقرير المخزن</h4>
            <p><strong>تاريخ التقرير:</strong> ${getCurrentDateTime()}</p>
            <div class="warehouse-table-container">
                <table class="warehouse-report-table">
                    <thead>
                        <tr>
                            <th>اسم الصنف</th>
                            <th>الكمية</th>
                            <th>وحدة القياس</th>
                            <th>السعر</th>
                            <th>المبلغ الإجمالي</th>
                            <th>تاريخ الإدخال</th>
                            <th>المورد</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categories.warehouse.map(item => {
                            const totalAmount = (item.price || 0) * (item.quantity || 0) * (item.used || 0);
                            return `
                            <tr>
                                <td>${item.name}</td>
                                <td class="quantity">${formatNumber(item.quantity)}</td>
                                <td>${item.unit || 'غير محدد'}</td>
                                <td class="amount">${formatNumber(item.price)} دينار</td>
                                <td class="amount">${formatNumber(totalAmount)} دينار</td>
                                <td>${formatGregorianDateNumbers(item.entryDate)}</td>
                                <td>${item.supplier || 'غير محدد'}</td>
                            </tr>
                        `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function printWarehouseReport() {
    const printContent = document.getElementById('warehouse-details').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>تقرير المخزن - ${getCurrentDateTime()}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                .quantity { text-align: center; }
                .amount { text-align: left; }
                h4 { color: #333; }
                p { margin: 10px 0; }
            </style>
        </head>
        <body>
            <h2>تقرير المخزن المفصل</h2>
            <p><strong>تاريخ التقرير:</strong> ${getCurrentDateTime()}</p>
            ${printContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function exportWarehouseData() {
    // Try Excel first, fallback to CSV if not available
    if (typeof XLSX !== 'undefined') {
        exportWarehouseToRealExcel();
    } else {
        exportWarehouseToExcel();
    }
}

function exportWarehouseToExcel() {
    try {
        const currentDateTime = getCurrentDateTime();
        const fileName = `تقرير_المخزن_${formatCurrentDateForFileName()}.csv`;
        
        // Create CSV content with proper formatting
        let csvContent = '\ufeff'; // BOM for UTF-8
        
        // Add header information
        csvContent += `تقرير المخزن المفصل\n`;
        csvContent += `تاريخ التقرير,${currentDateTime}\n\n`;
        
        // Summary section
        const totalItems = categories.warehouse.length;
        const totalValue = categories.warehouse.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0) * (item.used || 0)), 0);
        const lowStockItems = categories.warehouse.filter(item => (item.quantity || 0) < 10).length;
        
        csvContent += `الإحصائيات العامة\n`;
        csvContent += `إجمالي الأصناف,${totalItems}\n`;
        csvContent += `إجمالي القيمة (دينار),${formatNumber(totalValue)}\n`;
        csvContent += `أصناف منخفضة المخزون,${lowStockItems}\n\n`;
        
        // Detailed data with proper CSV formatting
        csvContent += `تفاصيل الأصناف\n`;
        csvContent += `اسم الصنف,الكمية,وحدة القياس,السعر (دينار),المبلغ الإجمالي (دينار),تاريخ الإدخال,المورد,ملاحظات\n`;
        
        categories.warehouse.forEach(item => {
            const name = (item.name || '').replace(/"/g, '""'); // Escape quotes
            const unit = (item.unit || '').replace(/"/g, '""');
            const supplier = (item.supplier || 'غير محدد').replace(/"/g, '""');
            const notes = (item.notes || '').replace(/"/g, '""');
            const entryDate = formatGregorianDateNumbers(item.entryDate).replace(/"/g, '""');
            const totalAmount = (item.price || 0) * (item.quantity || 0) * (item.used || 0);
            
            csvContent += `"${name}",${item.quantity},"${unit}",${item.price},${totalAmount},"${entryDate}","${supplier}","${notes}"\n`;
        });
        
        // Create and download file with proper CSV MIME type
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        showMessage(`تم تصدير تقرير المخزن بنجاح: ${fileName}`, 'success');
    } catch (error) {
        console.error('Error exporting warehouse data:', error);
        showMessage('خطأ في تصدير تقرير المخزن', 'error');
    }
}

// Alternative Excel export function using SheetJS
function exportWarehouseToRealExcel() {
    try {
        // Check if SheetJS is available
        if (typeof XLSX === 'undefined') {
            // Fallback to CSV if SheetJS is not available
            exportWarehouseToExcel();
            return;
        }
        
        const currentDateTime = getCurrentDateTime();
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Summary data
        const totalItems = categories.warehouse.length;
        const totalValue = categories.warehouse.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0) * (item.used || 0)), 0);
        const lowStockItems = categories.warehouse.filter(item => (item.quantity || 0) < 10).length;
        
        // Summary sheet
        const summaryData = [
            ['تقرير المخزن المفصل'],
            ['تاريخ التقرير', currentDateTime],
            [''],
            ['الإحصائيات العامة'],
            ['إجمالي الأصناف', totalItems],
            ['إجمالي القيمة (دينار)', totalValue],
            ['أصناف منخفضة المخزون', lowStockItems]
        ];
        
        const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWS, 'ملخص');
        
        // Detailed data sheet
        const detailedData = [
            ['اسم الصنف', 'الكمية', 'وحدة القياس', 'السعر (دينار)', 'المبلغ الإجمالي (دينار)', 'تاريخ الإدخال', 'المورد', 'ملاحظات']
        ];
        
        categories.warehouse.forEach(item => {
            const totalAmount = (item.price || 0) * (item.quantity || 0) * (item.used || 0);
            detailedData.push([
                item.name || '',
                item.quantity || 0,
                item.unit || '',
                item.price || 0,
                totalAmount,
                formatGregorianDateNumbers(item.entryDate),
                item.supplier || 'غير محدد',
                item.notes || ''
            ]);
        });
        
        const detailedWS = XLSX.utils.aoa_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(wb, detailedWS, 'تفاصيل الأصناف');
        
        // Save file
        const fileName = `تقرير_المخزن_${formatCurrentDateForFileName()}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showMessage(`تم تصدير تقرير المخزن إلى Excel بنجاح: ${fileName}`, 'success');
    } catch (error) {
        console.error('Error exporting to real Excel:', error);
        // Fallback to CSV export
        exportWarehouseToExcel();
    }
}

// Data Migration Functions - تحويل البيانات الموجودة إلى المخزن
function migrateExistingDataToWarehouse() {
    if (confirm('هل تريد تحويل البيانات الموجودة (الفئات المثمنة وغير المثمنة) إلى أصناف في المخزن؟')) {
        try {
            // تحويل الفئات المثمنة إلى أصناف مخزن
            categories.priced.forEach(category => {
                const warehouseItem = {
                    id: 'warehouse_' + category.id + '_' + Date.now(),
                    name: category.name,
                    type: 'priced',
                    quantity: category.quantity || 0,
                    used: category.used || 0,
                    remaining: category.remaining || Math.max((category.quantity || 0) - (category.used || 0), 0),
                    price: category.price || 0,
                    totalAmount: (category.price || 0) * (category.quantity || 0),
                    supplier: 'مورد افتراضي',
                    notes: `محول من الفئات المثمنة`,
                    entryDate: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    user: 'نظام التحويل',
                    originalType: 'priced',
                    originalId: category.id,
                    sentTo: category.sentTo || null
                };
                
                categories.warehouse.push(warehouseItem);
            });
            
            // تحويل الفئات غير المثمنة إلى أصناف مخزن
            categories.unpriced.forEach(category => {
                const warehouseItem = {
                    id: 'warehouse_' + category.id + '_' + Date.now(),
                    name: category.name,
                    type: 'unpriced',
                    quantity: category.quantity || 0,
                    used: category.used || 0,
                    remaining: category.remaining || Math.max((category.quantity || 0) - (category.used || 0), 0),
                    price: 0, // غير مثمن
                    totalAmount: 0,
                    supplier: 'مورد افتراضي',
                    notes: `محول من الفئات غير المثمنة`,
                    entryDate: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    user: 'نظام التحويل',
                    originalType: 'unpriced',
                    originalId: category.id,
                    sentTo: category.sentTo || null
                };
                
                categories.warehouse.push(warehouseItem);
            });
            
            // حفظ البيانات
            saveToLocalStorage();
            try {
                saveData();
            } catch (error) {
                console.log('Firebase save failed, using localStorage backup');
            }
            
            // إعادة عرض المخزن
            renderWarehouse();
            
            showMessage(`تم تحويل ${categories.priced.length + categories.unpriced.length} صنف إلى المخزن بنجاح`, 'success');
            
        } catch (error) {
            console.error('Error migrating data to warehouse:', error);
            showMessage('خطأ في تحويل البيانات إلى المخزن', 'error');
        }
    }
}

function loadDefaultDataToWarehouse() {
    if (confirm('هل تريد تحميل البيانات الافتراضية إلى المخزن؟')) {
        try {
            // تحميل البيانات الافتراضية من ملف default-data.js
            const defaultData = {
                // الفئات المثمنة الافتراضية
                priced: [
                    { id: '1', name: 'فئة 1500 دينار', price: 1500, quantity: 100, total: 150000, used: 0, remaining: 100 },
                    { id: '2', name: 'فئة 3000 دينار', price: 3000, quantity: 100, total: 300000, used: 0, remaining: 100 },
                    { id: '3', name: 'فئة 4000 دينار', price: 4000, quantity: 100, total: 400000, used: 0, remaining: 100 },
                    { id: '4', name: 'فئة 5000 دينار', price: 5000, quantity: 100, total: 500000, used: 0, remaining: 100 },
                    { id: '5', name: 'فئة 25000 دينار', price: 25000, quantity: 50, total: 1250000, used: 0, remaining: 50 },
                    { id: '6', name: 'فئة 40000 دينار', price: 40000, quantity: 50, total: 2000000, used: 0, remaining: 50 }
                ],
                // الفئات غير المثمنة الافتراضية
                unpriced: [
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
                ]
            };
            
            // تحويل الفئات المثمنة إلى أصناف مخزن
            defaultData.priced.forEach(category => {
                const warehouseItem = {
                    id: 'default_warehouse_' + category.id + '_' + Date.now(),
                    name: category.name,
                    quantity: category.quantity || 0,
                    unit: 'قطعة',
                    price: category.price || 0,
                    totalAmount: (category.price || 0) * (category.quantity || 0),
                    supplier: 'مورد افتراضي',
                    notes: `بيانات افتراضية - فئة مثمنة`,
                    entryDate: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    user: 'النظام الافتراضي',
                    originalType: 'default_priced',
                    originalId: category.id
                };
                
                categories.warehouse.push(warehouseItem);
            });
            
            // تحويل الفئات غير المثمنة إلى أصناف مخزن
            defaultData.unpriced.forEach(category => {
                const warehouseItem = {
                    id: 'default_warehouse_' + category.id + '_' + Date.now(),
                    name: category.name,
                    quantity: category.quantity || 0,
                    unit: 'قطعة',
                    price: 0, // غير مثمن
                    totalAmount: 0,
                    supplier: 'مورد افتراضي',
                    notes: `بيانات افتراضية - فئة غير مثمنة`,
                    entryDate: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    user: 'النظام الافتراضي',
                    originalType: 'default_unpriced',
                    originalId: category.id
                };
                
                categories.warehouse.push(warehouseItem);
            });
            
            // حفظ البيانات
            saveToLocalStorage();
            try {
                saveData();
            } catch (error) {
                console.log('Firebase save failed, using localStorage backup');
            }
            
            // إعادة عرض المخزن
            renderWarehouse();
            
            showMessage(`تم تحميل ${defaultData.priced.length + defaultData.unpriced.length} صنف افتراضي إلى المخزن بنجاح`, 'success');
            
        } catch (error) {
            console.error('Error loading default data to warehouse:', error);
            showMessage('خطأ في تحميل البيانات الافتراضية إلى المخزن', 'error');
        }
    }
}

function clearWarehouseData() {
    if (confirm('هل أنت متأكد من مسح جميع بيانات المخزن؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        try {
            categories.warehouse = [];
            
            // حفظ البيانات
            saveToLocalStorage();
            try {
                saveData();
            } catch (error) {
                console.log('Firebase save failed, using localStorage backup');
            }
            
            // إعادة عرض المخزن
            renderWarehouse();
            
            showMessage('تم مسح جميع بيانات المخزن بنجاح', 'success');
        } catch (error) {
            console.error('Error clearing warehouse data:', error);
            showMessage('خطأ في مسح بيانات المخزن', 'error');
        }
    }
}

// Test function to demonstrate the migration
function testMigration() {
    console.log('Testing data migration...');
    console.log('Current warehouse items:', categories.warehouse.length);
    console.log('Current priced categories:', categories.priced.length);
    console.log('Current unpriced categories:', categories.unpriced.length);
}

// Real-time date display functions
function updateDateTimeDisplay() {
    const dateTimeElement = document.getElementById('dateTimeDisplay');
    if (dateTimeElement) {
        dateTimeElement.textContent = getCurrentDateTime();
    }
    
    // Update button states
    updateCalendarButtonStates();
}

function updateCalendarButtonStates() {
    const hijriButton = document.querySelector('button[onclick="setCalendarType(true)"]');
    const gregorianButton = document.querySelector('button[onclick="setCalendarType(false)"]');
    
    if (hijriButton && gregorianButton) {
        // Remove active class from both buttons
        hijriButton.classList.remove('active');
        gregorianButton.classList.remove('active');
        
        // Add active class to current calendar button
        if (useHijriCalendar) {
            hijriButton.classList.add('active');
        } else {
            gregorianButton.classList.add('active');
        }
    }
}

let dateTimeInterval = null;

function startDateTimeUpdates() {
    // Clear any existing interval to prevent multiple intervals
    if (dateTimeInterval) {
        clearInterval(dateTimeInterval);
    }
    
    // Update immediately
    updateDateTimeDisplay();
    
    // Update every second
    dateTimeInterval = setInterval(updateDateTimeDisplay, 1000);
}

function stopDateTimeUpdates() {
    if (dateTimeInterval) {
        clearInterval(dateTimeInterval);
        dateTimeInterval = null;
    }
}

// Carried Over Items Management Functions
function addCarriedOverItem() {
    const modal = document.getElementById('carriedOverModal');
    modal.style.display = 'block';
    document.getElementById('carriedOverForm').reset();
    // Reset price field visibility
    toggleCarriedOverPriceField();
    // Remove existing event listeners to prevent duplicates
    const carriedOverQuantity = document.getElementById('carriedOverQuantity');
    const carriedOverUsed = document.getElementById('carriedOverUsed');
    
    // Clone elements to remove all event listeners
    const newCarriedOverQuantity = carriedOverQuantity.cloneNode(true);
    const newCarriedOverUsed = carriedOverUsed.cloneNode(true);
    
    carriedOverQuantity.parentNode.replaceChild(newCarriedOverQuantity, carriedOverQuantity);
    carriedOverUsed.parentNode.replaceChild(newCarriedOverUsed, carriedOverUsed);
    
    // Add event listeners for auto-calculation
    document.getElementById('carriedOverQuantity').addEventListener('input', calculateCarriedOverRemaining);
    document.getElementById('carriedOverUsed').addEventListener('input', calculateCarriedOverRemaining);
}

function toggleCarriedOverPriceField() {
    const itemType = document.getElementById('carriedOverType').value;
    const priceGroup = document.getElementById('carriedOverPriceGroup');
    const priceInput = document.getElementById('carriedOverPrice');
    
    if (itemType === 'priced') {
        priceGroup.style.display = 'block';
        priceInput.required = true;
    } else {
        priceGroup.style.display = 'none';
        priceInput.required = false;
        priceInput.value = '';
    }
}

function calculateCarriedOverRemaining() {
    const quantity = parseInt(document.getElementById('carriedOverQuantity').value) || 0;
    const used = parseInt(document.getElementById('carriedOverUsed').value) || 0;
    const remaining = Math.max(quantity - used, 0);
    document.getElementById('carriedOverRemaining').value = remaining;
}

function closeCarriedOverModal() {
    document.getElementById('carriedOverModal').style.display = 'none';
    document.getElementById('carriedOverForm').reset();
}

async function saveCarriedOverItem() {
    const name = document.getElementById('carriedOverName').value.trim();
    const itemType = document.getElementById('carriedOverType').value;
    const quantity = parseInt(document.getElementById('carriedOverQuantity').value) || 0;
    const used = parseInt(document.getElementById('carriedOverUsed').value) || 0;
    const remaining = parseInt(document.getElementById('carriedOverRemaining').value) || 0;
    const price = parseFloat(document.getElementById('carriedOverPrice').value) || 0;
    const supplier = document.getElementById('carriedOverSupplier').value.trim();
    const notes = document.getElementById('carriedOverNotes').value.trim();
    
    if (!name || !itemType || !quantity) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (itemType === 'priced' && !price) {
        showMessage('يرجى إدخال السعر للمواد المثمنة', 'error');
        return;
    }
    
    const newItem = {
        name: name,
        type: itemType,
        quantity: quantity,
        used: used,
        remaining: remaining,
        price: price,
        totalAmount: price * quantity,
        supplier: supplier,
        notes: notes,
        entryDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        user: 'المستخدم الحالي',
        sentTo: null,
        originalType: 'carried_over',
        carriedOverYear: new Date().getFullYear() - 1
    };
    
    try {
        // Check if Firebase is available
        if (db) {
            const docRef = await db.collection('carriedOver').add(newItem);
            newItem.id = docRef.id;
        } else {
            // Generate local ID if Firebase not available
            newItem.id = 'carried_over_' + Date.now();
        }
        
        categories.carriedOver.push(newItem);
        
        // Save to Firebase and localStorage
        try {
            await saveData();
        } catch (error) {
            console.log('Firebase save failed, using localStorage backup');
        }
        saveToLocalStorage();
        
        renderCarriedOver();
        closeCarriedOverModal();
        showMessage('تم إضافة المادة المدورة بنجاح', 'success');
    } catch (error) {
        console.error('Error saving carried over item:', error);
        showMessage('خطأ في حفظ المادة المدورة', 'error');
    }
}

function renderCarriedOver() {
    const tbody = document.getElementById('carried-over-tbody');
    const summary = document.getElementById('carried-over-summary');
    
    if (categories.carriedOver.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    لا توجد مواد مدورة من العام الماضي
                </td>
            </tr>
        `;
        summary.innerHTML = '';
        return;
    }
    
    // Render table rows
    tbody.innerHTML = categories.carriedOver.map(item => {
        const totalAmount = (item.price || 0) * (item.quantity || 0);
        const entryDate = formatCurrentDate(item.entryDate || item.createdAt);
        
        const typeBadge = item.type === 'priced' ? 
            '<span class="type-badge priced">مثمن</span>' : 
            '<span class="type-badge unpriced">غير مثمن</span>';
        
        return `
            <tr>
                <td>
                    ${item.name}
                    <br><small><span class="badge badge-info">مدور من ${item.carriedOverYear || (new Date().getFullYear() - 1)}</span></small>
                </td>
                <td>${typeBadge}</td>
                <td class="quantity">${formatNumber(item.quantity)}</td>
                <td class="quantity">${formatNumber(item.remaining || 0)}</td>
                <td class="amount">${item.price > 0 ? formatNumber(item.price) + ' دينار' : 'غير مثمن'}</td>
                <td class="amount">${totalAmount > 0 ? formatNumber(totalAmount) + ' دينار' : 'غير مثمن'}</td>
                <td>${entryDate}</td>
                <td>${item.user || 'غير محدد'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-info" onclick="sendCarriedOverItem('${item.id}')" title="إرسال">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="editCarriedOverItem('${item.id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteCarriedOverItem('${item.id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Render summary cards
    const totalItems = categories.carriedOver.length;
    const totalQuantity = categories.carriedOver.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = categories.carriedOver.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const totalRemaining = categories.carriedOver.reduce((sum, item) => sum + (item.remaining || 0), 0);
    
    summary.innerHTML = `
        <div class="summary-card">
            <h3>${totalItems}</h3>
            <p>إجمالي المواد المدورة</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalQuantity)}</h3>
            <p>إجمالي الكمية</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalValue)}</h3>
            <p>إجمالي القيمة (دينار)</p>
        </div>
        <div class="summary-card">
            <h3>${formatNumber(totalRemaining)}</h3>
            <p>المتبقي</p>
        </div>
    `;
}

function showCarriedOverReports() {
    const modal = document.getElementById('carriedOverReportsModal');
    modal.style.display = 'block';
    
    generateCarriedOverReports();
}

function generateCarriedOverReports() {
    const summaryElement = document.getElementById('carried-over-report-summary');
    const detailsElement = document.getElementById('carried-over-details');
    
    const totalItems = categories.carriedOver.length;
    const totalQuantity = categories.carriedOver.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = categories.carriedOver.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const totalRemaining = categories.carriedOver.reduce((sum, item) => sum + (item.remaining || 0), 0);
    
    summaryElement.innerHTML = `
        <div class="summary-cards">
            <div class="summary-card">
                <h3>${totalItems}</h3>
                <p>إجمالي المواد المدورة</p>
            </div>
            <div class="summary-card">
                <h3>${formatNumber(totalQuantity)}</h3>
                <p>إجمالي الكمية</p>
            </div>
            <div class="summary-card">
                <h3>${formatNumber(totalValue)}</h3>
                <p>إجمالي القيمة (دينار)</p>
            </div>
            <div class="summary-card">
                <h3>${formatNumber(totalRemaining)}</h3>
                <p>المتبقي</p>
            </div>
        </div>
    `;
    
    detailsElement.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>اسم المادة</th>
                    <th>النوع</th>
                    <th>عدد الوصل</th>
                    
                    <th>المتبقي</th>
                    <th>السعر</th>
                    <th>المبلغ الإجمالي</th>
                    <th>تاريخ الإدخال</th>
                    <th>المستخدم</th>
                </tr>
            </thead>
            <tbody>
                ${categories.carriedOver.map(item => {
                    const totalAmount = (item.price || 0) * (item.quantity || 0);
                    const entryDate = formatCurrentDate(item.entryDate || item.createdAt);
                    const typeBadge = item.type === 'priced' ? 'مثمن' : 'غير مثمن';
                    
                    return `
                        <tr>
                            <td>${item.name}</td>
                            <td>${typeBadge}</td>
                            <td class="quantity">${formatNumber(item.quantity)}</td>
                            <td class="quantity">${formatNumber(item.used || 0)}</td>
                            <td class="quantity">${formatNumber(item.remaining || 0)}</td>
                            <td class="amount">${item.price > 0 ? formatNumber(item.price) + ' دينار' : 'غير مثمن'}</td>
                            <td class="amount">${totalAmount > 0 ? formatNumber(totalAmount) + ' دينار' : 'غير مثمن'}</td>
                            <td>${entryDate}</td>
                            <td>${item.user || 'غير محدد'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function closeCarriedOverReportsModal() {
    document.getElementById('carriedOverReportsModal').style.display = 'none';
}

function exportCarriedOverData() {
    exportCarriedOverToExcel();
}

function exportCarriedOverToExcel() {
    try {
        const currentDateTime = getCurrentDateTime();
        
        if (typeof XLSX !== 'undefined') {
            // Create Excel workbook
            const wb = XLSX.utils.book_new();
            
            // Summary sheet
            const totalItems = categories.carriedOver.length;
            const totalQuantity = categories.carriedOver.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const totalValue = categories.carriedOver.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
            const totalRemaining = categories.carriedOver.reduce((sum, item) => sum + (item.remaining || 0), 0);
            
            const summaryData = [
                ['تقرير المواد المدورة من العام الماضي'],
                ['تاريخ التقرير', currentDateTime],
                [''],
                ['ملخص المواد المدورة'],
                ['إجمالي المواد المدورة', totalItems],
                ['إجمالي الكمية', totalQuantity],
                ['إجمالي القيمة (دينار)', totalValue],
                ['المتبقي', totalRemaining]
            ];
            
            const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWS, 'ملخص المواد المدورة');
            
            // Details sheet
            const detailsData = [
                ['اسم المادة', 'النوع', 'عدد الوصل',  'المتبقي', 'السعر', 'المبلغ الإجمالي', 'تاريخ الإدخال', 'المستخدم']
            ];
            
            categories.carriedOver.forEach(item => {
                detailsData.push([
                    item.name,
                    item.type === 'priced' ? 'مثمن' : 'غير مثمن',
                    item.quantity,
                    item.used || 0,
                    item.remaining || 0,
                    item.price > 0 ? item.price : 'غير مثمن',
                    item.price > 0 ? (item.price * item.quantity) : 'غير مثمن',
                    formatCurrentDate(item.entryDate || item.createdAt),
                    item.user || 'غير محدد'
                ]);
            });
            
            const detailsWS = XLSX.utils.aoa_to_sheet(detailsData);
            XLSX.utils.book_append_sheet(wb, detailsWS, 'تفاصيل المواد المدورة');
            
            // Save file
            const fileName = `المواد_المدورة_من_العام_الماضي_${formatCurrentDateForFileName()}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            showMessage(`تم تصدير المواد المدورة إلى Excel بنجاح: ${fileName}`, 'success');
        } else {
            // Fallback to CSV
            exportCarriedOverToCSV();
        }
    } catch (error) {
        console.error('Error exporting carried over data:', error);
        showMessage('خطأ في تصدير المواد المدورة', 'error');
    }
}

function exportCarriedOverToCSV() {
    try {
        const currentDateTime = getCurrentDateTime();
        
        let csvContent = '\ufeff'; // BOM for UTF-8
        
        csvContent += `تقرير المواد المدورة من العام الماضي\n`;
        csvContent += `تاريخ التقرير,${currentDateTime}\n\n`;
        
        const totalItems = categories.carriedOver.length;
        const totalQuantity = categories.carriedOver.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalValue = categories.carriedOver.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
        const totalRemaining = categories.carriedOver.reduce((sum, item) => sum + (item.remaining || 0), 0);
        
        csvContent += `ملخص المواد المدورة\n`;
        csvContent += `إجمالي المواد المدورة,${totalItems}\n`;
        csvContent += `إجمالي الكمية,${totalQuantity}\n`;
        csvContent += `إجمالي القيمة (دينار),${totalValue}\n`;
        csvContent += `المتبقي,${totalRemaining}\n\n`;
        
        csvContent += `تفاصيل المواد المدورة\n`;
        csvContent += `اسم المادة,النوع,عدد الوصل,عدد الجلد,المتبقي,السعر,المبلغ الإجمالي,تاريخ الإدخال,المستخدم\n`;
        
        categories.carriedOver.forEach(item => {
            csvContent += `"${item.name}","${item.type === 'priced' ? 'مثمن' : 'غير مثمن'}",${item.quantity},${item.used || 0},${item.remaining || 0},"${item.price > 0 ? item.price : 'غير مثمن'}","${item.price > 0 ? (item.price * item.quantity) : 'غير مثمن'}","${formatCurrentDate(item.entryDate || item.createdAt)}","${item.user || 'غير محدد'}"\n`;
        });
        
        const fileName = `المواد_المدورة_من_العام_الماضي_${formatCurrentDateForFileName()}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        showMessage(`تم تصدير المواد المدورة إلى CSV بنجاح: ${fileName}`, 'success');
    } catch (error) {
        console.error('Error exporting carried over data to CSV:', error);
        showMessage('خطأ في تصدير المواد المدورة', 'error');
    }
}

function printCarriedOverReport() {
    const printContent = document.getElementById('carried-over-details').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>تقرير المواد المدورة من العام الماضي - ${getCurrentDateTime()}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                .amount { text-align: left; }
            </style>
        </head>
        <body>
            <h1>تقرير المواد المدورة من العام الماضي</h1>
            <p><strong>تاريخ التقرير:</strong> ${getCurrentDateTime()}</p>
            ${printContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Calendar switching functions
function toggleCalendar() {
    useHijriCalendar = !useHijriCalendar;
    updateDateTimeDisplay();
    
    // Save preference to localStorage
    localStorage.setItem('useHijriCalendar', useHijriCalendar);
    
    // Show message about current calendar
    const calendarType = useHijriCalendar ? 'الهجري' : 'الميلادي';
    showMessage(`تم التبديل إلى التقويم ${calendarType}`, 'success');
}

function setCalendarType(isHijri) {
    useHijriCalendar = isHijri;
    updateDateTimeDisplay();
    
    // Save preference to localStorage
    localStorage.setItem('useHijriCalendar', useHijriCalendar);
    
    const calendarType = useHijriCalendar ? 'الهجري' : 'الميلادي';
    showMessage(`تم تعيين التقويم إلى ${calendarType}`, 'success');
}

function loadCalendarPreference() {
    const savedPreference = localStorage.getItem('useHijriCalendar');
    if (savedPreference !== null) {
        useHijriCalendar = savedPreference === 'true';
    }
}

function getCurrentDateTime() {
    return useHijriCalendar ? getBeautifulDateTime() : getBeautifulGregorianDateTime();
}

function formatCurrentDate(dateString) {
    return useHijriCalendar ? formatArabicDate(dateString) : formatGregorianDate(dateString);
}

function formatCurrentDateForFileName() {
    return useHijriCalendar ? formatDateForFileName() : formatGregorianDateForFileName();
}
