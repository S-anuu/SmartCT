"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  User,
  LogOut,
  UserPlus,
  ChevronDown,
  Bell,
  Cog,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"

interface AdminSidebarLayoutProps {
  children: React.ReactNode
}

const AdminSidebarLayout = ({ children }: AdminSidebarLayoutProps) => {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState(3)
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // System alerts data (same as in dashboard)
  const [systemAlerts] = useState([
    {
      id: 1,
      type: "warning",
      title: "High Storage Usage",
      message: "Storage is at 78% capacity. Consider archiving old scans.",
      time: "1 hour ago",
    },
    {
      id: 2,
      type: "info",
      title: "Model Update Available",
      message: "New AI model version 2.1.3 is available for deployment.",
      time: "3 hours ago",
    },
  ])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    router.push("/")
  }

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
      active: pathname === "/admin/dashboard",
    },
    {
      title: "User Management",
      icon: Users,
      path: "/admin/users",
      active: pathname === "/admin/users",
    },
    
    {
      title: "AI Model",
      icon: Cog,
      path: "/admin/change-model",
      active: pathname === "/admin/change-model",
    },
  ]

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const AppSidebar = () => (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Cog className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">SmartCT</h2>
            
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.active}
                    className="w-full justify-start px-4 py-3 text-left hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 data-[active=true]:font-semibold"
                  >
                    <button onClick={() => router.push(item.path)} className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </div>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-4 py-3 h-auto hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.firstName || user?.name || "Admin"}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="lg:hidden" />
                <Badge className="bg-blue-100 text-blue-800">Admin Mode</Badge>
              </div>
              
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default AdminSidebarLayout 