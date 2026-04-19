import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import mandala from "@/assets/mandala.png";

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <img
        src={mandala}
        alt=""
        aria-hidden
        className="pointer-events-none fixed -top-40 -right-40 w-[600px] opacity-[0.06] animate-spin-slow"
      />
      <img
        src={mandala}
        alt=""
        aria-hidden
        className="pointer-events-none fixed -bottom-60 -left-40 w-[600px] opacity-[0.05] animate-spin-slow"
      />
      <Header />
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
