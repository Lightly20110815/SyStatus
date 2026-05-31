import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", label: "记录", end: true },
  { to: "/history", label: "历史" },
  { to: "/stats", label: "统计" },
  { to: "/settings", label: "设置" },
];

// 应用骨架：安静的顶栏 + 居中内容区。桌面与移动端通用。
export default function AppShell() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand">
            Sy<span className="brand__dot">·</span>State
          </span>
          <nav className="app-nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
