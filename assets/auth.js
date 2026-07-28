// Authentication Module
// Uses simple hash (matching existing system pattern)

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
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('emp_code', parseInt(empCode))
    .single();

  if (error || !data) {
    return { success: false, message: '✗ كود وظيفي غير صحيح' };
  }

  const pwHash = hashPassword(password);
  if (data.password_hash !== pwHash) {
    return { success: false, message: '✗ رقم سري غير صحيح' };
  }

  if (!data.is_active) {
    return { success: false, message: '✗ هذا الموظف غير نشط' };
  }

  // Store session
  const session = {
    emp_code: data.emp_code,
    name: data.full_name,
    department: data.department,
    job_title: data.job_title,
    is_manager: data.is_manager,
    managed_dept: data.managed_dept,
    is_hr: data.is_hr,
    leave_balance: data.leave_balance
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
