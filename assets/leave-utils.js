// Leave Utilities Module

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
  const { error } = await supabase.from('leave_requests').insert([data]);
  if (error) return { success: false, message: 'خطأ في الحفظ: ' + error.message };

  // Log audit
  await supabase.from('leave_audit').insert([{
    leave_id: null,
    emp_code: data.emp_code,
    action: 'submitted',
    comment: 'تقديم إجازة ' + data.leave_type
  }]);
  return { success: true };
}

async function fetchMyLeaves(empCode) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('emp_code', empCode)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

async function fetchDeptLeaves(department, statusFilter) {
  let q = supabase.from('leave_requests').select('*').eq('department', department);
  if (statusFilter && statusFilter !== 'all') {
    q = q.eq('status', statusFilter);
  }
  const { data } = q.order('created_at', { ascending: false });
  return data || [];
}

async function fetchAllLeaves(filters) {
  let q = supabase.from('leave_requests').select('*');
  if (filters) {
    if (filters.department && filters.department !== 'all') q = q.eq('department', filters.department);
    if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
    if (filters.emp_code) q = q.eq('emp_code', filters.emp_code);
    if (filters.from_date) q = q.gte('start_date', filters.from_date);
    if (filters.to_date) q = q.lte('end_date', filters.to_date);
  }
  const { data } = q.order('created_at', { ascending: false });
  return data || [];
}

async function updateLeaveStatus(leaveId, status, comment, reviewer) {
  const { error } = await supabase
    .from('leave_requests')
    .update({ status, [`${status.includes('approved') ? 'manager' : 'hr'}_comment`]: comment, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', leaveId);

  if (error) return { success: false, message: error.message };

  await supabase.from('leave_audit').insert([{
    leave_id: leaveId,
    emp_code: parseInt(reviewer),
    action: status,
    comment
  }]);
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
