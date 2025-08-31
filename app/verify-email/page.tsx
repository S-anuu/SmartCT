"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"

const VerifyEmail = () => {
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    const savedEmail = localStorage.getItem("pendingEmail")
    if (savedEmail) setEmail(savedEmail)
    else router.push("/signup")
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email,otp }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Verification failed")
      } else {
        setSuccess("Verification successful! You can now log in.")
        localStorage.removeItem("pendingEmail")
        setTimeout(() => router.push("/"), 2000)
      }
    } catch (err) {
      setError("Server error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full space-y-6 border p-8 shadow-xl rounded-xl">
        <h1 className="text-2xl font-bold text-center">Verify Your Email</h1>
        <p className="text-sm text-gray-600 text-center">
          We've sent a 4-digit code to your email <strong>{email}</strong>. Enter it below to verify your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Enter 4-digit code</Label>
            <Input
              id="otp"
              maxLength={4}
              pattern="[0-9]{4}"
              required
              placeholder="1234"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="default">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default VerifyEmail
