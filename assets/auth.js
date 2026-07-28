// Authentication Module

function hashPassword(pw) {
  let hash = 0;
  const s = String(pw);
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h' + Math.abs(hash).toString(16).padStart(8, '0');
}

async function login(empCode, password) {
  const code = parseInt(empCode);
  let empData = null;

  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('emp_code', code)
      .single();
    if (!error && data) empData = data;
  } catch (_) {}

  // Fall back to local data
  if (!empData) {
    let local = EMPLOYEES_DATA.find(e => e.c === code);
    if (!local) {
      try {
        const added = await dbGet('db_employees_ext');
        const a = added.find(e => e.emp_code === code && !e._deleted);
        if (a) {
          empData = {
            emp_code: a.emp_code, password_hash: a.password_hash,
            full_name: a.full_name, job_title: a.job_title,
            department: a.department, hire_date: a.hire_date || '',
            leave_balance: a.leave_balance || 0, monthly_balance: a.monthly_balance || 7.33,
            is_manager: a.is_manager || false, managed_dept: a.managed_dept || null,
            is_hr: a.is_hr || false, is_active: a.is_active !== false
          };
        }
      } catch (_) {}
      if (!empData) return { success: false, message: '✗ كود وظيفي غير صحيح' };
    } else {
      // Check for base overrides in IndexedDB
      try {
        const added = await dbGet('db_employees_ext');
        const a = added.find(e => e.emp_code === code && e._source === 'base_override' && !e._deleted);
        if (a) {
          const o2 = typeof PERM_OVERRIDES !== 'undefined' ? PERM_OVERRIDES : {};
          try { Object.assign(o2, await dbGet('db_perm_overrides')); } catch (_) {}
          const po = o2[a.emp_code];
          empData = {
            emp_code: a.emp_code, password_hash: a.password_hash || a.p,
            full_name: a.full_name || a.n, job_title: a.job_title || a.j,
            department: a.department || a.d, hire_date: a.hire_date || a.h,
            leave_balance: a.leave_balance ?? a.b, monthly_balance: a.monthly_balance ?? a.m,
            is_manager: po ? po.is_manager : (a.is_manager !== undefined ? a.is_manager : !!MANAGER_DEPT_CODES[a.emp_code]),
            managed_dept: po ? (po.managed_dept || null) : (a.managed_dept || MANAGER_DEPT_CODES[a.emp_code] || null),
            is_hr: po ? po.is_hr : (a.is_hr !== undefined ? a.is_hr : HR_EMP_CODES.includes(a.emp_code)),
            is_active: a.is_active !== false
          };
        }
      } catch (_) {}
      if (!empData) {
        const overrides = typeof PERM_OVERRIDES !== 'undefined' ? PERM_OVERRIDES : {};
        try {
          const stored = await dbGet('db_perm_overrides');
          Object.assign(overrides, stored);
        } catch (_) {}
        const o = overrides[local.c];
        empData = {
          emp_code: local.c, password_hash: local.p, full_name: local.n,
          job_title: local.j, department: local.d, hire_date: local.h,
          leave_balance: local.b, monthly_balance: local.m,
          is_manager: o ? o.is_manager : !!MANAGER_DEPT_CODES[local.c],
          managed_dept: o ? (o.managed_dept || null) : (MANAGER_DEPT_CODES[local.c] || null),
          is_hr: o ? o.is_hr : HR_EMP_CODES.includes(local.c), is_active: true
        };
      }
    }
  }

  const pwHash = hashPassword(password);
  if (empData.password_hash !== pwHash) {
    return { success: false, message: '✗ رقم سري غير صحيح' };
  }

  if (empData.is_active === false) {
    return { success: false, message: '✗ هذا الموظف غير نشط' };
  }

  const session = {
    emp_code: empData.emp_code,
    name: empData.full_name,
    department: empData.department,
    job_title: empData.job_title,
    is_manager: empData.is_manager,
    managed_dept: empData.managed_dept,
    is_hr: empData.is_hr,
    leave_balance: empData.leave_balance
  };
  try { sessionStorage.setItem('leave_session', JSON.stringify(session)); } catch (_) {}

  return { success: true, session };
}

function getSession() {
  try {
    const s = sessionStorage.getItem('leave_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function logout() {
  try { sessionStorage.removeItem('leave_session'); } catch (_) {}
  window.location.href = 'index.html';
}

function requireAuth(roles) {
  const session = getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  if (roles && !roles.includes('any')) {
    let ok = false;
    if (roles.includes('employee') && !session.is_manager && !session.is_hr) ok = true;
    if (roles.includes('manager') && session.is_manager) ok = true;
    if (roles.includes('hr') && session.is_hr) ok = true;
    if (!ok) {
      window.location.href = 'index.html';
      return null;
    }
  }
  return session;
}
