import { use } from "react"
import ResetPassword from "@/components/ResetPassword"

interface Props {
  params: Promise<{ token: string }>
}

export default function ResetPasswordPage({ params }: Props) {
  const { token } = use(params) // ✅ unwrap promise

  return <ResetPassword token={token} />
}

