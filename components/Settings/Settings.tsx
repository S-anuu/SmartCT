"use client"

import SidebarLayout from "../SidebarLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Bell, Shield, HelpCircle, Info, ChevronRight, SettingsIcon } from "lucide-react"
import { useRouter } from "next/navigation"

const Settings = () => {
  const router = useRouter()

  const settingsCategories = [
    {
      title: "Account",
      description: "Manage your personal information and preferences",
      icon: User,
      path: "/settings/account",
      badge: null,
    },
  
    {
      title: "Privacy & Security",
      description: "Control your privacy settings and security options",
      icon: Shield,
      path: "/settings/privacyandsecurity",
      badge: null,
    },
    
    {
      title: "About",
      description: "Learn more about SmartCT and version information",
      icon: Info,
      path: "/settings/about",
      badge: null,
    },
  ]

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <SettingsIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
            
          </div>

          {/* Settings Categories */}
          <div className="grid gap-4">
            {settingsCategories.map((category) => (
              <Card
                key={category.path}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => router.push(category.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <category.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                          {category.badge && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">{category.badge}</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{category.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Quick Actions</CardTitle>
              <CardDescription>Common settings and actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-12 justify-start border-gray-200 hover:bg-gray-50"
                  onClick={() => router.push("/settings/account")}
                >
                  <User className="h-4 w-4 mr-3" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  className="h-12 justify-start border-gray-200 hover:bg-gray-50"
                  onClick={() => router.push("/settings/about")}
                >
                  <HelpCircle className="h-4 w-4 mr-3" />
                  Get Help
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  )
}

export default Settings
