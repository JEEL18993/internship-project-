import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const data = window.__SHOP_DATA__ || { title: "ShopEase", session: null, body: "" };

function Icon({ name }) {
  const paths = {
    bag: <><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const session = data.session;
  const isAdmin = session?.role === "admin";
  const isClient = session?.role === "client";
  const path = window.location.pathname;
  const link = (href, label, extra = "") => (
    <a className={`${path === href ? "active" : ""} ${extra}`} href={href}>{label}</a>
  );
  return <>
    <div className="announcement">Free delivery on orders over ₹999 <span>•</span> Easy returns within 7 days</div>
    <header className="topbar">
      <a className="brand" href="/" aria-label="ShopEase home"><span>Shop</span>Ease<i>.</i></a>
      <button className="mobile-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><Icon name={open ? "close" : "menu"}/></button>
      <nav className={open ? "open" : ""}>
        {isAdmin && <>{link("/admin/dashboard", "Dashboard")}{link("/admin/products", "Products")}{link("/admin/orders", "Orders")}</>}
        {isClient && <>{link("/products", "Shop")}{link("/orders", "My orders")}{link("/cart", <><Icon name="bag"/> Cart</>, "nav-cart")}</>}
        {!session && <>{link("/products", "Shop")}{link("/login", "Sign in")}{link("/register", "Create account", "nav-cta")}{link("/admin/login", "Admin")}</>}
        {session && <><span className="user-chip"><Icon name="user"/>{session.name || "Admin"}</span>{link("/logout", "Log out", "nav-cta")}</>}
      </nav>
    </header>
  </>;
}

function App() {
  useEffect(() => {
    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("submit", () => form.classList.add("is-submitting"));
    });
  }, []);
  return <div className="app-shell">
    <Header />
    <main dangerouslySetInnerHTML={{ __html: data.body }} />
    <footer>
      <a className="brand footer-brand" href="/"><span>Shop</span>Ease<i>.</i></a>
      <p>Everything you love, thoughtfully selected.</p>
      <small>© {new Date().getFullYear()} ShopEase. Built by Jeel Gohel.</small>
    </footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
