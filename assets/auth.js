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
    const local = EMPLOYEES_DATA.find(e => e.c === code);
    if (!local) return { success: false, message: '✗ كود وظيفي غير صحيح' };
    empData = {
      emp_code: local.c,
      password_hash: local.p,
      full_name: local.n,
      job_title: local.j,
      department: local.d,
      hire_date: local.h,
      leave_balance: local.b,
      monthly_balance: local.m,
      is_manager: MANAGER_DEPT_CODES[local.c] ? true : false,
      managed_dept: MANAGER_DEPT_CODES[local.c] || null,
      is_hr: HR_EMP_CODES.includes(local.c),
      is_active: true
    };
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
  sessionStorage.setItem('leave_session', JSON.stringify(session));

  return { success: true, session };
}

function getSession() {
  try {
    const s = sessionStorage.getItem('leave_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function logout() {
  sessionStorage.removeItem('leave_session');
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
