import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Auth
  { name: 'AUTH_LOGIN', description: 'Log into the system', module: 'AUTH' },

  // User & Workforce Management
  { name: 'USER_READ', description: 'View user and employee accounts', module: 'USER' },
  { name: 'USER_READ_SALARY', description: 'View user salary field', module: 'USER' },
  { name: 'USER_CREATE', description: 'Create user/employee accounts', module: 'USER' },
  { name: 'USER_UPDATE', description: 'Update user/employee accounts', module: 'USER' },
  { name: 'USER_DEACTIVATE', description: 'Deactivate user accounts', module: 'USER' },
  { name: 'USER_DELETE', description: 'Delete user accounts', module: 'USER' },

  // Department Management
  { name: 'DEPARTMENT_READ', description: 'View departments', module: 'DEPARTMENT' },
  { name: 'DEPARTMENT_CREATE', description: 'Create departments', module: 'DEPARTMENT' },
  { name: 'DEPARTMENT_UPDATE', description: 'Update departments', module: 'DEPARTMENT' },
  { name: 'DEPARTMENT_DEACTIVATE', description: 'Deactivate departments', module: 'DEPARTMENT' },

  // Leave Management
  { name: 'LEAVE_READ', description: 'View personal leave requests', module: 'LEAVE' },
  { name: 'LEAVE_APPLY', description: 'Apply for leaves', module: 'LEAVE' },
  { name: 'LEAVE_MANAGE', description: 'View and approve/reject all employee leaves', module: 'LEAVE' },

  // Announcements
  { name: 'ANNOUNCEMENT_READ', description: 'View company announcements', module: 'ANNOUNCEMENT' },
  { name: 'ANNOUNCEMENT_CREATE', description: 'Create company announcements', module: 'ANNOUNCEMENT' },
  { name: 'ANNOUNCEMENT_DELETE', description: 'Delete company announcements', module: 'ANNOUNCEMENT' },

  // Dashboard & Audit
  { name: 'DASHBOARD_READ', description: 'View dashboard analytics and statistics', module: 'DASHBOARD' },
  { name: 'AUDIT_READ', description: 'View audit logs', module: 'AUDIT' }
];

const HR_PERMISSIONS = [
  'AUTH_LOGIN',
  'USER_READ',
  'USER_READ_SALARY',
  'USER_CREATE',
  'USER_UPDATE',
  'DEPARTMENT_READ',
  'LEAVE_READ',
  'LEAVE_APPLY',
  'LEAVE_MANAGE',
  'ANNOUNCEMENT_READ',
  'ANNOUNCEMENT_CREATE',
  'DASHBOARD_READ'
];

const EMPLOYEE_PERMISSIONS = [
  'AUTH_LOGIN',
  'USER_READ',
  'DEPARTMENT_READ',
  'LEAVE_READ',
  'LEAVE_APPLY',
  'ANNOUNCEMENT_READ',
  'DASHBOARD_READ'
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Permissions
  console.log('📦 Seeding permissions...');
  const permissionMap = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description, module: perm.module },
      create: perm
    });
    permissionMap.set(record.name, record.id);
  }

  // 2. Seed Roles
  console.log('👑 Seeding roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { description: 'System Administrator with full permissions', isSystem: true },
    create: {
      name: 'ADMIN',
      description: 'System Administrator with full permissions',
      isSystem: true
    }
  });

  const hrRole = await prisma.role.upsert({
    where: { name: 'HR' },
    update: { description: 'HR Manager with employee, leave, and department access', isSystem: true },
    create: {
      name: 'HR',
      description: 'HR Manager with employee, leave, and department access',
      isSystem: true
    }
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: { description: 'Standard employee with self-service leave and directory access', isSystem: true },
    create: {
      name: 'EMPLOYEE',
      description: 'Standard employee with self-service leave and directory access',
      isSystem: true
    }
  });

  // 3. Assign Permissions to Roles
  console.log('🔗 Mapping permissions to roles...');
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: [adminRole.id, hrRole.id, employeeRole.id] } }
  });

  // Admin gets ALL permissions
  const adminMappings = Array.from(permissionMap.values()).map((permissionId) => ({
    roleId: adminRole.id,
    permissionId
  }));
  await prisma.rolePermission.createMany({ data: adminMappings });

  // HR gets HR subset
  const hrMappings = HR_PERMISSIONS.map((permName) => ({
    roleId: hrRole.id,
    permissionId: permissionMap.get(permName)!
  })).filter((m) => Boolean(m.permissionId));
  await prisma.rolePermission.createMany({ data: hrMappings });

  // Employee gets Employee subset
  const employeeMappings = EMPLOYEE_PERMISSIONS.map((permName) => ({
    roleId: employeeRole.id,
    permissionId: permissionMap.get(permName)!
  })).filter((m) => Boolean(m.permissionId));
  await prisma.rolePermission.createMany({ data: employeeMappings });

  // 4. Seed Departments
  console.log('🏢 Seeding departments...');
  const engineeringDept = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: { isActive: true },
    create: {
      name: 'Engineering',
      description: 'Software development, infrastructure, and technical operations',
      isActive: true
    }
  });

  const hrDept = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: { isActive: true },
    create: {
      name: 'Human Resources',
      description: 'People operations, recruiting, and employee relations',
      isActive: true
    }
  });

  const designDept = await prisma.department.upsert({
    where: { name: 'Product & Design' },
    update: { isActive: true },
    create: {
      name: 'Product & Design',
      description: 'UI/UX design, user research, and product strategy',
      isActive: true
    }
  });

  // 5. Seed Leave Types
  console.log('🏖️ Seeding leave types...');
  const casualLeave = await prisma.leaveType.upsert({
    where: { name: 'Casual Leave' },
    update: { daysAllowed: 12 },
    create: { name: 'Casual Leave', daysAllowed: 12 }
  });

  const sickLeave = await prisma.leaveType.upsert({
    where: { name: 'Sick Leave' },
    update: { daysAllowed: 10 },
    create: { name: 'Sick Leave', daysAllowed: 10 }
  });

  await prisma.leaveType.upsert({
    where: { name: 'Paid Time Off (PTO)' },
    update: { daysAllowed: 15 },
    create: { name: 'Paid Time Off (PTO)', daysAllowed: 15 }
  });

  // 6. Seed Demo Users
  console.log('👤 Seeding default users...');
  const adminPasswordHash = await argon2.hash('Admin@123456');
  const hrPasswordHash = await argon2.hash('Hr@123456');
  const employeePasswordHash = await argon2.hash('Emp@123456');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pratha.com' },
    update: {
      roleId: adminRole.id,
      departmentId: engineeringDept.id,
      position: 'Chief Technology Officer',
      employeeCode: 'EMP-001',
      isActive: true,
      isEmailVerified: true
    },
    create: {
      employeeCode: 'EMP-001',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@pratha.com',
      passwordHash: adminPasswordHash,
      phone: '+1-555-0100',
      position: 'Chief Technology Officer',
      departmentId: engineeringDept.id,
      joiningDate: new Date('2024-01-01'),
      salary: 150000,
      roleId: adminRole.id,
      isActive: true,
      isEmailVerified: true
    }
  });

  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@pratha.com' },
    update: {
      roleId: hrRole.id,
      departmentId: hrDept.id,
      position: 'HR Director',
      employeeCode: 'EMP-002',
      isActive: true,
      isEmailVerified: true
    },
    create: {
      employeeCode: 'EMP-002',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'hr@pratha.com',
      passwordHash: hrPasswordHash,
      phone: '+1-555-0101',
      position: 'HR Director',
      departmentId: hrDept.id,
      joiningDate: new Date('2024-02-01'),
      salary: 95000,
      roleId: hrRole.id,
      isActive: true,
      isEmailVerified: true
    }
  });

  const empUser = await prisma.user.upsert({
    where: { email: 'alex.morgan@pratha.com' },
    update: {
      roleId: employeeRole.id,
      departmentId: engineeringDept.id,
      position: 'Senior Fullstack Engineer',
      employeeCode: 'EMP-003',
      isActive: true,
      isEmailVerified: true
    },
    create: {
      employeeCode: 'EMP-003',
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex.morgan@pratha.com',
      passwordHash: employeePasswordHash,
      phone: '+1-555-0102',
      position: 'Senior Fullstack Engineer',
      departmentId: engineeringDept.id,
      joiningDate: new Date('2024-03-15'),
      salary: 110000,
      roleId: employeeRole.id,
      isActive: true,
      isEmailVerified: true
    }
  });

  // 7. Seed Starter Announcement
  console.log('📢 Seeding starter announcements...');
  await prisma.announcement.deleteMany();
  await prisma.announcement.create({
    data: {
      title: 'Welcome to the New Pratha HRMS Portal',
      content: 'We have updated our internal workforce platform with unified employee profiles, direct leave tracking, and faster self-service workflows.',
      authorId: hrUser.id
    }
  });

  // 8. Seed Demo Leave Request
  console.log('📝 Seeding sample leave request...');
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveRequest.create({
    data: {
      userId: empUser.id,
      leaveTypeId: casualLeave.id,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-03'),
      reason: 'Personal family trip',
      status: 'PENDING'
    }
  });

  console.log('\n✅ Database seeding completed successfully!\n');
  console.log('===============================================================');
  console.log('🔑 DEFAULT CREDENTIALS FOR DEVELOPMENT');
  console.log('===============================================================');
  console.log(`ADMIN User:`);
  console.log(`  Email:    admin@pratha.com`);
  console.log(`  Password: Admin@123456`);
  console.log(`  Role:     ADMIN`);
  console.log('---------------------------------------------------------------');
  console.log(`HR User:`);
  console.log(`  Email:    hr@pratha.com`);
  console.log(`  Password: Hr@123456`);
  console.log(`  Role:     HR`);
  console.log('---------------------------------------------------------------');
  console.log(`EMPLOYEE User:`);
  console.log(`  Email:    alex.morgan@pratha.com`);
  console.log(`  Password: Emp@123456`);
  console.log(`  Role:     EMPLOYEE`);
  console.log('===============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
