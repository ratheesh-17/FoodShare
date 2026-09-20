import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F0FDF9" }}>
      <Sidebar />
      <main style={{ marginLeft: 248, flex: 1, padding: "28px 32px", minHeight: "100vh", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
