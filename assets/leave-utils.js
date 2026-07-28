const DB_LEAVES = 'db_leave_requests';
const DB_AUDIT = 'db_leave_audit';
const DB_EMPLOYEES = 'db_employees_ext';

// IndexedDB wrapper
let _idb = null;
function dbOpen() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('LeaveSystemDB', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
    req.onerror = e => reject(e.target.error);
  });
}
async function dbGet(key) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function dbSet(key, val) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const req = tx.objectStore('kv').put(val, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function formatDate(d) {
  if (!d) return '';
  return d.split('-').reverse().join('/');
}

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function calcDays(start, end) {
  const s = new Date(start), e = new Date(end);
  return Math.max(0, Math.ceil((e - s) / (1000*60*60*24)) + 1);
}

async function submitLeave(data) {
  data.id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  data.created_at = new Date().toISOString();
  data.updated_at = data.created_at;
  data.status = 'pending';

  let err = null;
  try {
    const { error } = await supabase.from('leave_requests').insert([data]);
    if (error) err = error;
  } catch (e) { err = e; }

  if (err) {
    const leaves = await dbGet(DB_LEAVES);
    leaves.push(data);
    await dbSet(DB_LEAVES, leaves);
  }

  const audit = { leave_id: data.id, emp_code: data.emp_code, action: 'submitted', comment: 'تقديم إجازة ' + data.leave_type, created_at: new Date().toISOString() };
  try {
    await supabase.from('leave_audit').insert([audit]);
  } catch (_) {
    const audits = await dbGet(DB_AUDIT);
    audits.push(audit);
    await dbSet(DB_AUDIT, audits);
  }

  return { success: true };
}

async function fetchMyLeaves(empCode) {
  try {
    const { data, error } = await supabase
      .from('leave_requests').select('*')
      .eq('emp_code', empCode)
      .order('created_at', { ascending: false });
    if (!error && data) return data;
  } catch (_) {}
  const all = await dbGet(DB_LEAVES);
  return all.filter(l => l.emp_code == empCode).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function fetchDeptLeaves(department, statusFilter) {
  try {
    let q = supabase.from('leave_requests').select('*').eq('department', department);
    if (statusFilter && statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = q.order('created_at', { ascending: false });
    if (data) return data;
  } catch (_) {}
  const all = await dbGet(DB_LEAVES);
  let filtered = all.filter(l => l.department === department);
  if (statusFilter && statusFilter !== 'all') filtered = filtered.filter(l => l.status === statusFilter);
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function fetchAllLeaves(filters) {
  try {
    let q = supabase.from('leave_requests').select('*');
    if (filters) {
      if (filters.department && filters.department !== 'all') q = q.eq('department', filters.department);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.emp_code) q = q.eq('emp_code', filters.emp_code);
      if (filters.from_date) q = q.gte('start_date', filters.from_date);
      if (filters.to_date) q = q.lte('end_date', filters.to_date);
    }
    const { data } = q.order('created_at', { ascending: false });
    if (data) return data;
  } catch (_) {}
  let all = await dbGet(DB_LEAVES);
  if (filters) {
    if (filters.department && filters.department !== 'all') all = all.filter(l => l.department === filters.department);
    if (filters.status && filters.status !== 'all') all = all.filter(l => l.status === filters.status);
    if (filters.emp_code) all = all.filter(l => l.emp_code == filters.emp_code);
    if (filters.from_date) all = all.filter(l => l.start_date >= filters.from_date);
    if (filters.to_date) all = all.filter(l => l.end_date <= filters.to_date);
  }
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function updateLeaveStatus(leaveId, status, comment, reviewer) {
  const update = { status, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (status.includes('approved')) {
    update[`${status.includes('approved_by_manager') ? 'manager' : 'hr'}_comment`] = comment;
  }

  let err = null;
  try {
    const { error } = await supabase.from('leave_requests').update(update).eq('id', leaveId);
    if (error) err = error;
  } catch (e) { err = e; }

  if (err) {
    const leaves = await dbGet(DB_LEAVES);
    const idx = leaves.findIndex(l => l.id === leaveId);
    if (idx >= 0) {
      Object.assign(leaves[idx], update);
      await dbSet(DB_LEAVES, leaves);
    }
  }

  const audit = { leave_id: leaveId, emp_code: parseInt(reviewer), action: status, comment, created_at: new Date().toISOString() };
  try {
    await supabase.from('leave_audit').insert([audit]);
  } catch (_) {
    const audits = await dbGet(DB_AUDIT);
    audits.push(audit);
    await dbSet(DB_AUDIT, audits);
  }

  return { success: true };
}

function statusBadge(status) {
  const map = {
    'pending': '<span class="badge badge-pending">🟡 قيد الانتظار</span>',
    'approved_by_manager': '<span class="badge badge-mgr">🟢 موافقة مدير</span>',
    'rejected_by_manager': '<span class="badge badge-rej">🔴 مرفوض من المدير</span>',
    'approved_by_hr': '<span class="badge badge-hr">✅ معتمد من HR</span>',
    'rejected_by_hr': '<span class="badge badge-rej">🔴 مرفوض من HR</span>'
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

function leaveTypeAr(type) {
  const map = {
    'اعتيادية': 'إعتيادية',
    'امتداد': 'امتداد',
    'مأمورية': 'مأمورية',
    'مرضية': 'مرضية',
    'اضطرارية': 'اضطرارية',
    'عارضة': 'عارضة'
  };
  return map[type] || type;
}

// Employee Management (IndexedDB-backed)
async function getAllEmployees() {
  const base = EMPLOYEES_DATA.map(e => ({
    emp_code: e.c, password_hash: e.p, full_name: e.n,
    job_title: e.j, department: e.d, hire_date: e.h,
    leave_balance: e.b, monthly_balance: e.m,
    is_manager: !!MANAGER_DEPT_CODES[e.c],
    managed_dept: MANAGER_DEPT_CODES[e.c] || null,
    is_hr: HR_EMP_CODES.includes(e.c),
    is_active: true, _source: 'base'
  }));
  const added = await dbGet(DB_EMPLOYEES);
  return [...base, ...added.filter(e => !e._deleted)].sort((a, b) => a.emp_code - b.emp_code);
}

async function getLocalEmployee(code) {
  const added = await dbGet(DB_EMPLOYEES);
  return added.find(e => e.emp_code === code && !e._deleted) || null;
}

async function addLocalEmployee(data) {
  const added = await dbGet(DB_EMPLOYEES);
  if (added.find(e => e.emp_code === data.emp_code && !e._deleted)) {
    return { success: false, message: 'كود وظيفي موجود بالفعل' };
  }
  if (EMPLOYEES_DATA.find(e => e.c === data.emp_code)) {
    return { success: false, message: 'كود وظيفي موجود بالفعل في البيانات الأساسية' };
  }
  data._source = 'local';
  data.password_hash = hashPassword(data.password_hash || '123456');
  added.push(data);
  await dbSet(DB_EMPLOYEES, added);
  return { success: true };
}

async function updateLocalEmployee(code, updates) {
  const added = await dbGet(DB_EMPLOYEES);
  const idx = added.findIndex(e => e.emp_code === code && !e._deleted);
  if (idx < 0) return { success: false, message: 'الموظف غير موجود' };
  if (updates.password) {
    updates.password_hash = hashPassword(updates.password);
    delete updates.password;
  }
  Object.assign(added[idx], updates);
  await dbSet(DB_EMPLOYEES, added);
  return { success: true };
}

async function deleteLocalEmployee(code) {
  const added = await dbGet(DB_EMPLOYEES);
  const idx = added.findIndex(e => e.emp_code === code && !e._deleted);
  if (idx >= 0) {
    added[idx]._deleted = true;
    await dbSet(DB_EMPLOYEES, added);
    return { success: true };
  }
  if (EMPLOYEES_DATA.find(e => e.c === code)) {
    return { success: false, message: 'لا يمكن حذف موظف أساسي من هنا. استخدم Supabase Dashboard' };
  }
  return { success: false, message: 'الموظف غير موجود' };
}

async function syncEmployeesToSupabase() {
  try {
    const added = await dbGet(DB_EMPLOYEES);
    const locals = added.filter(e => !e._deleted && e._source === 'local');
    for (const emp of locals) {
      const { error } = await supabase.from('employees').upsert([{
        emp_code: emp.emp_code, password_hash: emp.password_hash,
        full_name: emp.full_name, job_title: emp.job_title,
        department: emp.department, hire_date: emp.hire_date,
        leave_balance: emp.leave_balance || 0, monthly_balance: emp.monthly_balance || 7.33,
        is_manager: emp.is_manager || false, managed_dept: emp.managed_dept || null,
        is_hr: emp.is_hr || false, is_active: true
      }], { onConflict: 'emp_code' });
      if (error) return { success: false, message: error.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Supabase غير متاح' };
  }
}
// Migrate from localStorage to IndexedDB on first load
(async function migrateFromLS() {
  try {
    for (const key of ['ls_leave_requests', 'ls_leave_audit', 'ls_employees_ext']) {
      const ls = localStorage.getItem(key);
      if (ls) {
        const data = JSON.parse(ls);
        const dbKey = key === 'ls_leave_requests' ? DB_LEAVES : key === 'ls_leave_audit' ? DB_AUDIT : DB_EMPLOYEES;
        const existing = await dbGet(dbKey);
        if (existing.length === 0 && data.length > 0) {
          await dbSet(dbKey, data);
        }
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}
})();