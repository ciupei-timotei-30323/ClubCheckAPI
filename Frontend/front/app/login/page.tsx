import { BackToHomeButton } from "@/components/back-to-home-button"
import { LoginForm } from "@/components/login-form"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col p-6 md:p-10">
      <div>
        <BackToHomeButton className="-ml-2.5" />
      </div>

      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
