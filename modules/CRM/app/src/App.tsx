import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_CRM_API_URL || "http://localhost:3100";

type Lead = {
  id: string;
  companyName: string;
  companyNameEn?: string | null;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string | null;
  status: string;
  contractAmount?: number | null;
  ownerId?: string | null;
  score?: number | null;
  aiSummary?: string | null;
  aiNotes?: string | null;
  aiStatus?: string | null;
  aiRequestedAt?: string | null;
  aiEvaluatedAt?: string | null;
  lastActivityAt?: string | null;
  createdAt?: string;
};

type Expert = {
  id: string;
  name: string;
  country?: string | null;
  specialties?: string | null;
  pricing?: string | null;
  pricingCurrency?: string | null;
  pricingUnit?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  notes?: string | null;
};

type ConsultingCase = {
  id: string;
  leadId: string;
  expertId?: string | null;
  status: string;
  channel: string;
  price?: number | null;
  currency?: string | null;
  requirements?: string | null;
  notes?: string | null;
};

type Brand = { id: string; name: string };

type Team = { id: string; name: string; brandId: string; leaderId?: string | null };

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId?: string | null;
  title?: string | null;
  managerId?: string | null;
  positionId?: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  actorId?: string | null;
  createdAt: string;
};

type Notification = {
  id: string;
  userId: string;
  title: string;
  channel: string;
  status: string;
  createdAt: string;
};

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  brandId: string;
  teamId?: string | null;
  title?: string | null;
  managerId?: string | null;
  positionId?: string | null;
};

type LeadActivity = {
  id: string;
  leadId: string;
  actorId: string;
  type: string;
  title: string;
  notes?: string | null;
  occurredAt: string;
};

type Position = { id: string; name: string; level?: number | null };

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost<T>(path: string, body: any, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPatch<T>(path: string, body: any, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(path: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
}

const messages = {
  zh: {
    appLabel: "CRM",
    appTitle: "Just Right CRM",
    appSubtitle: "支持账号登录、权限隔离、公共线索池与分配。",
    brandLabel: "品牌",
    refresh: "刷新数据",
    tabs: {
      dashboard: "数据看板",
      leads: "线索",
      ai: "AI评估",
      experts: "专家库",
      consulting: "轻咨询",
      admin: "组织/用户",
      logs: "日志",
      notifications: "通知",
    },
    errors: {
      load: "加载失败",
    },
    leads: {
      create: "新增线索",
      list: "线索列表",
      count: "共",
      noContact: "未填写联系人",
      noEmail: "无邮箱",
      noPhone: "无电话",
      noNotes: "未填写线索详情",
      score: "评分",
      actions: "线索操作",
      assign: "指派线索",
      unassigned: "未分配线索",
      aiEval: "AI 评估回写",
      merge: "合并线索",
      mergeAction: "合并同名线索",
      progress: "当前进度",
      viewTimeline: "查看跟进",
      hideTimeline: "收起跟进",
      addActivity: "新增跟进",
    },
    experts: {
      create: "新增专家",
      list: "专家列表",
      unknownCountry: "未知国家",
      noSpecialty: "未填写擅长",
      noPricing: "未填写报价",
      noEmail: "无邮箱",
    },
    consulting: {
      create: "创建轻咨询",
      list: "轻咨询列表",
      unassigned: "未指派",
      channel: "渠道",
      notes: "备注",
    },
    consultingStatus: {
      New: "新建",
      InProgress: "进行中",
      Completed: "已完成",
      Closed: "已关闭",
    },
    admin: {
      brands: "品牌",
      teams: "团队",
      users: "用户",
      changePassword: "修改密码",
      resetPassword: "重置他人密码",
      positions: "职级",
    },
    ai: {
      list: "AI评估清单",
      open: "AI评估情况表",
      start: "开始评估",
      pending: "评估中",
      completed: "已完成",
      status: "评估状态",
      evaluatedAt: "评估时间",
      requestedAt: "提交时间",
      score: "评估分数",
      summary: "评估摘要",
      notes: "备注",
      noData: "暂无评估记录",
    },
    logs: {
      create: "写入日志",
      list: "日志列表",
    },
    notifications: {
      create: "发送通知",
      list: "通知列表",
      markRead: "标记已读",
      leadForm: "客户填表",
    },
    fields: {
      search: "搜索",
      companyName: "公司名称",
      companyNameEn: "公司英文名称",
      contactName: "联系人",
      email: "邮箱",
      phone: "电话",
      notes: "线索详情",
      expertNotes: "专家详细信息",
      ownerId: "跟进人",
      status: "状态",
      leadId: "Lead ID",
      expertId: "专家 ID",
      channel: "渠道",
      memo: "备注",
      brandName: "品牌名称",
      teamName: "团队名称",
      userName: "姓名",
      role: "系统角色",
      teamId: "团队",
      teamLeader: "团队负责人",
      manager: "上级",
      action: "操作",
      entity: "实体",
      entityId: "实体ID",
      actorId: "操作人ID",
      payload: "请求内容",
      body: "内容",
      score: "评分 (0-100)",
      summary: "评估摘要",
      country: "国家",
      specialties: "擅长",
      pricing: "报价",
      contactEmail: "邮箱",
      pricingCurrency: "货币",
      pricingUnit: "计费方式",
      userId: "用户",
      password: "密码",
      currentPassword: "当前密码",
      newPassword: "新密码",
      confirmPassword: "确认新密码",
      activityType: "跟进类型",
      activityTitle: "标题",
      activityNotes: "详情",
      activityTime: "发生时间",
      contractAmount: "合同金额",
      level: "职级层级",
      requirements: "客户需求",
    },
    buttons: {
      createLead: "创建线索",
      createExpert: "新增专家",
      createConsulting: "创建轻咨询",
      createBrand: "创建品牌",
      createTeam: "创建团队",
      createUser: "创建用户",
      writeLog: "写入日志",
      sendNotification: "发送通知",
      assign: "指派",
      evalWrite: "回写评估",
      merge: "合并同名线索",
      login: "登录",
      logout: "退出",
      changePassword: "修改密码",
      resetPassword: "重置密码",
      close: "关闭",
      cancel: "取消",
      delete: "删除",
      edit: "修改",
      save: "保存",
      createPosition: "新增职级",
      show: "显示",
      hide: "隐藏",
    },
    sections: {
      myLeads: "我的线索",
      teamLeads: "团队线索",
      dashboard: "数据看板",
      users: "用户数",
      teams: "团队数",
    },
    admin: {
      brands: "品牌",
      teams: "团队",
      users: "用户",
      changePassword: "修改密码",
      resetPassword: "重置他人密码",
      positions: "职级",
    },
    tips: {
      managerOnlyAssign: "仅经理可分配公共线索",
      noDuplicates: "暂无可合并线索",
      noUnassigned: "暂无未分配线索",
      noActivities: "暂无跟进记录",
      noActivityPermission: "仅负责人或经理可新增跟进",
      passwordMismatch: "两次新密码不一致",
      confirmDelete: "确定要删除吗？",
      leadFormMissingContact: "邮箱或手机号至少填写一个",
      leadFormRequired: "公司名称、联系人、客户需求为必填",
      leadFormEmailInvalid: "邮箱格式不正确",
    },
    labels: {
      relations: "品牌/团队/用户关系",
      currentUser: "当前登录",
      orgTree: "组织层级树",
    },
    login: {
      remember: "记住用户名",
    },
    activity: {
      Contacted: "联系客户",
      Meeting: "会议/沟通",
      Negotiation: "谈判",
      Proposal: "方案/报价",
      Contract: "合同/签约",
      FollowUp: "跟进",
      CustomerClosed: "客户关闭",
      Other: "其他",
    },
    status: {
      New: "新建",
      Contacted: "已联系",
      Qualified: "已评估",
      Consulting: "轻咨询中",
      Signed: "已签约",
      Closed: "已关闭",
    },
    lang: {
      label: "语言",
      zh: "中文",
      en: "English",
    },
    auth: {
      title: "账号登录",
      subtitle: "使用管理员创建的账号登录系统",
    },
  },
  en: {
    appLabel: "CRM",
    appTitle: "Just Right CRM",
    appSubtitle: "Account login, role-based access, shared lead pool.",
    brandLabel: "Brand",
    refresh: "Refresh",
    tabs: {
      dashboard: "Dashboard",
      leads: "Leads",
      ai: "AI Evaluations",
      experts: "Experts",
      consulting: "Consulting",
      admin: "Org/Users",
      logs: "Logs",
      notifications: "Notifications",
    },
    errors: {
      load: "Load failed",
    },
    leads: {
      create: "Create Lead",
      list: "Lead List",
      count: "Total",
      noContact: "No contact",
      noEmail: "No email",
      noPhone: "No phone",
      noNotes: "No lead notes",
      score: "Score",
      actions: "Lead Actions",
      assign: "Assign Lead",
      unassigned: "Unassigned Leads",
      aiEval: "AI Eval Writeback",
      merge: "Merge Leads",
      mergeAction: "Merge Same Company",
      progress: "Current Progress",
      viewTimeline: "View Timeline",
      hideTimeline: "Hide Timeline",
      addActivity: "Add Activity",
    },
    experts: {
      create: "Add Expert",
      list: "Expert List",
      unknownCountry: "Unknown country",
      noSpecialty: "No specialties",
      noPricing: "No pricing",
      noEmail: "No email",
    },
    consulting: {
      create: "Create Consulting",
      list: "Consulting List",
      unassigned: "Unassigned",
      channel: "Channel",
      notes: "Notes",
    },
    consultingStatus: {
      New: "New",
      InProgress: "In Progress",
      Completed: "Completed",
      Closed: "Closed",
    },
    admin: {
      brands: "Brands",
      teams: "Teams",
      users: "Users",
      changePassword: "Change Password",
      resetPassword: "Reset Password",
      positions: "Positions",
    },
    ai: {
      list: "AI Evaluation List",
      open: "AI Evaluation Report",
      start: "Start Evaluation",
      pending: "Pending",
      completed: "Completed",
      status: "Status",
      evaluatedAt: "Evaluated At",
      requestedAt: "Requested At",
      score: "Score",
      summary: "Summary",
      notes: "Notes",
      noData: "No evaluations yet",
    },
    logs: {
      create: "Write Log",
      list: "Log List",
    },
    notifications: {
      create: "Send Notification",
      list: "Notification List",
      markRead: "Mark Read",
      leadForm: "Lead Intake Form",
    },
    fields: {
      search: "Search",
      companyName: "Company Name",
      companyNameEn: "Company English Name",
      contactName: "Contact",
      email: "Email",
      phone: "Phone",
      notes: "Lead Notes",
      expertNotes: "Expert Details",
      ownerId: "Owner",
      status: "Status",
      leadId: "Lead ID",
      expertId: "Expert ID",
      channel: "Channel",
      memo: "Notes",
      brandName: "Brand Name",
      teamName: "Team Name",
      userName: "Name",
      role: "System Role",
      teamId: "Team",
      teamLeader: "Team Leader",
      manager: "Manager",
      action: "Action",
      entity: "Entity",
      entityId: "Entity ID",
      actorId: "Actor ID",
      payload: "Payload (JSON)",
      body: "Body",
      score: "Score (0-100)",
      summary: "Summary",
      country: "Country",
      specialties: "Specialties",
      pricing: "Pricing",
      contactEmail: "Email",
      pricingCurrency: "Currency",
      pricingUnit: "Billing Unit",
      userId: "User ID",
      password: "Password",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm Password",
      activityType: "Activity Type",
      activityTitle: "Title",
      activityNotes: "Details",
      activityTime: "Occurred At",
      contractAmount: "Contract Amount",
      level: "Level",
      requirements: "Customer Requirements",
    },
    buttons: {
      createLead: "Create Lead",
      createExpert: "Add Expert",
      createConsulting: "Create Consulting",
      createBrand: "Create Brand",
      createTeam: "Create Team",
      createUser: "Create User",
      writeLog: "Write Log",
      sendNotification: "Send Notification",
      assign: "Assign",
      evalWrite: "Writeback",
      merge: "Merge",
      login: "Login",
      logout: "Logout",
      changePassword: "Change Password",
      resetPassword: "Reset Password",
      close: "Close",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      save: "Save",
      createPosition: "Create Position",
      show: "Show",
      hide: "Hide",
    },
    sections: {
      myLeads: "My Leads",
      teamLeads: "Team Leads",
      dashboard: "Dashboard",
      users: "Users",
      teams: "Teams",
    },
    admin: {
      brands: "Brands",
      teams: "Teams",
      users: "Users",
      changePassword: "Change Password",
      resetPassword: "Reset Password",
      positions: "Positions",
    },
    tips: {
      managerOnlyAssign: "Only managers can assign shared leads",
      noDuplicates: "No duplicate leads",
      noUnassigned: "No unassigned leads",
      noActivities: "No activity yet",
      noActivityPermission: "Only owner or manager can add activity",
      passwordMismatch: "Passwords do not match",
      confirmDelete: "Delete this item?",
      leadFormMissingContact: "Email or phone is required",
      leadFormRequired: "Company, contact name, and requirements are required",
      leadFormEmailInvalid: "Invalid email format",
    },
    labels: {
      relations: "Brand / Team / Users",
      currentUser: "Current User",
      orgTree: "Org Tree",
    },
    login: {
      remember: "Remember username",
    },
    activity: {
      Contacted: "Contacted",
      Meeting: "Meeting",
      Negotiation: "Negotiation",
      Proposal: "Proposal",
      Contract: "Contract",
      FollowUp: "Follow-up",
      CustomerClosed: "Customer Closed",
      Other: "Other",
    },
    status: {
      New: "New",
      Contacted: "Contacted",
      Qualified: "Qualified",
      Consulting: "Consulting",
      Signed: "Signed",
      Closed: "Closed",
    },
    lang: {
      label: "Language",
      zh: "中文",
      en: "English",
    },
    auth: {
      title: "Login",
      subtitle: "Use the account created by admin",
    },
  },
};

const tabs = [
  { key: "dashboard" },
  { key: "leads" },
  { key: "ai" },
  { key: "experts" },
  { key: "consulting" },
  { key: "admin" },
  { key: "logs" },
  { key: "notifications" },
] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("dashboard");
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("crm_lang");
    if (stored === "en" || stored === "zh") {
      setLang(stored);
    }
    const token = localStorage.getItem("crm_token");
    const user = localStorage.getItem("crm_user");
    if (token && user) {
      setAuthToken(token);
      setSessionUser(JSON.parse(user));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("crm_lang", lang);
  }, [lang]);

  const t = (key: string) => {
    const [group, sub] = key.split(".");
    const langPack: any = messages[lang];
    if (sub && langPack[group]) {
      return langPack[group][sub] ?? key;
    }
    return langPack[key] ?? key;
  };

  const brandId = sessionUser?.brandId || "";
  const currentUserId = sessionUser?.id || "";

  const [brands, setBrands] = useState<Brand[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [consulting, setConsulting] = useState<ConsultingCase[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activitiesByLead, setActivitiesByLead] = useState<Record<string, LeadActivity[]>>({});
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editingLeadDraft, setEditingLeadDraft] = useState<{
    companyName: string;
    companyNameEn: string;
    name: string;
    email: string;
    phone: string;
    notes: string;
    status: string;
    ownerId: string;
    contractAmount: string;
  } | null>(null);
  const [aiModalLead, setAiModalLead] = useState<Lead | null>(null);
  const [showLeadIntake, setShowLeadIntake] = useState(false);
  const brandName = brands.find((brand) => brand.id === brandId)?.name || "CRM";
  const [leadFilter, setLeadFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingExpertId, setEditingExpertId] = useState<string | null>(null);
  const [editingExpertDraft, setEditingExpertDraft] = useState<{
    name: string;
    country: string;
    specialties: string;
    pricing: string;
    pricingCurrency: string;
    pricingUnit: string;
    contactEmail: string;
    phone: string;
    notes: string;
  } | null>(null);
  const [editingConsultingId, setEditingConsultingId] = useState<string | null>(null);
  const [editingConsultingDraft, setEditingConsultingDraft] = useState<{
    leadId: string;
    expertId: string;
    status: string;
    channel: string;
    price: string;
    currency: string;
    requirements: string;
    notes: string;
  } | null>(null);

  const currentUser = sessionUser;
  const currentTeamUsers = currentUser?.teamId
    ? users.filter((user) => user.teamId === currentUser.teamId)
    : [];
  const teamUserIds = new Set(currentTeamUsers.map((user) => user.id));
  const isManager = currentUser?.role !== "member";

  const filteredLeads = useMemo(() => {
    if (!leadFilter.trim()) return leads;
    const keyword = leadFilter.toLowerCase();
    return leads.filter((lead) =>
      `${lead.companyName} ${lead.companyNameEn || ""} ${lead.name || ""} ${lead.email || ""} ${lead.phone || ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [leads, leadFilter]);

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const timeA = a.lastActivityAt
        ? new Date(a.lastActivityAt).getTime()
        : a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;
      const timeB = b.lastActivityAt
        ? new Date(b.lastActivityAt).getTime()
        : b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;
      return timeB - timeA;
    });
  }, [filteredLeads]);

  const unassignedLeads = sortedLeads.filter((lead) => !lead.ownerId);
  const myLeads = currentUserId ? sortedLeads.filter((lead) => lead.ownerId === currentUserId) : [];
  const teamLeads = isManager
    ? sortedLeads.filter((lead) => (lead.ownerId ? teamUserIds.has(lead.ownerId) : false))
    : [];

  const duplicateCompanies = Array.from(
    sortedLeads.reduce((map, lead) => {
      const key = lead.companyName?.trim();
      if (!key) return map;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .filter(([, count]) => count > 1)
    .map(([company]) => company);

  const aiLeads = useMemo(() => {
    return leads
      .filter((lead) => lead.aiStatus || lead.score !== null || lead.aiSummary || lead.aiEvaluatedAt || lead.aiRequestedAt)
      .sort((a, b) => {
        const timeA = a.aiEvaluatedAt
          ? new Date(a.aiEvaluatedAt).getTime()
          : a.aiRequestedAt
          ? new Date(a.aiRequestedAt).getTime()
          : 0;
        const timeB = b.aiEvaluatedAt
          ? new Date(b.aiEvaluatedAt).getTime()
          : b.aiRequestedAt
          ? new Date(b.aiRequestedAt).getTime()
          : 0;
        return timeB - timeA;
      });
  }, [leads]);

  const dashboard = useMemo(() => {
    const total = sortedLeads.length;
    const byStatus = sortedLeads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
    const signedAmount = sortedLeads.reduce((sum, lead) => {
      if (lead.status === "Signed" && lead.contractAmount) {
        return sum + lead.contractAmount;
      }
      return sum;
    }, 0);
    const inProgress = (byStatus["Contacted"] || 0) + (byStatus["Qualified"] || 0) + (byStatus["Consulting"] || 0);
    return { total, byStatus, signedAmount, inProgress, userCount: users.length, teamCount: teams.length };
  }, [sortedLeads]);

  async function loadActivities(leadId: string) {
    if (!authToken) return;
    const data = await apiGet<LeadActivity[]>(`/leads/${leadId}/activities`, authToken);
    setActivitiesByLead((prev) => ({ ...prev, [leadId]: data }));
  }

  async function refreshAll() {
    if (!authToken) return;
    setError(null);
    try {
      const [brandData, teamData, userData, leadData, expertData, consultingData, logData, notificationData, positionData] =
        await Promise.all([
          apiGet<Brand[]>("/brands", authToken),
          apiGet<Team[]>(`/teams`, authToken),
          apiGet<User[]>(`/users`, authToken),
          apiGet<Lead[]>(`/leads`, authToken),
          apiGet<Expert[]>(`/experts`, authToken),
          apiGet<ConsultingCase[]>(`/consulting`, authToken),
          apiGet<AuditLog[]>(`/logs`, authToken),
          apiGet<Notification[]>(`/notifications`, authToken),
          apiGet<Position[]>(`/positions`, authToken),
        ]);
      setBrands(brandData);
      setTeams(teamData);
      setUsers(userData);
      setLeads(leadData);
      setExperts(expertData);
      setConsulting(consultingData);
      setLogs(logData);
      setNotifications(notificationData);
      setPositions(positionData);
    } catch (err: any) {
      setError(err.message || t("errors.load"));
    }
  }

  useEffect(() => {
    if (authToken) {
      refreshAll();
    }
  }, [authToken]);

  if (!authToken || !sessionUser) {
    return (
      <LoginScreen
        t={t}
        lang={lang}
        setLang={setLang}
        onLogin={async (email, password) => {
          const result = await apiPost<{ accessToken: string; user: SessionUser }>(
            "/auth/login",
            { email, password }
          );
          setAuthToken(result.accessToken);
          setSessionUser(result.user);
          localStorage.setItem("crm_token", result.accessToken);
          localStorage.setItem("crm_user", JSON.stringify(result.user));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("appLabel")}</p>
            <h1 className="mt-2 text-2xl font-semibold">{brandName} CRM</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("labels.currentUser")}：{sessionUser.name} · {positions.find((p) => p.id === sessionUser.positionId)?.name || sessionUser.title || sessionUser.role}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLang(lang === "zh" ? "en" : "zh")}
              className="h-10 min-w-[120px] rounded-xl border border-input px-4 text-sm"
            >
              {lang === "zh" ? t("lang.en") : t("lang.zh")}
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className="h-10 min-w-[120px] rounded-xl border border-input px-4 text-sm"
            >
              {t("buttons.changePassword")}
            </button>
            <button
              onClick={() => {
                setAuthToken(null);
                setSessionUser(null);
                localStorage.removeItem("crm_token");
                localStorage.removeItem("crm_user");
              }}
              className="h-10 min-w-[120px] rounded-xl border border-input px-4 text-sm"
            >
              {t("buttons.logout")}
            </button>
          </div>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2 overflow-x-auto">
          {tabs
            .filter((tab) => {
              if (tab.key === "logs" && !isManager) return false;
              return true;
            })
            .map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {t(`tabs.${tab.key}`)}
            </button>
          ))}
        </nav>

        {error && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <main className="mt-6 flex-1">
          {activeTab === "dashboard" && (
            <section className="grid gap-6">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("sections.dashboard")}</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <DashboardCard label={t("leads.list")} value={dashboard.total} />
                  <DashboardCard label={t("leads.progress")} value={dashboard.inProgress} />
                  <DashboardCard label={t("status.Signed")} value={`¥${formatAmount(dashboard.signedAmount)}`} />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <DashboardCard label={t("sections.users")} value={dashboard.userCount} />
                  <DashboardCard label={t("sections.teams")} value={dashboard.teamCount} />
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {leadStatusOptions(t).map((status) => (
                    <div key={status.value} className="rounded-2xl border border-border/70 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{status.label}</span>
                        <span className="font-semibold">{dashboard.byStatus[status.value] || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          {activeTab === "leads" && (
            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("leads.create")}</h2>
                <LeadForm
                  brandId={brandId}
                  onCreated={refreshAll}
                  t={t}
                  token={authToken}
                  users={users}
                  currentUserId={currentUserId}
                  isManager={isManager}
                />
              </div>
              <div className="grid gap-6">
                <div className="rounded-3xl border border-border bg-card p-6">
                  <h2 className="text-lg font-semibold">{t("leads.list")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("leads.count")} {sortedLeads.length}
                  </p>
                  <div className="mt-3">
                    <Input label={t("fields.search")} value={leadFilter} onChange={setLeadFilter} />
                  </div>
                  <ul className="mt-4 space-y-3">
                    {sortedLeads.map((lead) => (
                      <li key={lead.id} className="rounded-2xl border border-border/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            {editingLeadId === lead.id && editingLeadDraft ? (
                              <div className="space-y-2">
                                <Input
                                  label={t("fields.companyName")}
                                  value={editingLeadDraft.companyName}
                                  onChange={(value) =>
                                    setEditingLeadDraft((prev) => (prev ? { ...prev, companyName: value } : prev))
                                  }
                                />
                                <Input
                                  label={t("fields.companyNameEn")}
                                  value={editingLeadDraft.companyNameEn}
                                  onChange={(value) =>
                                    setEditingLeadDraft((prev) => (prev ? { ...prev, companyNameEn: value } : prev))
                                  }
                                />
                                <Input
                                  label={t("fields.contactName")}
                                  value={editingLeadDraft.name}
                                  onChange={(value) =>
                                    setEditingLeadDraft((prev) => (prev ? { ...prev, name: value } : prev))
                                  }
                                />
                              </div>
                            ) : (
                              <>
                                <p className="font-medium">{lead.companyName}</p>
                                <p className="text-xs text-muted-foreground">{lead.companyNameEn || ""}</p>
                                <p className="text-xs text-muted-foreground">{lead.name || t("leads.noContact")}</p>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAiModalLead(lead)}
                              className="h-8 rounded-full border border-input px-3 text-xs"
                            >
                              {t("ai.open")}
                            </button>
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                              {t(`status.${lead.status}`) || lead.status}
                            </span>
                          </div>
                        </div>
                        {editingLeadId === lead.id && editingLeadDraft ? (
                          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                            <Input
                              label={t("fields.email")}
                              value={editingLeadDraft.email}
                              onChange={(value) =>
                                setEditingLeadDraft((prev) => (prev ? { ...prev, email: value } : prev))
                              }
                            />
                            <Input
                              label={t("fields.phone")}
                              value={editingLeadDraft.phone}
                              onChange={(value) =>
                                setEditingLeadDraft((prev) => (prev ? { ...prev, phone: value } : prev))
                              }
                            />
                            <Select
                              label={t("fields.status")}
                              value={editingLeadDraft.status}
                              onChange={(value) =>
                                setEditingLeadDraft((prev) => (prev ? { ...prev, status: value } : prev))
                              }
                              options={leadStatusOptions(t)}
                            />
                            <Select
                              label={t("fields.ownerId")}
                              value={editingLeadDraft.ownerId}
                              onChange={(value) =>
                                setEditingLeadDraft((prev) => (prev ? { ...prev, ownerId: value } : prev))
                              }
                              options={[
                                { value: "", label: "-" },
                                ...users.map((user) => ({ value: user.id, label: user.name })),
                              ]}
                            />
                            <TextArea
                              label={t("fields.notes")}
                              value={editingLeadDraft.notes}
                              onChange={(value) =>
                                setEditingLeadDraft((prev) => (prev ? { ...prev, notes: value } : prev))
                              }
                              rows={3}
                            />
                            <Input
                              label={t("fields.contractAmount")}
                              value={editingLeadDraft.contractAmount}
                              onChange={(value) =>
                                setEditingLeadDraft((prev) => (prev ? { ...prev, contractAmount: value } : prev))
                              }
                            />
                          </div>
                        ) : (
                          <>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {lead.email || t("leads.noEmail")} · {lead.phone || t("leads.noPhone")}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {lead.notes || t("leads.noNotes")}
                            </div>
                          </>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {t("leads.progress")}：{(activitiesByLead[lead.id]?.[0]?.title) || "-"}
                        </div>
                        {lead.score !== null && lead.score !== undefined && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {t("leads.score")}：{lead.score}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                          <button
                            onClick={async () => {
                              if (expandedLeadId === lead.id) {
                                setExpandedLeadId(null);
                                return;
                              }
                              await loadActivities(lead.id);
                              setExpandedLeadId(lead.id);
                            }}
                            className="text-primary underline"
                          >
                            {expandedLeadId === lead.id ? t("leads.hideTimeline") : t("leads.viewTimeline")}
                          </button>
                          {(isManager || lead.ownerId === currentUserId) && (
                            <>
                              {editingLeadId === lead.id ? (
                                <>
                                  <button
                                    onClick={async () => {
                                      if (!editingLeadDraft) return;
                                      await apiPatch(
                                        `/leads/${lead.id}`,
                                        {
                                          companyName: editingLeadDraft.companyName,
                                          companyNameEn: editingLeadDraft.companyNameEn || undefined,
                                          name: editingLeadDraft.name || undefined,
                                          email: editingLeadDraft.email || undefined,
                                          phone: editingLeadDraft.phone || undefined,
                                          notes: editingLeadDraft.notes || undefined,
                                          status: editingLeadDraft.status,
                                          ownerId: editingLeadDraft.ownerId || undefined,
                                          contractAmount: editingLeadDraft.contractAmount
                                            ? Number(editingLeadDraft.contractAmount)
                                            : undefined,
                                        },
                                        authToken
                                      );
                                      setEditingLeadId(null);
                                      setEditingLeadDraft(null);
                                      refreshAll();
                                    }}
                                    className="text-primary underline"
                                  >
                                    {t("buttons.save")}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingLeadId(null);
                                      setEditingLeadDraft(null);
                                    }}
                                    className="text-muted-foreground underline"
                                  >
                                    {t("buttons.cancel")}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingLeadId(lead.id);
                                    setEditingLeadDraft({
                                      companyName: lead.companyName,
                                      companyNameEn: lead.companyNameEn || "",
                                      name: lead.name || "",
                                      email: lead.email || "",
                                      phone: lead.phone || "",
                                      notes: lead.notes || "",
                                      status: lead.status,
                                      ownerId: lead.ownerId || "",
                                      contractAmount: lead.contractAmount ? String(lead.contractAmount) : "",
                                    });
                                  }}
                                  className="text-primary underline"
                                >
                                  {t("buttons.edit")}
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  const ok = window.confirm(t("tips.confirmDelete"));
                                  if (!ok) return;
                                  await apiDelete(`/leads/${lead.id}`, authToken);
                                  refreshAll();
                                }}
                                className="text-destructive underline"
                              >
                                {t("buttons.delete")}
                              </button>
                            </>
                          )}
                        </div>
                        {expandedLeadId === lead.id && (
                          <div className="mt-4 space-y-4 rounded-xl border border-border/70 bg-background/60 p-4">
                            <ActivityForm
                              t={t}
                              token={authToken}
                              leadId={lead.id}
                              onCreated={async () => {
                                await loadActivities(lead.id);
                              }}
                              canEdit={isManager || lead.ownerId === currentUserId}
                            />
                            <ActivityList t={t} activities={activitiesByLead[lead.id] || []} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-border bg-card p-6">
                  <h2 className="text-lg font-semibold">{t("leads.unassigned")}</h2>
                  <LeadActions
                    brandId={brandId}
                    onCreated={refreshAll}
                    t={t}
                    users={users}
                    isManager={isManager}
                    unassignedLeads={unassignedLeads}
                    duplicateCompanies={duplicateCompanies}
                    token={authToken}
                  />
                </div>
                <div className="rounded-3xl border border-border bg-card p-6">
                  <h2 className="text-lg font-semibold">{t("sections.myLeads")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("leads.count")} {myLeads.length}</p>
                  <ul className="mt-4 space-y-3">
                    {myLeads.map((lead) => (
                      <li key={lead.id} className="rounded-2xl border border-border/80 p-4">
                        <p className="font-medium">{lead.companyName}</p>
                        <p className="text-xs text-muted-foreground">{lead.companyNameEn || ""}</p>
                        <p className="text-xs text-muted-foreground">{lead.notes || t("leads.noNotes")}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                {isManager && (
                  <div className="rounded-3xl border border-border bg-card p-6">
                    <h2 className="text-lg font-semibold">{t("sections.teamLeads")}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{t("leads.count")} {teamLeads.length}</p>
                    <ul className="mt-4 space-y-3">
                      {teamLeads.map((lead) => (
                        <li key={lead.id} className="rounded-2xl border border-border/80 p-4">
                          <p className="font-medium">{lead.companyName}</p>
                          <p className="text-xs text-muted-foreground">{lead.companyNameEn || ""}</p>
                          <p className="text-xs text-muted-foreground">{lead.notes || t("leads.noNotes")}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "ai" && (
            <section className="grid gap-6">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("ai.list")}</h2>
                {aiLeads.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">{t("ai.noData")}</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {aiLeads.map((lead) => (
                      <li key={lead.id} className="rounded-2xl border border-border/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{lead.companyName}</p>
                            <p className="text-xs text-muted-foreground">{lead.companyNameEn || ""}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAiModalLead(lead)}
                            className="h-8 rounded-full border border-input px-3 text-xs"
                          >
                            {t("ai.open")}
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {t("ai.status")}：{lead.aiStatus === "pending" ? t("ai.pending") : t("ai.completed")}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t("ai.evaluatedAt")}：{lead.aiEvaluatedAt ? new Date(lead.aiEvaluatedAt).toLocaleDateString() : "-"}
                        </div>
                        {lead.score !== null && lead.score !== undefined && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("ai.score")}：{lead.score}
                          </div>
                        )}
                        {lead.aiSummary && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("ai.summary")}：{lead.aiSummary}
                          </div>
                        )}
                        {lead.aiNotes && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("ai.notes")}：{lead.aiNotes}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {activeTab === "experts" && (
            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("experts.create")}</h2>
                <ExpertForm brandId={brandId} onCreated={refreshAll} t={t} token={authToken} />
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("experts.list")}</h2>
                <ul className="mt-4 space-y-3">
                  {experts.map((expert) => (
                    <li key={expert.id} className="rounded-2xl border border-border/80 p-4">
                      {editingExpertId === expert.id && editingExpertDraft ? (
                        <div className="space-y-2 text-sm">
                          <Input
                            label={t("fields.userName")}
                            value={editingExpertDraft.name}
                            onChange={(value) =>
                              setEditingExpertDraft((prev) => (prev ? { ...prev, name: value } : prev))
                            }
                          />
                          <Input
                            label={t("fields.country")}
                            value={editingExpertDraft.country}
                            onChange={(value) =>
                              setEditingExpertDraft((prev) => (prev ? { ...prev, country: value } : prev))
                            }
                          />
                          <TextArea
                            label={t("fields.specialties")}
                            value={editingExpertDraft.specialties}
                            onChange={(value) =>
                              setEditingExpertDraft((prev) => (prev ? { ...prev, specialties: value } : prev))
                            }
                            rows={5}
                          />
                          <div className="grid gap-2 md:grid-cols-3">
                            <Input
                              label={t("fields.pricing")}
                              value={editingExpertDraft.pricing}
                              onChange={(value) =>
                                setEditingExpertDraft((prev) => (prev ? { ...prev, pricing: value } : prev))
                              }
                            />
                            <Select
                              label={t("fields.pricingCurrency")}
                              value={editingExpertDraft.pricingCurrency}
                              onChange={(value) =>
                                setEditingExpertDraft((prev) => (prev ? { ...prev, pricingCurrency: value } : prev))
                              }
                              options={[
                                { value: "CNY", label: "CNY" },
                                { value: "USD", label: "USD" },
                                { value: "JPY", label: "JPY" },
                                { value: "EUR", label: "EUR" },
                                { value: "GBP", label: "GBP" },
                              ]}
                            />
                            <Select
                              label={t("fields.pricingUnit")}
                              value={editingExpertDraft.pricingUnit}
                              onChange={(value) =>
                                setEditingExpertDraft((prev) => (prev ? { ...prev, pricingUnit: value } : prev))
                              }
                              options={[
                                { value: "project", label: "Per Project" },
                                { value: "hour", label: "Per Hour" },
                                { value: "day", label: "Per Day" },
                              ]}
                            />
                          </div>
                          <Input
                            label={t("fields.contactEmail")}
                            value={editingExpertDraft.contactEmail}
                            onChange={(value) =>
                              setEditingExpertDraft((prev) => (prev ? { ...prev, contactEmail: value } : prev))
                            }
                          />
                          <Input
                            label={t("fields.phone")}
                            value={editingExpertDraft.phone}
                            onChange={(value) =>
                              setEditingExpertDraft((prev) => (prev ? { ...prev, phone: value } : prev))
                            }
                          />
                          <TextArea
                            label={t("fields.expertNotes")}
                            value={editingExpertDraft.notes}
                            onChange={(value) =>
                              setEditingExpertDraft((prev) => (prev ? { ...prev, notes: value } : prev))
                            }
                            rows={3}
                          />
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              onClick={async () => {
                                if (!editingExpertDraft) return;
                                await apiPatch(
                                  `/experts/${expert.id}`,
                                  {
                                    name: editingExpertDraft.name,
                                    country: editingExpertDraft.country || undefined,
                                    specialties: editingExpertDraft.specialties || undefined,
                                    pricing: editingExpertDraft.pricing || undefined,
                                    pricingCurrency: editingExpertDraft.pricingCurrency || undefined,
                                    pricingUnit: editingExpertDraft.pricingUnit || undefined,
                                    contactEmail: editingExpertDraft.contactEmail || undefined,
                                    phone: editingExpertDraft.phone || undefined,
                                    notes: editingExpertDraft.notes || undefined,
                                  },
                                  authToken
                                );
                                setEditingExpertId(null);
                                setEditingExpertDraft(null);
                                refreshAll();
                              }}
                              className="text-primary underline"
                            >
                              {t("buttons.save")}
                            </button>
                            <button
                              onClick={() => {
                                setEditingExpertId(null);
                                setEditingExpertDraft(null);
                              }}
                              className="text-muted-foreground underline"
                            >
                              {t("buttons.cancel")}
                            </button>
                            <button
                              onClick={async () => {
                                const ok = window.confirm(t("tips.confirmDelete"));
                                if (!ok) return;
                                await apiDelete(`/experts/${expert.id}`, authToken);
                                refreshAll();
                              }}
                              className="text-destructive underline"
                            >
                              {t("buttons.delete")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{expert.name}</p>
                            {isManager && (
                              <button
                                onClick={() => {
                                  setEditingExpertId(expert.id);
                                  setEditingExpertDraft({
                                    name: expert.name,
                                    country: expert.country || "",
                                    specialties: expert.specialties || "",
                                    pricing: expert.pricing || "",
                                    pricingCurrency: expert.pricingCurrency || "CNY",
                                    pricingUnit: expert.pricingUnit || "project",
                                    contactEmail: expert.contactEmail || "",
                                    phone: expert.phone || "",
                                    notes: expert.notes || "",
                                  });
                                }}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.edit")}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {expert.country || t("experts.unknownCountry")} · {expert.specialties || t("experts.noSpecialty")}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {expert.contactEmail || t("experts.noEmail")} · {expert.phone || "-"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {expert.pricing ? formatAmount(expert.pricing) : t("experts.noPricing")} {expert.pricingCurrency || ""} {expert.pricingUnit || ""}
                          </p>
                          {expert.notes && <p className="mt-2 text-xs text-muted-foreground">{expert.notes}</p>}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {activeTab === "consulting" && (
            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("consulting.create")}</h2>
                <ConsultingForm
                  brandId={brandId}
                  onCreated={refreshAll}
                  t={t}
                  token={authToken}
                  leads={leads}
                  experts={experts}
                />
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("consulting.list")}</h2>
                <ul className="mt-4 space-y-3">
                  {consulting.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-border/80 p-4">
                      {editingConsultingId === item.id && editingConsultingDraft ? (
                        <div className="space-y-2 text-sm">
                          <Select
                            label={t("fields.leadId")}
                            value={editingConsultingDraft.leadId}
                            onChange={(value) =>
                              setEditingConsultingDraft((prev) => (prev ? { ...prev, leadId: value } : prev))
                            }
                            options={[
                              { value: "", label: "--" },
                              ...leads.map((lead) => ({ value: lead.id, label: lead.companyName })),
                            ]}
                          />
                          <Select
                            label={t("fields.expertId")}
                            value={editingConsultingDraft.expertId}
                            onChange={(value) =>
                              setEditingConsultingDraft((prev) => (prev ? { ...prev, expertId: value } : prev))
                            }
                            options={[
                              { value: "", label: "--" },
                              ...experts.map((expert) => ({ value: expert.id, label: expert.name })),
                            ]}
                          />
                          <Select
                            label={t("fields.status")}
                            value={editingConsultingDraft.status}
                            onChange={(value) =>
                              setEditingConsultingDraft((prev) => (prev ? { ...prev, status: value } : prev))
                            }
                            options={consultingStatusOptions(t)}
                          />
                          <Input
                            label={t("fields.channel")}
                            value={editingConsultingDraft.channel}
                            onChange={(value) =>
                              setEditingConsultingDraft((prev) => (prev ? { ...prev, channel: value } : prev))
                            }
                          />
                          <div className="grid gap-2 md:grid-cols-2">
                            <Input
                              label={t("fields.pricing")}
                              value={editingConsultingDraft.price}
                              onChange={(value) =>
                                setEditingConsultingDraft((prev) => (prev ? { ...prev, price: value } : prev))
                              }
                            />
                            <Select
                              label={t("fields.pricingCurrency")}
                              value={editingConsultingDraft.currency}
                              onChange={(value) =>
                                setEditingConsultingDraft((prev) => (prev ? { ...prev, currency: value } : prev))
                              }
                              options={[
                                { value: "CNY", label: "CNY" },
                                { value: "USD", label: "USD" },
                                { value: "JPY", label: "JPY" },
                                { value: "EUR", label: "EUR" },
                                { value: "GBP", label: "GBP" },
                              ]}
                            />
                          </div>
                          <TextArea
                            label={t("fields.requirements")}
                            value={editingConsultingDraft.requirements}
                            onChange={(value) =>
                              setEditingConsultingDraft((prev) => (prev ? { ...prev, requirements: value } : prev))
                            }
                            rows={4}
                          />
                          <TextArea
                            label={t("fields.memo")}
                            value={editingConsultingDraft.notes}
                            onChange={(value) =>
                              setEditingConsultingDraft((prev) => (prev ? { ...prev, notes: value } : prev))
                            }
                            rows={3}
                          />
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              onClick={async () => {
                                if (!editingConsultingDraft) return;
                                await apiPatch(
                                  `/consulting/${item.id}`,
                                  {
                                    leadId: editingConsultingDraft.leadId,
                                    expertId: editingConsultingDraft.expertId || undefined,
                                    status: editingConsultingDraft.status,
                                    channel: editingConsultingDraft.channel,
                                    price: editingConsultingDraft.price ? Number(editingConsultingDraft.price) : undefined,
                                    currency: editingConsultingDraft.currency || undefined,
                                    requirements: editingConsultingDraft.requirements || undefined,
                                    notes: editingConsultingDraft.notes || undefined,
                                  },
                                  authToken
                                );
                                setEditingConsultingId(null);
                                setEditingConsultingDraft(null);
                                refreshAll();
                              }}
                              className="text-primary underline"
                            >
                              {t("buttons.save")}
                            </button>
                            <button
                              onClick={() => {
                                setEditingConsultingId(null);
                                setEditingConsultingDraft(null);
                              }}
                              className="text-muted-foreground underline"
                            >
                              {t("buttons.cancel")}
                            </button>
                            <button
                              onClick={async () => {
                                const ok = window.confirm(t("tips.confirmDelete"));
                                if (!ok) return;
                                await apiDelete(`/consulting/${item.id}`, authToken);
                                refreshAll();
                              }}
                              className="text-destructive underline"
                            >
                              {t("buttons.delete")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="font-medium">
                              {t("fields.leadId")}: {leads.find((lead) => lead.id === item.leadId)?.companyName || item.leadId}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                                {t(`consultingStatus.${item.status}`) || item.status}
                              </span>
                              {isManager && (
                                <button
                                  onClick={() => {
                                    setEditingConsultingId(item.id);
                                    setEditingConsultingDraft({
                                      leadId: item.leadId,
                                      expertId: item.expertId || "",
                                      status: item.status,
                                      channel: item.channel,
                                      price: item.price ? String(item.price) : "",
                                      currency: item.currency || "CNY",
                                      requirements: item.requirements || "",
                                      notes: item.notes || "",
                                    });
                                  }}
                                  className="text-xs text-primary underline"
                                >
                                  {t("buttons.edit")}
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t("fields.expertId")}：{experts.find((expert) => expert.id === item.expertId)?.name || t("consulting.unassigned")} · {t("consulting.channel")}：{item.channel}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t("fields.pricing")}：{item.price ? formatAmount(item.price) : "-"} {item.currency || ""}
                          </p>
                          {item.requirements && <p className="mt-2 text-xs text-muted-foreground">{item.requirements}</p>}
                          {item.notes && <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p>}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {activeTab === "admin" && (
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("admin.brands")}</h2>
                <BrandForm onCreated={refreshAll} t={t} token={authToken} />
                <Input
                  label={t("fields.search")}
                  value={brandFilter}
                  onChange={setBrandFilter}
                />
                <ul className="mt-4 space-y-2 text-sm">
                  {brands
                    .filter((brand) => brand.name.toLowerCase().includes(brandFilter.toLowerCase()))
                    .map((brand) => (
                    <li key={brand.id} className="rounded-xl border border-border/80 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          {editingBrandId === brand.id ? (
                            <Input
                              label={t("fields.brandName")}
                              value={brand.name}
                              onChange={(value) => {
                                setBrands((prev) =>
                                  prev.map((item) => (item.id === brand.id ? { ...item, name: value } : item))
                                );
                              }}
                            />
                          ) : (
                            <p className="font-medium">{brand.name}</p>
                          )}
                        </div>
                        {isManager && (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                            {editingBrandId === brand.id ? (
                              <button
                                onClick={async () => {
                                  await apiPatch(`/brands/${brand.id}`, { name: brand.name }, authToken);
                                  setEditingBrandId(null);
                                  refreshAll();
                                }}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.save")}
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingBrandId(brand.id)}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.edit")}
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                await apiDelete(`/brands/${brand.id}`, authToken);
                                refreshAll();
                              }}
                              className="text-xs text-destructive underline"
                            >
                              {t("buttons.delete")}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("admin.teams")}</h2>
                <TeamForm brandId={brandId} onCreated={refreshAll} t={t} token={authToken} users={users} />
                <Input
                  label={t("fields.search")}
                  value={teamFilter}
                  onChange={setTeamFilter}
                />
                <ul className="mt-4 space-y-2 text-sm">
                  {teams
                    .filter((team) => team.name.toLowerCase().includes(teamFilter.toLowerCase()))
                    .map((team) => (
                    <li key={team.id} className="rounded-xl border border-border/80 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          {editingTeamId === team.id ? (
                            <Input
                              label={t("fields.teamName")}
                              value={team.name}
                              onChange={(value) => {
                                setTeams((prev) =>
                                  prev.map((item) => (item.id === team.id ? { ...item, name: value } : item))
                                );
                              }}
                            />
                          ) : (
                            <p className="font-medium">{team.name}</p>
                          )}
                          {editingTeamId === team.id ? (
                            <Select
                              label={t("fields.teamLeader")}
                              value={team.leaderId || ""}
                              onChange={(value) => {
                                setTeams((prev) =>
                                  prev.map((item) => (item.id === team.id ? { ...item, leaderId: value || null } : item))
                                );
                              }}
                              options={[
                                { value: "", label: "--" },
                                ...users.map((user) => ({ value: user.id, label: `${user.name} · ${user.role}` })),
                              ]}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {t("fields.teamLeader")}：{users.find((user) => user.id === team.leaderId)?.name || "-"}
                            </p>
                          )}
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {editingTeamId === team.id ? (
                              <button
                                onClick={async () => {
                                  await apiPatch(`/teams/${team.id}`, { name: team.name, leaderId: team.leaderId }, authToken);
                                  setEditingTeamId(null);
                                  refreshAll();
                                }}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.save")}
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingTeamId(team.id)}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.edit")}
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                await apiDelete(`/teams/${team.id}`, authToken);
                                refreshAll();
                              }}
                              className="text-xs text-destructive underline"
                            >
                              {t("buttons.delete")}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("admin.users")}</h2>
                <UserForm
                  brandId={brandId}
                  onCreated={refreshAll}
                  t={t}
                  token={authToken}
                  teams={teams}
                  users={users}
                  positions={positions}
                />
                <Input
                  label={t("fields.search")}
                  value={userFilter}
                  onChange={setUserFilter}
                />
                <ul className="mt-4 space-y-2 text-sm">
                  {users
                    .filter((user) =>
                      `${user.name} ${user.email}`.toLowerCase().includes(userFilter.toLowerCase())
                    )
                    .map((user) => (
                    <li key={user.id} className="rounded-xl border border-border/80 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          {editingUserId === user.id ? (
                            <Input
                              label={t("fields.userName")}
                              value={user.name}
                              onChange={(value) => {
                                setUsers((prev) =>
                                  prev.map((item) => (item.id === user.id ? { ...item, name: value } : item))
                                );
                              }}
                            />
                          ) : (
                            <p className="font-medium">{user.name}</p>
                          )}
                          {editingUserId === user.id ? (
                            <div className="mt-2 space-y-2">
                              <Select
                                label={t("fields.role")}
                                value={user.role}
                                onChange={(value) => {
                                  setUsers((prev) =>
                                    prev.map((item) => (item.id === user.id ? { ...item, role: value } : item))
                                  );
                                }}
                                options={[
                                  { value: "member", label: "member" },
                                  { value: "manager", label: "manager" },
                                ]}
                              />
                              <Select
                                label={t("admin.positions")}
                                value={user.positionId || ""}
                                onChange={(value) => {
                                  setUsers((prev) =>
                                    prev.map((item) => (item.id === user.id ? { ...item, positionId: value || null } : item))
                                  );
                                }}
                                options={[
                                  { value: "", label: "--" },
                                  ...positions.map((pos) => ({ value: pos.id, label: pos.name })),
                                ]}
                              />
                              <Select
                                label={t("fields.teamId")}
                                value={user.teamId || ""}
                                onChange={(value) => {
                                  setUsers((prev) =>
                                    prev.map((item) => (item.id === user.id ? { ...item, teamId: value || null } : item))
                                  );
                                }}
                                options={[
                                  { value: "", label: "--" },
                                  ...teams.map((team) => ({ value: team.id, label: team.name })),
                                ]}
                              />
                              <Select
                                label={t("fields.manager")}
                                value={user.managerId || ""}
                                onChange={(value) => {
                                  setUsers((prev) =>
                                    prev.map((item) => (item.id === user.id ? { ...item, managerId: value || null } : item))
                                  );
                                }}
                                options={[
                                  { value: "", label: "--" },
                                  ...users.map((u) => ({ value: u.id, label: `${u.name} · ${u.role}` })),
                                ]}
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {user.email} · {user.role} · {positions.find((pos) => pos.id === user.positionId)?.name || "-"}
                            </p>
                          )}
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-3 whitespace-nowrap">
                            {editingUserId === user.id ? (
                              <button
                                onClick={async () => {
                                  await apiPatch(
                                    `/users/${user.id}`,
                                    {
                                      name: user.name,
                                      role: user.role,
                                      teamId: user.teamId ?? null,
                                      managerId: user.managerId ?? null,
                                      positionId: user.positionId ?? null,
                                    },
                                    authToken
                                );
                                  setEditingUserId(null);
                                  refreshAll();
                                }}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.save")}
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingUserId(user.id)}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.edit")}
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                await apiDelete(`/users/${user.id}`, authToken);
                                refreshAll();
                              }}
                              className="text-xs text-destructive underline"
                            >
                              {t("buttons.delete")}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6 lg:col-span-3">
                <h2 className="text-lg font-semibold">{t("labels.relations")}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {teams.map((team) => (
                    <div key={team.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("fields.teamLeader")}：{users.find((user) => user.id === team.leaderId)?.name || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">{team.id}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {users.filter((user) => user.teamId === team.id).length}
                        </span>
                      </div>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {users.filter((user) => user.teamId === team.id).map((user) => (
                          <li key={user.id}>{user.name} · {user.title || user.role}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-border/70 p-4 text-sm">
                  <h3 className="text-sm font-semibold">{t("labels.orgTree")}</h3>
                  <OrgTree users={users} positions={positions} />
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("admin.positions")}</h2>
                <PositionForm onCreated={refreshAll} t={t} token={authToken} />
                <ul className="mt-4 space-y-2 text-sm">
                  {positions.map((pos) => (
                    <li key={pos.id} className="rounded-xl border border-border/80 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          {editingPositionId === pos.id ? (
                            <Input
                              label={t("fields.title")}
                              value={pos.name}
                              onChange={(value) => {
                                setPositions((prev) =>
                                  prev.map((item) => (item.id === pos.id ? { ...item, name: value } : item))
                                );
                              }}
                            />
                          ) : (
                            <p className="font-medium">{pos.name}</p>
                          )}
                          {editingPositionId === pos.id ? (
                            <Input
                              label={t("fields.level")}
                              value={pos.level?.toString() || ""}
                              onChange={(value) => {
                                setPositions((prev) =>
                                  prev.map((item) => (item.id === pos.id ? { ...item, level: value ? Number(value) : null } : item))
                                );
                              }}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground">{pos.level ?? "-"}</p>
                          )}
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-2">
                            {editingPositionId === pos.id ? (
                              <button
                                onClick={async () => {
                                  await apiPatch(`/positions/${pos.id}`, { name: pos.name, level: pos.level ?? null }, authToken);
                                  setEditingPositionId(null);
                                  refreshAll();
                                }}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.save")}
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingPositionId(pos.id)}
                                className="text-xs text-primary underline"
                              >
                                {t("buttons.edit")}
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                await apiDelete(`/positions/${pos.id}`, authToken);
                                refreshAll();
                              }}
                              className="text-xs text-destructive underline"
                            >
                              {t("buttons.delete")}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("admin.changePassword")}</h2>
                <ChangePasswordForm t={t} token={authToken} />
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("admin.resetPassword")}</h2>
                <ResetPasswordForm t={t} token={authToken} users={users} />
              </div>
            </section>
          )}

          {activeTab === "logs" && (
            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("logs.create")}</h2>
                <LogForm brandId={brandId} onCreated={refreshAll} t={t} token={authToken} />
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("logs.list")}</h2>
                <ul className="mt-4 space-y-3">
                  {logs.map((log) => (
                    <li key={log.id} className="rounded-2xl border border-border/80 p-4">
                      <p className="font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.entity} · {log.entityId || "-"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {activeTab === "notifications" && (
            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              {isManager && (
                <div className="rounded-3xl border border-border bg-card p-6">
                  <h2 className="text-lg font-semibold">{t("notifications.create")}</h2>
                  <NotificationForm brandId={brandId} onCreated={refreshAll} t={t} token={authToken} />
                </div>
              )}
              <div className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t("notifications.list")}</h2>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowLeadIntake(true)}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-input px-4 text-sm"
                  >
                    {t("notifications.leadForm")}
                  </button>
                </div>
                <ul className="mt-4 space-y-3">
                  {notifications.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-border/80 p-4">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("fields.userId")}：{item.userId} · {item.channel} · {item.status}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                      <button
                        onClick={async () => {
                          await apiPatch(`/notifications/${item.id}`, { status: "Read" }, authToken);
                          refreshAll();
                        }}
                        className="mt-2 text-xs text-primary underline"
                      >
                        {t("notifications.markRead")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </main>
        {aiModalLead && authToken && (
          <AIEvaluationModal
            t={t}
            lead={aiModalLead}
            token={authToken}
            onClose={() => setAiModalLead(null)}
            onUpdated={async () => {
              await refreshAll();
              setAiModalLead(null);
            }}
          />
        )}
        {showLeadIntake && (
          <LeadIntakeModal
            t={t}
            brandId={brandId}
            onClose={() => setShowLeadIntake(false)}
            onCreated={async () => {
              await refreshAll();
              setShowLeadIntake(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function LoginScreen({
  t,
  lang,
  setLang,
  onLogin,
}: {
  t: (key: string) => string;
  lang: "zh" | "en";
  setLang: (lang: "zh" | "en") => void;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("admin@justright.ai");
  const [password, setPassword] = useState("ChangeMe123");
  const [error, setError] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [rememberUsername, setRememberUsername] = useState(false);

  useEffect(() => {
    const storedLoginEmail = localStorage.getItem("crm_login_email");
    if (storedLoginEmail) {
      setEmail(storedLoginEmail);
      setRememberUsername(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{t("auth.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === "zh" ? "en" : "zh")}
                className="rounded-xl border border-input px-4 py-2 text-xs"
              >
                {lang === "zh" ? t("lang.en") : t("lang.zh")}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
          <form
            className="mt-6 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                if (rememberUsername) {
                  localStorage.setItem("crm_login_email", email);
                } else {
                  localStorage.removeItem("crm_login_email");
                }
                await onLogin(email, password);
              } catch (err: any) {
                setError(err.message || t("errors.load"));
              }
            }}
          >
            <h2 className="text-sm font-semibold">{t("buttons.login")}</h2>
            <Input label={t("fields.email")} value={email} onChange={setEmail} required />
            <PasswordField
              label={t("fields.password")}
              value={password}
              onChange={setPassword}
              showLabel={t("buttons.show")}
              hideLabel={t("buttons.hide")}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberUsername}
                onChange={(e) => setRememberUsername(e.target.checked)}
              />
              {t("login.remember")}
            </label>
            <div className="flex items-center gap-2">
              <SubmitButton disabled={!email || !password} label={t("buttons.login")} />
              <button
                type="button"
                onClick={() => setShowChangePassword(true)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-input px-4 text-sm"
              >
                {t("buttons.changePassword")}
              </button>
            </div>
          </form>
        </div>
      </div>
      {showChangePassword && (
        <ChangePasswordModal
          t={t}
          onClose={() => setShowChangePassword(false)}
          defaultEmail={email}
        />
      )}
    </div>
  );
}

function AIEvaluationModal({
  t,
  lead,
  token,
  onClose,
  onUpdated,
}: {
  t: (key: string) => string;
  lead: Lead;
  token: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const canStart = !lead.aiStatus && lead.score === null && !lead.aiSummary;

  async function handleStart() {
    setStatus(null);
    try {
      await apiPost(`/leads/${lead.id}/ai-eval-start`, {}, token);
      await onUpdated();
      setStatus(t("ai.pending"));
    } catch (err: any) {
      setStatus(err.message || "Error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("ai.open")}</h2>
          <button onClick={onClose} className="text-xs text-muted-foreground">
            {t("buttons.close")}
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p className="font-medium">{lead.companyName}</p>
          <p className="text-xs text-muted-foreground">{lead.companyNameEn || ""}</p>
          <div className="grid gap-2 rounded-2xl border border-border/70 p-3 text-xs text-muted-foreground">
            <div>{t("ai.status")}：{lead.aiStatus === "pending" ? t("ai.pending") : lead.score !== null ? t("ai.completed") : "-"}</div>
            <div>{t("ai.requestedAt")}：{lead.aiRequestedAt ? new Date(lead.aiRequestedAt).toLocaleDateString() : "-"}</div>
            <div>{t("ai.evaluatedAt")}：{lead.aiEvaluatedAt ? new Date(lead.aiEvaluatedAt).toLocaleDateString() : "-"}</div>
            <div>{t("ai.score")}：{lead.score ?? "-"}</div>
            <div>{t("ai.summary")}：{lead.aiSummary || "-"}</div>
            <div>{t("ai.notes")}：{lead.aiNotes || "-"}</div>
          </div>
          {canStart && (
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-input px-4 text-sm"
            >
              {t("ai.start")}
            </button>
          )}
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>
      </div>
    </div>
  );
}

function LeadIntakeModal({
  t,
  brandId,
  onClose,
  onCreated,
}: {
  t: (key: string) => string;
  brandId: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [companyName, setCompanyName] = useState("");
  const [companyNameEn, setCompanyNameEn] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requirement, setRequirement] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!brandId) return;
    setStatus(null);
    if (!companyName || !name || !requirement) {
      setStatus(t("tips.leadFormRequired"));
      return;
    }
    if (!email && !phone) {
      setStatus(t("tips.leadFormMissingContact"));
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus(t("tips.leadFormEmailInvalid"));
      return;
    }
    try {
      await apiPost("/leads/form", {
        brandId,
        companyName,
        companyNameEn: companyNameEn || undefined,
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
        requirement: requirement || undefined,
      });
      await onCreated();
    } catch (err: any) {
      setStatus(err.message || "Error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("notifications.leadForm")}</h2>
          <button onClick={onClose} className="text-xs text-muted-foreground">
            {t("buttons.close")}
          </button>
        </div>
        <form className="mt-4 space-y-3 text-sm" onSubmit={handleSubmit}>
          <Input label={<RequiredLabel text={t("fields.companyName")} />} value={companyName} onChange={setCompanyName} required />
          <Input label={t("fields.companyNameEn")} value={companyNameEn} onChange={setCompanyNameEn} />
          <Input label={<RequiredLabel text={t("fields.contactName")} />} value={name} onChange={setName} />
          <Input label={t("fields.email")} value={email} onChange={setEmail} type="email" />
          <Input label={t("fields.phone")} value={phone} onChange={setPhone} type="tel" />
          <TextArea label={<RequiredLabel text={t("fields.requirements")} />} value={requirement} onChange={setRequirement} rows={4} />
          <div className="flex items-center gap-2">
            <SubmitButton disabled={!companyName} label={t("buttons.createLead")} />
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-xl border border-input px-4 text-sm">
              {t("buttons.cancel")}
            </button>
          </div>
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({
  t,
  onClose,
  defaultEmail,
}: {
  t: (key: string) => string;
  onClose: () => void;
  defaultEmail: string;
}) {
  const [email, setEmail] = useState(defaultEmail || "admin@justright.ai");
  const [currentPassword, setCurrentPassword] = useState("ChangeMe123");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setStatus(t("tips.passwordMismatch"));
      return;
    }
    try {
      const result = await apiPost<{ accessToken: string }>("/auth/login", { email, password: currentPassword });
      await apiPost("/auth/change-password", { currentPassword, newPassword }, result.accessToken);
      setStatus("OK");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setStatus(err.message || "Error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("buttons.changePassword")}</h2>
          <button onClick={onClose} className="text-xs text-muted-foreground">
            {t("buttons.close")}
          </button>
        </div>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <Input label={t("fields.email")} value={email} onChange={setEmail} required />
          <PasswordField
            label={t("fields.currentPassword")}
            value={currentPassword}
            onChange={setCurrentPassword}
            showLabel={t("buttons.show")}
            hideLabel={t("buttons.hide")}
          />
          <PasswordField
            label={t("fields.newPassword")}
            value={newPassword}
            onChange={setNewPassword}
            showLabel={t("buttons.show")}
            hideLabel={t("buttons.hide")}
          />
          <PasswordField
            label={t("fields.confirmPassword")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            showLabel={t("buttons.show")}
            hideLabel={t("buttons.hide")}
          />
          <div className="flex items-center gap-2">
            <SubmitButton disabled={!email || !currentPassword || !newPassword || !confirmPassword} label={t("buttons.changePassword")} />
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-xl border border-input px-4 text-sm">
              {t("buttons.cancel")}
            </button>
          </div>
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </form>
      </div>
    </div>
  );
}

function LeadForm({
  brandId,
  onCreated,
  t,
  token,
  users,
  currentUserId,
  isManager,
}: {
  brandId: string;
  onCreated: () => void;
  t: (key: string) => string;
  token: string;
  users: User[];
  currentUserId?: string | null;
  isManager: boolean;
}) {
  const [companyName, setCompanyName] = useState("");
  const [companyNameEn, setCompanyNameEn] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("New");
  const [ownerId, setOwnerId] = useState(isManager ? "" : currentUserId || "");
  const [notes, setNotes] = useState("");
  const [contractAmount, setContractAmount] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!brandId) return;
    await apiPost(
      "/leads",
      {
        companyName,
        companyNameEn: companyNameEn || undefined,
        name,
        email,
        phone,
        notes: notes || undefined,
        status,
        ownerId: ownerId || undefined,
        contractAmount: contractAmount ? Number(contractAmount) : undefined,
      },
      token
    );
    setCompanyName("");
    setCompanyNameEn("");
    setName("");
    setEmail("");
    setPhone("");
    setOwnerId(isManager ? "" : currentUserId || "");
    setNotes("");
    setContractAmount("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Input label={t("fields.companyName")} value={companyName} onChange={setCompanyName} required />
      <Input label={t("fields.companyNameEn")} value={companyNameEn} onChange={setCompanyNameEn} />
      <Input label={t("fields.contactName")} value={name} onChange={setName} />
      <Input label={t("fields.email")} value={email} onChange={setEmail} />
      <Input label={t("fields.phone")} value={phone} onChange={setPhone} />
      {isManager ? (
        <Select
          label={t("fields.ownerId")}
          value={ownerId}
          onChange={setOwnerId}
          options={[
            { value: "", label: "-" },
            ...users.map((user) => ({ value: user.id, label: user.name })),
          ]}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("fields.ownerId")}：{users.find((user) => user.id === currentUserId)?.name || "-"}
        </p>
      )}
      <Select label={t("fields.status")} value={status} onChange={setStatus} options={leadStatusOptions(t)} />
      <TextArea label={t("fields.notes")} value={notes} onChange={setNotes} rows={4} />
      <Input label={t("fields.contractAmount")} value={contractAmount} onChange={setContractAmount} />
      <SubmitButton disabled={!brandId || !companyName} label={t("buttons.createLead")} />
    </form>
  );
}

function LeadActions({
  brandId,
  onCreated,
  t,
  users,
  isManager,
  unassignedLeads,
  duplicateCompanies,
  token,
}: {
  brandId: string;
  onCreated: () => void;
  t: (key: string) => string;
  users: User[];
  isManager: boolean;
  unassignedLeads: Lead[];
  duplicateCompanies: string[];
  token: string;
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  async function handleAssign(leadId: string) {
    const ownerId = assignments[leadId];
    if (!leadId || !ownerId) return;
    await apiPost(`/leads/${leadId}/assign`, { ownerId }, token);
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[leadId];
      return next;
    });
    onCreated();
  }

  async function handleMerge(companyName: string) {
    if (!brandId || !companyName) return;
    await apiPost(`/leads/merge`, { companyName }, token);
    onCreated();
  }

  return (
    <div className="mt-4 space-y-6 text-sm">
      {isManager ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("leads.unassigned")}</h3>
          {unassignedLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("tips.noUnassigned")}</p>
          ) : (
            <ul className="space-y-3">
              {unassignedLeads.map((lead) => (
                <li key={lead.id} className="rounded-xl border border-border/70 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{lead.companyName}</p>
                      <p className="text-xs text-muted-foreground">{lead.companyNameEn || ""}</p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                      {t(`status.${lead.status}`) || lead.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {lead.notes || t("leads.noNotes")}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                    <Select
                      label={t("fields.ownerId")}
                      value={assignments[lead.id] || ""}
                      onChange={(value) => setAssignments((prev) => ({ ...prev, [lead.id]: value }))}
                      options={[
                        { value: "", label: "--" },
                        ...users.map((user) => ({ value: user.id, label: user.name })),
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => handleAssign(lead.id)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-input px-4 text-sm"
                    >
                      {t("buttons.assign")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("tips.managerOnlyAssign")}</p>
      )}

      {isManager && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("leads.merge")}</h3>
          {duplicateCompanies.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("tips.noDuplicates")}</p>
          )}
          <ul className="space-y-2">
            {duplicateCompanies.map((company) => (
              <li key={company} className="flex items-center justify-between rounded-xl border border-border/80 px-3 py-2">
                <span className="text-sm">{company}</span>
                <button onClick={() => handleMerge(company)} className="text-xs text-primary underline">
                  {t("buttons.merge")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExpertForm({
  brandId,
  onCreated,
  t,
  token,
}: {
  brandId: string;
  onCreated: () => void;
  t: (key: string) => string;
  token: string;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [pricing, setPricing] = useState("");
  const [pricingCurrency, setPricingCurrency] = useState("CNY");
  const [pricingUnit, setPricingUnit] = useState("project");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!brandId) return;
    setStatus(null);
    try {
      await apiPost(
        "/experts",
        { name, country, specialties, pricing, pricingCurrency, pricingUnit, contactEmail, phone, notes },
        token
      );
      setName("");
      setCountry("");
      setSpecialties("");
      setPricing("");
      setPricingCurrency("CNY");
      setPricingUnit("project");
      setContactEmail("");
      setPhone("");
      setNotes("");
      onCreated();
    } catch (err: any) {
      setStatus(err.message || "Error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Input label={t("fields.userName")} value={name} onChange={setName} required />
      <Input label={t("fields.country")} value={country} onChange={setCountry} />
      <TextArea label={t("fields.specialties")} value={specialties} onChange={setSpecialties} rows={5} />
      <div className="grid gap-2 md:grid-cols-3">
        <Input label={t("fields.pricing")} value={pricing} onChange={setPricing} />
        <Select
          label={t("fields.pricingCurrency")}
          value={pricingCurrency}
          onChange={setPricingCurrency}
          options={[
            { value: "CNY", label: "CNY" },
            { value: "USD", label: "USD" },
            { value: "JPY", label: "JPY" },
            { value: "EUR", label: "EUR" },
            { value: "GBP", label: "GBP" },
          ]}
        />
        <Select
          label={t("fields.pricingUnit")}
          value={pricingUnit}
          onChange={setPricingUnit}
          options={[
            { value: "project", label: "Per Project" },
            { value: "hour", label: "Per Hour" },
            { value: "day", label: "Per Day" },
          ]}
        />
      </div>
      <Input label={t("fields.contactEmail")} value={contactEmail} onChange={setContactEmail} />
      <Input label={t("fields.phone")} value={phone} onChange={setPhone} />
      <TextArea label={t("fields.expertNotes")} value={notes} onChange={setNotes} rows={3} />
      <SubmitButton disabled={!brandId || !name} label={t("buttons.createExpert")} />
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </form>
  );
}

function ConsultingForm({
  brandId,
  onCreated,
  t,
  token,
  leads,
  experts,
}: {
  brandId: string;
  onCreated: () => void;
  t: (key: string) => string;
  token: string;
  leads: Lead[];
  experts: Expert[];
}) {
  const [leadId, setLeadId] = useState("");
  const [expertId, setExpertId] = useState("");
  const [status, setStatus] = useState("New");
  const [channel, setChannel] = useState("Email");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [requirements, setRequirements] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!brandId) return;
    await apiPost(
      "/consulting",
      {
        leadId,
        expertId: expertId || undefined,
        status,
        channel,
        price: price ? Number(price) : undefined,
        currency: currency || undefined,
        requirements: requirements || undefined,
        notes,
      },
      token
    );
    setLeadId("");
    setExpertId("");
    setPrice("");
    setCurrency("CNY");
    setRequirements("");
    setNotes("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Select
        label={t("fields.leadId")}
        value={leadId}
        onChange={setLeadId}
        options={[
          { value: "", label: "--" },
          ...leads.map((lead) => ({ value: lead.id, label: lead.companyName })),
        ]}
      />
      <Select
        label={t("fields.expertId")}
        value={expertId}
        onChange={setExpertId}
        options={[
          { value: "", label: "--" },
          ...experts.map((expert) => ({ value: expert.id, label: expert.name })),
        ]}
      />
      <Select
        label={t("fields.status")}
        value={status}
        onChange={setStatus}
        options={consultingStatusOptions(t)}
      />
      <Input label={t("fields.channel")} value={channel} onChange={setChannel} />
      <div className="grid gap-2 md:grid-cols-2">
        <Input label={t("fields.pricing")} value={price} onChange={setPrice} />
        <Select
          label={t("fields.pricingCurrency")}
          value={currency}
          onChange={setCurrency}
          options={[
            { value: "CNY", label: "CNY" },
            { value: "USD", label: "USD" },
            { value: "JPY", label: "JPY" },
            { value: "EUR", label: "EUR" },
            { value: "GBP", label: "GBP" },
          ]}
        />
      </div>
      <TextArea label={t("fields.requirements")} value={requirements} onChange={setRequirements} rows={4} />
      <TextArea label={t("fields.memo")} value={notes} onChange={setNotes} rows={3} />
      <SubmitButton disabled={!brandId || !leadId} label={t("buttons.createConsulting")} />
    </form>
  );
}

function BrandForm({
  onCreated,
  t,
  token,
}: {
  onCreated: () => void;
  t: (key: string) => string;
  token: string;
}) {
  const [name, setName] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await apiPost("/brands", { name }, token);
    setName("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Input label={t("fields.brandName")} value={name} onChange={setName} required />
      <SubmitButton disabled={!name} label={t("buttons.createBrand")} />
    </form>
  );
}

function TeamForm({
  brandId,
  onCreated,
  t,
  token,
  users,
}: {
  brandId: string;
  onCreated: () => void;
  t: (key: string) => string;
  token: string;
  users: User[];
}) {
  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!brandId) return;
    await apiPost("/teams", { name, leaderId: leaderId || undefined }, token);
    setName("");
    setLeaderId("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Input label={t("fields.teamName")} value={name} onChange={setName} required />
      <Select
        label={t("fields.teamLeader")}
        value={leaderId}
        onChange={setLeaderId}
        options={[
          { value: "", label: "--" },
          ...users.map((user) => ({ value: user.id, label: `${user.name} · ${user.role}` })),
        ]}
      />
      <SubmitButton disabled={!brandId || !name} label={t("buttons.createTeam")} />
    </form>
  );
}

function UserForm({
  brandId,
  onCreated,
  t,
  token,
  teams,
  users,
  positions,
}: {
  brandId: string;
  onCreated: () => void;
  t: (key: string) => string;
  token: string;
  teams: Team[];
  users: User[];
  positions: Position[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [teamId, setTeamId] = useState("");
  const [password, setPassword] = useState("");
  const [managerId, setManagerId] = useState("");
  const [positionId, setPositionId] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!brandId) return;
    await apiPost(
      "/users",
      {
        name,
        email,
        role,
        teamId: teamId || undefined,
        password: password || undefined,
        managerId: managerId || undefined,
        positionId: positionId || undefined,
      },
      token
    );
    setName("");
    setEmail("");
    setRole("member");
    setTeamId("");
    setPassword("");
    setManagerId("");
    setPositionId("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Input label={t("fields.userName")} value={name} onChange={setName} required />
      <Input label={t("fields.email")} value={email} onChange={setEmail} required />
      <Select
        label={t("fields.role")}
        value={role}
        onChange={setRole}
        options={[
          { value: "member", label: "member" },
          { value: "manager", label: "manager" },
        ]}
      />
      <Select
        label={t("admin.positions")}
        value={positionId}
        onChange={setPositionId}
        options={[
          { value: "", label: "--" },
          ...positions.map((pos) => ({ value: pos.id, label: pos.name })),
        ]}
      />
      <Select
        label={t("fields.teamId")}
        value={teamId}
        onChange={setTeamId}
        options={[
          { value: "", label: "--" },
          ...teams.map((team) => ({ value: team.id, label: team.name })),
        ]}
      />
      <Select
        label={t("fields.manager")}
        value={managerId}
        onChange={setManagerId}
        options={[
          { value: "", label: "--" },
          ...users.map((user) => ({ value: user.id, label: `${user.name} · ${user.role}` })),
        ]}
      />
      <PasswordField
        label={t("fields.password")}
        value={password}
        onChange={setPassword}
        showLabel={t("buttons.show")}
        hideLabel={t("buttons.hide")}
      />
      <SubmitButton disabled={!brandId || !name || !email || !role} label={t("buttons.createUser")} />
    </form>
  );
}

function ChangePasswordForm({ t, token }: { t: (key: string) => string; token: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setStatus(t("tips.passwordMismatch"));
      return;
    }
    await apiPost("/auth/change-password", { currentPassword, newPassword }, token);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <PasswordField
        label={t("fields.currentPassword")}
        value={currentPassword}
        onChange={setCurrentPassword}
        showLabel={t("buttons.show")}
        hideLabel={t("buttons.hide")}
      />
      <PasswordField
        label={t("fields.newPassword")}
        value={newPassword}
        onChange={setNewPassword}
        showLabel={t("buttons.show")}
        hideLabel={t("buttons.hide")}
      />
      <PasswordField
        label={t("fields.confirmPassword")}
        value={confirmPassword}
        onChange={setConfirmPassword}
        showLabel={t("buttons.show")}
        hideLabel={t("buttons.hide")}
      />
      <SubmitButton disabled={!currentPassword || !newPassword || !confirmPassword} label={t("buttons.changePassword")} />
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </form>
  );
}

function ResetPasswordForm({
  t,
  token,
  users,
}: {
  t: (key: string) => string;
  token: string;
  users: User[];
}) {
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    if (!userId || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setStatus(t("tips.passwordMismatch"));
      return;
    }
    await apiPost("/auth/reset-password", { userId, newPassword }, token);
    setUserId("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Select
        label={t("fields.userId")}
        value={userId}
        onChange={setUserId}
        options={[
          { value: "", label: "--" },
          ...users.map((user) => ({ value: user.id, label: `${user.name} · ${user.email}` })),
        ]}
      />
      <PasswordField
        label={t("fields.newPassword")}
        value={newPassword}
        onChange={setNewPassword}
        showLabel={t("buttons.show")}
        hideLabel={t("buttons.hide")}
      />
      <PasswordField
        label={t("fields.confirmPassword")}
        value={confirmPassword}
        onChange={setConfirmPassword}
        showLabel={t("buttons.show")}
        hideLabel={t("buttons.hide")}
      />
      <SubmitButton disabled={!userId || !newPassword || !confirmPassword} label={t("buttons.resetPassword")} />
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </form>
  );
}

function PositionForm({ onCreated, t, token }: { onCreated: () => void; t: (key: string) => string; token: string }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await apiPost(
      "/positions",
      { name, level: level ? Number(level) : undefined },
      token
    );
    setName("");
    setLevel("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Input label={t("fields.title")} value={name} onChange={setName} required />
      <Input label={t("fields.level")} value={level} onChange={setLevel} />
      <SubmitButton disabled={!name} label={t("buttons.createPosition")} />
    </form>
  );
}

function LogForm({
  brandId,
  onCreated,
  t,
  token,
}: {
  brandId: string;
  onCreated: () => void;
  t: (key: string) => string;
  token: string;
}) {
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [entityId, setEntityId] = useState("");
  const [actorId, setActorId] = useState("");
  const [payload, setPayload] = useState("{}");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!brandId) return;
    let parsedPayload: Record<string, any> | undefined = undefined;
    try {
      parsedPayload = payload.trim() ? JSON.parse(payload) : undefined;
    } catch {
      parsedPayload = { raw: payload };
    }
    await apiPost(
      "/logs",
      { action, entity, entityId, actorId, payload: parsedPayload },
      token
    );
    setAction("");
    setEntity("");
    setEntityId("");
    setActorId("");
    setPayload("{}");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Input label={t("fields.action")} value={action} onChange={setAction} required />
      <Input label={t("fields.entity")} value={entity} onChange={setEntity} required />
      <Input label={t("fields.entityId")} value={entityId} onChange={setEntityId} />
      <Input label={t("fields.actorId")} value={actorId} onChange={setActorId} />
      <TextArea label={t("fields.payload")} value={payload} onChange={setPayload} rows={4} />
      <SubmitButton disabled={!brandId || !action || !entity} label={t("buttons.writeLog")} />
    </form>
  );
}

function NotificationForm({
  brandId,
  onCreated,
  t,
  token,
}: {
  brandId: string;
  onCreated: () => void;
  t: (key: string) => string;
  token: string;
}) {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("InApp");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!brandId) return;
    await apiPost("/notifications", { userId, title, body, channel }, token);
    setUserId("");
    setTitle("");
    setBody("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
      <Input label={t("fields.userId")} value={userId} onChange={setUserId} required />
      <Input label={t("fields.title")} value={title} onChange={setTitle} required />
      <TextArea label={t("fields.body")} value={body} onChange={setBody} rows={4} />
      <Input label={t("fields.channel")} value={channel} onChange={setChannel} />
      <SubmitButton disabled={!brandId || !userId || !title || !body} label={t("buttons.sendNotification")} />
    </form>
  );
}

function ActivityForm({
  t,
  token,
  leadId,
  onCreated,
  canEdit,
}: {
  t: (key: string) => string;
  token: string;
  leadId: string;
  onCreated: () => void;
  canEdit: boolean;
}) {
  const [type, setType] = useState("Contacted");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    await apiPost(
      `/leads/${leadId}/activities`,
      {
        type,
        title,
        notes: notes || undefined,
        occurredAt: occurredAt || undefined,
      },
      token
    );
    setTitle("");
    setNotes("");
    setOccurredAt("");
    onCreated();
  }

  if (!canEdit) {
    return <p className="text-xs text-muted-foreground">{t("tips.noActivityPermission")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <h3 className="text-sm font-semibold">{t("leads.addActivity")}</h3>
      <Select label={t("fields.activityType")} value={type} onChange={setType} options={activityTypeOptions(t)} />
      <Input label={t("fields.activityTitle")} value={title} onChange={setTitle} required />
      <TextArea label={t("fields.activityNotes")} value={notes} onChange={setNotes} rows={3} />
      <Input label={t("fields.activityTime")} value={occurredAt} onChange={setOccurredAt} type="date" />
      <SubmitButton disabled={!title} label={t("leads.addActivity")} />
    </form>
  );
}

function ActivityList({ t, activities }: { t: (key: string) => string; activities: LeadActivity[] }) {
  if (activities.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("tips.noActivities")}</p>;
  }
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="rounded-xl border border-border/70 px-3 py-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium">{activity.title}</span>
            <span className="text-muted-foreground">
              {new Date(activity.occurredAt).toLocaleDateString()}
            </span>
          </div>
          <div className="mt-1 text-muted-foreground">
            {t(`activity.${activity.type}`)} · {activity.actorId.slice(0, 6)}
          </div>
          {activity.notes && <div className="mt-1 text-muted-foreground">{activity.notes}</div>}
        </div>
      ))}
    </div>
  );
}

function OrgTree({ users, positions }: { users: User[]; positions: Position[] }) {
  const byManager = users.reduce<Record<string, User[]>>((acc, user) => {
    const key = user.managerId || "root";
    acc[key] = acc[key] || [];
    acc[key].push(user);
    return acc;
  }, {});
  const posMap = new Map(positions.map((pos) => [pos.id, pos.name]));

  function renderNodes(managerId: string, depth: number) {
    const nodes = byManager[managerId] || [];
    return (
      <ul className="space-y-2">
        {nodes.map((user) => (
          <li key={user.id} className="rounded-xl border border-border/70 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span>
                {"—".repeat(depth)} {user.name} · {posMap.get(user.positionId || "") || user.title || user.role}
              </span>
              <span className="text-muted-foreground">{(byManager[user.id] || []).length}</span>
            </div>
            {renderNodes(user.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return renderNodes("root", 0);
}

function DashboardCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function leadStatusOptions(t: (key: string) => string) {
  return [
    { value: "New", label: "New" },
    { value: "Contacted", label: "Contacted" },
    { value: "Qualified", label: "Qualified" },
    { value: "Consulting", label: "Consulting" },
    { value: "Signed", label: "Signed" },
    { value: "Closed", label: "Closed" },
  ].map((item) => ({
    ...item,
    label: t(`status.${item.value}`) || item.label,
  }));
}

function consultingStatusOptions(t: (key: string) => string) {
  return ["New", "InProgress", "Completed", "Closed"].map((value) => ({
    value,
    label: t(`consultingStatus.${value}`) || value,
  }));
}

function activityTypeOptions(t: (key: string) => string) {
  return [
    "Contacted",
    "Meeting",
    "Negotiation",
    "Proposal",
    "Contract",
    "FollowUp",
    "CustomerClosed",
    "Other",
  ].map((type) => ({
    value: type,
    label: t(`activity.${type}`),
  }));
}

function formatAmount(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num);
}

function RequiredLabel({ text }: { text: string }) {
  return (
    <span>
      {text}
      <span className="ml-1 text-destructive">*</span>
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-xl border border-input bg-background px-3"
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  showLabel,
  hideLabel,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 flex-1 rounded-xl border border-input bg-background px-3"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-input"
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 3l18 18" />
              <path d="M10.5 10.5a2.5 2.5 0 003.5 3.5" />
              <path d="M9.9 4.2A10.5 10.5 0 0112 4c5 0 9 4 9 8a9.7 9.7 0 01-2.3 5.9" />
              <path d="M6.1 6.1A9.7 9.7 0 003 12c0 4 4 8 9 8a10.5 10.5 0 004.6-1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-xl border border-input bg-background px-3"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
  return (
    <button
      disabled={disabled}
      className="inline-flex h-9 min-w-[88px] items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
    >
      {label}
    </button>
  );
}
