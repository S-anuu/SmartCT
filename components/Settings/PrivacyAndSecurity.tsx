"use client"

import React, { useState } from "react"
import SidebarLayout from "../SidebarLayout"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Lock,
  Shield,
  Eye,
  EyeOff,
  Trash,
} from "lucide-react"

const PrivacyAndSecurity = () => {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.")
      return
    }

    setLoading(true)
    setMessage("")
    const token = localStorage.getItem("token")
    console.log(process.env);
    try {
      const response = await fetch(`http://localhost:5000/api/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const result = await response.json()
      console.log(result);

      if (response.ok) {
        setMessage("✅ Password updated successfully.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setMessage(result.error || "❌ Failed to update password.")
      }
    } catch (error) {
      setMessage("❌ Server error.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Card className="border-0 shadow-lg max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              Privacy & Security
            </CardTitle>
            <CardDescription className="text-gray-600">
              Manage your account’s privacy and security settings.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-10">
            {/* Change Password */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Update your login password securely.
              </p>
              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      placeholder="********"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-gray-500"
                      onClick={() => setShowCurrent((prev) => !prev)}
                    >
                      {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      placeholder="********"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-gray-500"
                      onClick={() => setShowNew((prev) => !prev)}
                    >
                      {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="********"
                      value={confirmPassword}

                      
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-gray-500"
                      onClick={() => setShowConfirm((prev) => !prev)}
                    >
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button onClick={handleChangePassword} disabled={loading}>
                  {loading ? "Updating..." : "Change Password"}
                </Button>

                {message && <p className="text-sm text-blue-600 pt-2">{message}</p>}
              </div>
            </section>

            {/* Delete Account */}
            <section className="pt-4 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600">
                <Trash className="h-5 w-5" />
                Delete Account
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button variant="destructive">Delete My Account</Button>
            </section>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  )
}

export default PrivacyAndSecurity
