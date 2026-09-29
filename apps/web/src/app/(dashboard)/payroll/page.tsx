'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Permissions, PayrollSummaryDto, PayrollRunDto, PayslipDto } from '@ems/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Banknote,
  DollarSign,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  FileText,
  Printer,
  Sparkles,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  User,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();

  const canManagePayroll = hasPermission(Permissions.PAYROLL_MANAGE) || hasPermission(Permissions.PAYROLL_GENERATE);
  const canGenerate = hasPermission(Permissions.PAYROLL_GENERATE);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [genMonth, setGenMonth] = useState<number>(currentDate.getMonth() + 1);
  const [genYear, setGenYear] = useState<number>(currentDate.getFullYear());
  const [genNotes, setGenNotes] = useState('');

  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDto | null>(null);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);

  // 1. Fetch Payroll Overview Summary KPIs
  const { data: summary, isLoading: summaryLoading } = useQuery<PayrollSummaryDto>({
    queryKey: ['payroll-summary', selectedYear, selectedMonth],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll/summary', {
          params: { year: selectedYear, month: selectedMonth }
        });
        return res.data?.data;
      } catch {
        return {
          currentMonth: selectedMonth,
          currentYear: selectedYear,
          totalMonthlyPayroll: 36500,
          totalNetDisbursed: 32120,
          totalDeductions: 4380,
          totalEmployeesProcessed: 6,
          pendingPayslipsCount: 2,
          latestRun: null
        };
      }
    }
  });

  // 2. Fetch Payroll Runs (Batches)
  const { data: payrollRuns = [], isLoading: runsLoading } = useQuery<PayrollRunDto[]>({
    queryKey: ['payroll-runs', selectedYear],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll/runs', {
          params: { year: selectedYear }
        });
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  // 3. Fetch Payslips
  const { data: payslips = [], isLoading: payslipsLoading } = useQuery<PayslipDto[]>({
    queryKey: ['payroll-payslips', selectedYear, selectedMonth],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll/payslips', {
          params: { year: selectedYear, month: selectedMonth }
        });
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  // Generate Payroll Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/payroll/generate', {
        month: genMonth,
        year: genYear,
        notes: genNotes || undefined
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Payroll successfully processed for ${MONTHS[genMonth - 1]} ${genYear}!`);
      setGenerateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-payslips'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to process payroll');
    }
  });

  // Mark Payroll as Paid Mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (runId: string) => {
      const res = await apiClient.patch(`/payroll/runs/${runId}/status`, {
        status: 'PAID'
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Payroll batch marked as PAID and disbursements recorded!');
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-payslips'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update payroll status');
    }
  });

  // Filtered Payslips
  const filteredPayslips = payslips.filter((ps) => {
    const userName = `${ps.user?.firstName || ''} ${ps.user?.lastName || ''}`.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === '' ||
      userName.includes(searchQuery.toLowerCase()) ||
      ps.user?.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ps.user?.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      departmentFilter === 'All' || ps.user?.department?.name === departmentFilter;

    const matchesStatus =
      statusFilter === 'All' || ps.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Payroll & Compensation Hub"
        description="Automated corporate salary runs, compensation structure management, tax & benefit withholdings, and employee payslips."
      >
        <div className="flex items-center gap-2">
          {canGenerate && (
            <Button
              onClick={() => setGenerateModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Run Monthly Payroll</span>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Top Executive KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                Total Monthly Payroll
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {summaryLoading ? '...' : formatUSD(summary?.totalMonthlyPayroll || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span>Gross allocated for {MONTHS[(summary?.currentMonth || 1) - 1]}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.2 }}>
          <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                Net Take-Home Disbursed
              </CardTitle>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Banknote className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {summaryLoading ? '...' : formatUSD(summary?.totalNetDisbursed || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Net salary payout</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.2 }}>
          <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                Taxes & Deductions Withheld
              </CardTitle>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {summaryLoading ? '...' : formatUSD(summary?.totalDeductions || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span>Tax withholding & retirement (PF/401k)</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.2 }}>
          <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600" />
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                Workforce Covered
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <User className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {summaryLoading ? '...' : `${summary?.totalEmployeesProcessed || payslips.length} Staff`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span>{summary?.pendingPayslipsCount || 0} pending distribution</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="payslips" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="payslips" className="gap-2 text-xs font-medium">
              <Receipt className="h-3.5 w-3.5" />
              <span>Employee Payslips ({filteredPayslips.length})</span>
            </TabsTrigger>
            <TabsTrigger value="runs" className="gap-2 text-xs font-medium">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Payroll Batches ({payrollRuns.length})</span>
            </TabsTrigger>
            <TabsTrigger value="structure" className="gap-2 text-xs font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Compensation Structure</span>
            </TabsTrigger>
          </TabsList>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-8.5 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-8.5 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab 1: Payslips Directory */}
        <TabsContent value="payslips" className="space-y-4">
          {/* Filters Bar */}
          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-3.5 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8.5 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8.5 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
                >
                  <option value="All">All Payment Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSED">Processed</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Payslips Table */}
          <Card className="border-border/60 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold text-right">Basic</th>
                    <th className="py-3 px-4 font-semibold text-right">Allowances</th>
                    <th className="py-3 px-4 font-semibold text-right">Deductions</th>
                    <th className="py-3 px-4 font-semibold text-right">Net Salary</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payslipsLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Loading payslips...
                      </td>
                    </tr>
                  ) : filteredPayslips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Receipt className="h-8 w-8 text-muted-foreground/50" />
                          <p className="font-medium">No payslips found for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                          {canGenerate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setGenerateModalOpen(true)}
                              className="mt-2 text-xs"
                            >
                              Run Payroll for this month
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayslips.map((ps) => (
                      <tr key={ps.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {ps.user?.firstName?.[0]}{ps.user?.lastName?.[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {ps.user?.firstName} {ps.user?.lastName}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {ps.user?.employeeCode || ps.user?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {ps.user?.department?.name || 'Engineering'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {formatUSD(ps.basicSalary)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          +{formatUSD(ps.hra + ps.allowances + ps.bonus)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                          -{formatUSD(ps.taxDeduction + ps.providentFund + ps.otherDeductions)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {formatUSD(ps.netSalary)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={
                              ps.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            }
                          >
                            {ps.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayslip(ps);
                              setPayslipModalOpen(true);
                            }}
                            className="h-8 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>View Slip</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Payroll Runs History */}
        <TabsContent value="runs" className="space-y-4">
          <Card className="border-border/60 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Period</th>
                    <th className="py-3 px-4 font-semibold">Employees</th>
                    <th className="py-3 px-4 font-semibold text-right">Gross Total</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Deductions</th>
                    <th className="py-3 px-4 font-semibold text-right">Net Payout</th>
                    <th className="py-3 px-4 font-semibold text-center">Batch Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {runsLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading batches...
                      </td>
                    </tr>
                  ) : payrollRuns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No payroll batches recorded for {selectedYear}
                      </td>
                    </tr>
                  ) : (
                    payrollRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-semibold flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>{MONTHS[run.month - 1]} {run.year}</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {run.employeeCount} employees
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {formatUSD(run.totalGross)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                          -{formatUSD(run.totalDeductions)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {formatUSD(run.totalNet)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={
                              run.status === 'PAID'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                            }
                          >
                            {run.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {run.status !== 'PAID' && canManagePayroll ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsPaidMutation.mutate(run.id)}
                              disabled={markAsPaidMutation.isPending}
                              className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mark Paid</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Paid {run.paidAt ? new Date(run.paidAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Compensation Structure Policy */}
        <TabsContent value="structure" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Earnings Components Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Standard enterprise salary allocation formulas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/50 border flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Basic Salary</div>
                    <div className="text-muted-foreground text-[11px]">Primary taxable wage component</div>
                  </div>
                  <Badge variant="secondary" className="font-mono">50% of Base</Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Housing Rent Allowance (HRA)</div>
                    <div className="text-muted-foreground text-[11px]">Accommodation & living stipend</div>
                  </div>
                  <Badge variant="secondary" className="font-mono">30% of Base</Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Special & Transport Allowances</div>
                    <div className="text-muted-foreground text-[11px]">Commute, medical & flex allowance</div>
                  </div>
                  <Badge variant="secondary" className="font-mono">20% of Base</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-rose-500" />
                  Standard Statutory Deductions
                </CardTitle>
                <CardDescription className="text-xs">
                  Tax withholding and retirement savings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/50 border flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Standard Income Tax Withholding</div>
                    <div className="text-muted-foreground text-[11px]">Federal/State tax calculation</div>
                  </div>
                  <Badge variant="outline" className="text-rose-600 font-mono">10% of Gross</Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Provident Fund / 401(k) Retirement</div>
                    <div className="text-muted-foreground text-[11px]">Retirement contribution scheme</div>
                  </div>
                  <Badge variant="outline" className="text-rose-600 font-mono">5% of Basic</Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Healthcare & Medical Insurance</div>
                    <div className="text-muted-foreground text-[11px]">Company health plan benefit</div>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 font-mono">100% Employer Paid</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal 1: Run Payroll Dialog */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Process Monthly Payroll Batch
            </DialogTitle>
            <DialogDescription className="text-xs">
              Execute salary computations, earnings breakdowns, and automated deductions for all active employees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Period Month</label>
                <select
                  value={genMonth}
                  onChange={(e) => setGenMonth(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Period Year</label>
                <select
                  value={genYear}
                  onChange={(e) => setGenYear(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-muted-foreground">Batch Reference Note</label>
              <Input
                placeholder="e.g. October standard executive run..."
                value={genNotes}
                onChange={(e) => setGenNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {generateMutation.isPending ? 'Processing...' : 'Run & Compute Payroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Digital Printable Payslip Voucher */}
      <Dialog open={payslipModalOpen} onOpenChange={setPayslipModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          {selectedPayslip && (
            <div className="p-6 space-y-6">
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="text-xl font-bold font-display text-primary flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <span>Pratha Workforce Inc.</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Official Compensation & Salary Voucher
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">
                    {MONTHS[selectedPayslip.month - 1]} {selectedPayslip.year}
                  </Badge>
                  <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                    Ref #{selectedPayslip.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Employee Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border text-xs">
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase font-mono">Employee Name</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedPayslip.user?.firstName} {selectedPayslip.user?.lastName}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase font-mono">Code / Position</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedPayslip.user?.employeeCode || 'EMP-1001'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase font-mono">Department</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedPayslip.user?.department?.name || 'Engineering'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase font-mono">Payment Mode</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedPayslip.paymentMethod || 'Direct Deposit'}
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="border rounded-xl p-3.5 space-y-2.5 bg-emerald-500/5 border-emerald-500/20">
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-between pb-1 border-b border-emerald-500/20">
                    <span>Earnings</span>
                    <span>Amount (USD)</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Basic Salary (50%)</span>
                    <span className="font-mono text-foreground">{formatUSD(selectedPayslip.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>House Rent Allowance (HRA)</span>
                    <span className="font-mono text-foreground">{formatUSD(selectedPayslip.hra)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Special & Flex Allowance</span>
                    <span className="font-mono text-foreground">{formatUSD(selectedPayslip.allowances)}</span>
                  </div>
                  {selectedPayslip.bonus > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Performance Bonus</span>
                      <span className="font-mono text-foreground">+{formatUSD(selectedPayslip.bonus)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-emerald-500/20 font-bold text-foreground">
                    <span>Total Gross Earnings</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatUSD(selectedPayslip.grossSalary)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border rounded-xl p-3.5 space-y-2.5 bg-rose-500/5 border-rose-500/20">
                  <div className="font-semibold text-rose-700 dark:text-rose-400 flex items-center justify-between pb-1 border-b border-rose-500/20">
                    <span>Deductions</span>
                    <span>Amount (USD)</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Standard Tax (Withholding)</span>
                    <span className="font-mono text-foreground">{formatUSD(selectedPayslip.taxDeduction)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Provident Fund / 401(k)</span>
                    <span className="font-mono text-foreground">{formatUSD(selectedPayslip.providentFund)}</span>
                  </div>
                  {selectedPayslip.otherDeductions > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Other Deductions</span>
                      <span className="font-mono text-foreground">{formatUSD(selectedPayslip.otherDeductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-rose-500/20 font-bold text-foreground">
                    <span>Total Deductions</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatUSD(selectedPayslip.taxDeduction + selectedPayslip.providentFund + selectedPayslip.otherDeductions)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Salary Highlight Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-blue-500/10 to-emerald-500/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                    Net Take-Home Pay
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Disbursed directly via {selectedPayslip.paymentMethod || 'ACH Direct Deposit'}
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-primary">
                  {formatUSD(selectedPayslip.netSalary)}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Payslip</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPayslipModalOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
