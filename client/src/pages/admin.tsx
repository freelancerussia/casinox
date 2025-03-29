import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import AdminPanel from "@/components/admin/AdminPanel";
import { AppState } from "@/App";
import { useLocation } from "wouter";

interface AdminPageProps {
  appState: AppState;
}

export default function AdminPage({ appState }: AdminPageProps) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = appState;

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null; // This will never render because of the redirect
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-primary">
      <Sidebar appState={appState} />
      
      <main className="flex-grow">
        <TopBar title="Admin Panel" />
        
        <div className="p-4 md:p-6">
          <AdminPanel appState={appState} />
        </div>
      </main>
    </div>
  );
}
