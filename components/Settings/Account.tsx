"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import SidebarLayout from "../SidebarLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, User, Mail, Phone, MapPin, Camera, Save, CheckCircle } from "lucide-react"

interface UserData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  department?: string;
  title?: string;
  profilePic?: string;
  [key: string]: any;
}

const Account = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    profilePic: "",
  })

  const [previewPic, setPreviewPic] = useState("")
  const [userInfo, setUserInfo] = useState<UserData | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetching(true)
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const res = await fetch("http://localhost:5000/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store'
        })

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login")
            return
          }
          throw new Error(`Failed to fetch profile (HTTP ${res.status})`)
        }

        const data: UserData = await res.json()
        setUserInfo(data)
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone || "",
          title: data.title || "",
          profilePic: data.profilePic || "",
        })
        setPreviewPic(data.profilePic || "")
      } catch (err: any) {
        console.error("Error fetching user profile:", err)
        setError(err.message || "Failed to load profile")
      } finally {
        setIsFetching(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    const token = localStorage.getItem("token")
    
    if (!token) {
      setError("No authentication token found")
      setIsLoading(false)
      return
    }

    try {
      // Validate required fields
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        throw new Error("First name, last name, and email are required")
      }

      const res = await fetch("http://localhost:5000/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update profile")
      }

      const updatedUser: UserData = await res.json()
      setUserInfo(updatedUser)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err: any) {
      console.error("Failed to update profile:", err)
      setError(err.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      setError("File size exceeds 2MB limit")
      return
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError("Only JPG/PNG files are allowed")
      return
    }

    const form = new FormData()
    form.append("profilePic", file)

    const token = localStorage.getItem("token")
    if (!token) {
      setError("No authentication token found")
      return
    }

    try {
      const res = await fetch("http://localhost:5000/api/users/uploadProfilePic", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Upload failed")
      }

      const data = await res.json()
      if (data.url) {
        setFormData((prev) => ({ ...prev, profilePic: data.url }))
        setPreviewPic(data.url)
      }
    } catch (err: any) {
      console.error("Upload failed", err)
      setError(err.message || "Profile picture upload failed")
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  if (isFetching) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Account Settings</h1>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {showSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your account information has been updated successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Picture */}
          <Card className="border-0 shadow-lg">
            <CardContent>
              <div className="flex items-center space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage 
                    src={previewPic || "/placeholder.svg"} 
                    alt={`${formData.firstName} ${formData.lastName}`}
                  />
                  <AvatarFallback className="text-2xl">
                    {formData.firstName?.[0] || "U"}
                    {formData.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <Button 
                    onClick={triggerFileInput} 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isLoading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                  
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              
            </CardContent>
          </Card>

          
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}

export default Account