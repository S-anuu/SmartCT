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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Home,
  Upload,
  FileText,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Activity,
} from "lucide-react"


interface SidebarLayoutProps {
  children: React.ReactNode
}

const SidebarLayout = ({ children }: SidebarLayoutProps) => {
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (token && userData) {
      setUser(JSON.parse(userData))
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    setIsAuthenticated(false)
    setUser(null)
    router.push("/")
  }

  const menuItems = isAuthenticated
    ? [
        {
          title: "Dashboard",
          icon: Home,
          path: "/dashboard",
          active: pathname === "/dashboard",
        },
        {
          title: "Upload Scan",
          icon: Upload,
          path: "/upload",
          active: pathname === "/upload",
        },
        {
          title: "View Results",
          icon: FileText,
          path: "/viewresults",
          active: pathname === "/viewresults",
        },
        {
          title: "Settings",
          icon: Settings,
          path: "/settings/settings",
          active: pathname.startsWith("/settings/settings"),
        },
      ]
    : [
       
        {
          title: "Sign Up",
          icon: User,
          path: "/signup",
          active: pathname === "/signup",
        },
        {
          title: "Upload Scan",
          icon: Upload,
          path: "/login",
          active: pathname === "/login",
        },
      ]

  const AppSidebar = () => (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">SmartCT</h2>
            <p className="text-sm text-gray-500">AI Trauma Detection</p>
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
                    <button
                      onClick={() => router.push(item.path)}
                      className="flex items-center space-x-3 w-full text-left"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-200">
        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-4 py-3 h-auto hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{user.firstName || user.name || "User"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
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
        ) : (
          <Button onClick={() => router.push("/login")} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <User className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex-1" />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default SidebarLayout 