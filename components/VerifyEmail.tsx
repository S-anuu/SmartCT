"use client"

import { useEffect } from "react" 
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

const [otp, setOtp] = useState("")


const VerifyEmailPage = () => {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()


  useEffect(() => {
    const storedEmail = localStorage.getItem("pendingEmail")
    if (storedEmail) setEmail(storedEmail)
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })


      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || "Invalid code")
      } else {
        setSuccess("Email verified successfully! You can now log in.")
        setTimeout(() => {
          router.push("/") // Redirect to login
        }, 2000)
      }
    } catch (err) {
      setError("Network error or server unreachable")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-xl">
        <h2 className="text-2xl font-bold text-center">Verify Your Email</h2>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 4-digit code"
              maxLength={4}
              required
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

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default VerifyEmailPage
