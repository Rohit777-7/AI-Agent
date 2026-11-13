import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiLogOut, FiMenu, FiX } from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import logo from "../assets/logo-mark.png";
import { ServerUrl } from "../App";

const NAV_LINKS = [
  { to: "/", label: "Overview", end: true },
  { to: "/builder", label: "Builder" },
  { to: "/billing", label: "Billing" },
];

const linkClass = ({ isActive }) =>
  `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-zinc-100 text-zinc-950"
      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
  }`;

function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Blend into the page at the top; only show the glass bar once content scrolls under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(
        ServerUrl + "/api/auth/logout",
        {},
        {
          withCredentials: true,
        },
      );

      setUser(null);
      toast.success("Logout Successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Logout Failed");
      console.log(error);
    }
  };

  const initial = user?.name?.charAt(0).toUpperCase();

  return (
    <header
      className={`sticky top-0 z-50 -mb-16 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || menuOpen
          ? "bg-canvas/80 backdrop-blur-xl border-zinc-200/80"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-6">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5"
        >
          <img
            src={logo}
            alt=""
            className="w-8 h-8 rounded-full shadow-[0_0_24px_-4px_rgba(56,189,248,0.6)]"
          />

          <span className="font-bold text-lg tracking-tight text-zinc-950">
            Shifra <span className="text-gradient">AI</span>
          </span>
        </button>

        {/* Links */}
        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={linkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Account */}
        {user && (
          <div className="hidden md:flex items-center gap-3 pl-1.5 pr-1.5 py-1.5 rounded-full border border-zinc-200 bg-white">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-emerald-400 text-white text-sm flex items-center justify-center font-semibold">
              {initial}
            </div>

            <div className="max-w-[150px] leading-tight">
              <p className="text-[13px] font-semibold text-zinc-900 truncate">
                {user?.name}
              </p>

              <p className="text-[11px] text-zinc-500 truncate">
                {user?.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-rose-500 hover:bg-zinc-100 transition-colors"
            >
              <FiLogOut size={15} />
            </button>
          </div>
        )}

        {user && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-200 text-zinc-700"
          >
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="md:hidden px-4 pb-4">
          <div className="surface p-3">
            <div className="flex items-center gap-3 p-3 border-b border-zinc-200/80">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-emerald-400 text-white flex items-center justify-center font-semibold">
                {initial}
              </div>

              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-zinc-900 truncate">
                  {user?.name}
                </p>

                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1 py-3">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <button
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/15 transition-colors text-sm font-medium"
            >
              <FiLogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
