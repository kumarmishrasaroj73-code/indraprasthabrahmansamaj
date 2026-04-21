import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedAdmin } from "@/components/ProtectedAdmin";
import Home from "./pages/Home";
import About from "./pages/About";
import Announcements from "./pages/Announcements";
import Notices from "./pages/Notices";
import Donate from "./pages/Donate";
import Directory from "./pages/Directory";
import Matrimonial from "./pages/Matrimonial";
import Auth from "./pages/Auth";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminIntro from "./pages/admin/AdminIntro";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminMatrimonial from "./pages/admin/AdminMatrimonial";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/donate" element={<Donate />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/matrimonial" element={<Matrimonial />} />
            </Route>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/admin"
              element={
                <ProtectedAdmin>
                  <AdminLayout />
                </ProtectedAdmin>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="notices" element={<AdminNotices />} />
              <Route path="intro" element={<AdminIntro />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="matrimonial" element={<AdminMatrimonial />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
