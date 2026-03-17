import { useState } from "react";
import { clsx } from "clsx";

const chips = ["SaaS", "出海", "电商", "品牌", "AI"];

export default function App() {
  const [activeTab, setActiveTab] = useState("线索");
  const [dark, setDark] = useState(false);

  return (
    <div className={clsx("min-h-screen", dark && "dark")}>
      <div className="min-h-screen bg-background text-foreground">
        <Header dark={dark} setDark={setDark} />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-6">
          <Hero />
          <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="space-y-6">
              <Stats />
              <div className="grid gap-6 lg:grid-cols-2">
                <LeadForm />
                <ActivityPanel />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <LeadTable />
                <CardShowcase />
              </div>
              <ComponentsShowcase />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({
  dark,
  setDark,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-semibold">
            JR
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Just Right CRM</div>
            <div className="text-lg font-semibold">UI Demo & Spec</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-full border px-3 py-1 text-sm">中文</button>
          <button className="rounded-full border px-3 py-1 text-sm">EN</button>
          <button
            className="btn-ripple rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => setDark(!dark)}
          >
            {dark ? "浅色" : "深色"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="card-hover relative overflow-hidden rounded-2xl border bg-card p-6">
      <div className="absolute -right-20 -top-20 size-60 rounded-full bg-gradient-to-br from-[#7F56D9] to-[#17B26A] opacity-20 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 size-52 rounded-full bg-gradient-to-br from-[#7F56D9] to-[#17B26A] opacity-10 blur-3xl" />
      <div className="relative">
        <p className="text-sm text-muted-foreground">设计基准</p>
        <h1 className="mt-2 text-2xl font-semibold">
          以 Just Right 风格为蓝本的 CRM 组件展示
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          这是一个仅用于 UI 规范确认的 Demo。确认后所有 CRM
          页面按照此风格开发，包含移动端 H5 自适配。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border bg-secondary px-3 py-1 text-xs text-secondary-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const items = ["线索", "客户", "商机", "跟进", "轻咨询", "专家库"];
  return (
    <aside className="hide-mobile rounded-2xl border bg-card p-3">
      <div className="text-xs text-muted-foreground">导航</div>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <button
            key={item}
            className={clsx(
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm",
              activeTab === item
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            )}
            onClick={() => setActiveTab(item)}
          >
            {item}
            <span className="text-xs opacity-70">↗</span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-xl border p-3">
        <div className="text-xs text-muted-foreground">本周进度</div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-2/3 bg-primary" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">线索处理完成 12/18</p>
      </div>
    </aside>
  );
}

function Stats() {
  const cards = [
    { label: "本周新线索", value: "128", trend: "+12%" },
    { label: "已评估", value: "76", trend: "+8%" },
    { label: "轻咨询", value: "9", trend: "+2" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="card-hover rounded-2xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">{c.label}</div>
          <div className="mt-2 text-2xl font-semibold">{c.value}</div>
          <div className="mt-1 text-xs text-emerald-600">{c.trend}</div>
        </div>
      ))}
    </div>
  );
}

function LeadForm() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">快速录入线索</h3>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
          手工录入
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        <input className="input-focus rounded-xl border bg-background px-3 py-2 text-sm" placeholder="公司名称" />
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input-focus rounded-xl border bg-background px-3 py-2 text-sm" placeholder="联系人" />
          <input className="input-focus rounded-xl border bg-background px-3 py-2 text-sm" placeholder="邮箱" />
        </div>
        <textarea className="input-focus min-h-[88px] rounded-xl border bg-background px-3 py-2 text-sm" placeholder="需求描述" />
      </div>
      <div className="mt-4 flex gap-2">
        <button className="btn-ripple rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">提交线索</button>
        <button className="rounded-xl border px-4 py-2 text-sm">保存草稿</button>
      </div>
    </div>
  );
}

function ActivityPanel() {
  const items = [
    { title: "Naver 市场咨询", status: "轻咨询" },
    { title: "电子产品入关需求", status: "评估中" },
    { title: "美国社媒推广", status: "待分配" },
  ];
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">最新动态</h3>
        <button className="text-xs text-muted-foreground">查看全部</button>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((i) => (
          <div key={i.title} className="flex items-center justify-between rounded-xl border bg-background px-3 py-2">
            <div>
              <div className="text-sm font-medium">{i.title}</div>
              <div className="text-xs text-muted-foreground">Just Right · 3分钟前</div>
            </div>
            <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">{i.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadTable() {
  const rows = [
    { company: "BlueWave", score: 86, owner: "Eric", status: "Qualified" },
    { company: "Shoreline", score: 72, owner: "Mia", status: "Contacted" },
    { company: "Sunbird", score: 58, owner: "Leo", status: "New" },
  ];
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">线索列表</h3>
        <div className="flex gap-2">
          <button className="rounded-xl border px-3 py-1 text-sm">筛选</button>
          <button className="rounded-xl border px-3 py-1 text-sm">导出</button>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="px-3 py-2">公司</th>
              <th className="px-3 py-2">评分</th>
              <th className="px-3 py-2">负责人</th>
              <th className="px-3 py-2">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.company} className="border-t">
                <td className="px-3 py-2">{r.company}</td>
                <td className="px-3 py-2">{r.score}</td>
                <td className="px-3 py-2">{r.owner}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CardShowcase() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="text-lg font-semibold">轻咨询卡片</h3>
      <div className="mt-4 grid gap-3">
        <div className="card-hover rounded-xl border bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">英国电子产品入关</div>
            <span className="rounded-full bg-secondary px-2 py-1 text-xs">进行中</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">专家：Amelia · 预估交付 24h</p>
          <div className="mt-3 flex gap-2">
            <button className="rounded-xl border px-3 py-1 text-xs">查看记录</button>
            <button className="btn-ripple rounded-xl bg-primary px-3 py-1 text-xs text-primary-foreground">
              发送提醒
            </button>
          </div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <div className="text-sm font-semibold">美国社媒推广策略</div>
          <p className="mt-2 text-xs text-muted-foreground">等待指派专家</p>
        </div>
      </div>
    </div>
  );
}

function ComponentsShowcase() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="text-lg font-semibold">基础组件规范</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-background p-3">
          <div className="text-xs text-muted-foreground">按钮</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn-ripple rounded-xl bg-primary px-3 py-1 text-xs text-primary-foreground">Primary</button>
            <button className="rounded-xl border px-3 py-1 text-xs">Secondary</button>
            <button className="rounded-xl bg-secondary px-3 py-1 text-xs">Ghost</button>
          </div>
        </div>
        <div className="rounded-xl border bg-background p-3">
          <div className="text-xs text-muted-foreground">输入框</div>
          <input className="input-focus mt-2 w-full rounded-xl border bg-background px-3 py-2 text-xs" placeholder="Search..." />
        </div>
        <div className="rounded-xl border bg-background p-3">
          <div className="text-xs text-muted-foreground">标签与状态</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-secondary px-2 py-1 text-xs">New</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-xs">Qualified</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-xs">Converted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
