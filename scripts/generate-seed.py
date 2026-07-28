#!/usr/bin/env python3
"""
Generate seed SQL directly from Excel file
"""
import openpyxl, os

EXCEL_PATH = r'C:\Users\Salem Magdy\Desktop\طلبات اجازة.xlsx'
OUTPUT_DIR = r'C:\Users\Salem Magdy\Desktop\LEAVE-SYSTEM'

wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
ws = wb.active

employees = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0] is None:
        continue
    employees.append({
        'password': int(row[0]),
        'code': int(row[1]),
        'name': str(row[2]).strip(),
        'job': str(row[3]).strip() if row[3] else '',
        'dept': str(row[4]).strip() if row[4] else '',
        'balance': round(row[5], 3) if row[5] else 0,
        'hire_date': str(row[6]) if row[6] else None,
        'monthly': round(row[7], 3) if row[7] else 0
    })

# Generate SQL
lines = ["-- Seed employees data - generated from Excel"]
lines.append("INSERT INTO employees (emp_code, password_hash, full_name, job_title, department, hire_date, leave_balance, monthly_balance)")
lines.append("VALUES")

def hash_password(pw):
    """Match JavaScript hashPassword function (Java String hashCode)"""
    h = 0
    s = str(pw)
    for ch in s:
        h = ((h << 5) - h) + ord(ch)
        h = h & 0xFFFFFFFF  # 32-bit int
    # Convert signed 32-bit to hex
    if h >= 0x80000000:
        h -= 0x100000000
    return 'h' + format(abs(h), '08x')

vals = []
for e in employees:
    name = e['name'].replace("'", "''")
    job = e['job'].replace("'", "''")
    dept = e['dept'].replace("'", "''")
    pwd_hash = hash_password(e['password'])
    hire = f"'{e['hire_date']}'" if e['hire_date'] else 'NULL'
    bal = e['balance']
    mon = e['monthly']
    vals.append(f"({e['code']}, '{pwd_hash}', '{name}', '{job}', '{dept}', {hire}, {bal}, {mon})")

lines.append(",\n".join(vals) + ";")
lines.append("")

# Generate hashed passwords reference for HR
lines.append("-- Password reference for HR (use this to help employees)")
lines.append("-- emp_code | password (original) | password_hash")
lines.append("-- " + "-"*60)
for e in employees[:10]:
    pwd_hash = hash_password(e['password'])
    lines.append(f"-- {e['code']} | {e['password']} | {pwd_hash}")

lines.append("-- ... (all passwords follow same pattern using hashPassword function)")
lines.append("")

lines.append("-- Set first employee in each department as manager")
lines.append("UPDATE employees SET is_manager = TRUE, managed_dept = department")
lines.append("WHERE emp_code IN (")
lines.append("  SELECT MIN(emp_code) FROM employees GROUP BY department")
lines.append(");")
lines.append("")

lines.append("-- Set HR department")
lines.append("UPDATE employees SET is_hr = TRUE WHERE department = 'الموارد البشريه';")
lines.append("")

lines.append(f"-- Total employees: {len(employees)}")

sql_content = "\n".join(lines)

# Save SQL
sql_path = os.path.join(OUTPUT_DIR, 'seed-data.sql')
with open(sql_path, 'w', encoding='utf-8') as f:
    f.write(sql_content)
print(f"SQL seed saved: {sql_path} ({len(employees)} employees)")

# Also save JSON
json_path = os.path.join(OUTPUT_DIR, 'employees.json')
import json
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(employees, f, ensure_ascii=False, indent=2)
print(f"JSON saved: {json_path}")
