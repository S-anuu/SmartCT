import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SmartCT - AI-Powered Abdominal Trauma Detection",
  description: "Advanced CT scan analysis for abdominal trauma detection using artificial intelligence",
  generator: 'v0.dev',
  icons: {
    icon: [
      {
        url: "/smartct-logo.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/smartct-logo.png",
        type: "image/png",
        sizes: "64x64",
      },
    ],
    shortcut: "/smartct-logo.png",
    apple: [
      {
        url: "/smartct-logo.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}