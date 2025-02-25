import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold text-white mb-8">Sell Me The Answer</h1>
        <div className="space-x-4">
          <Button asChild variant="default" size="lg">
            <Link href="/admin">Admin Control Panel</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/presentation" target="_blank">
              Launch Presentation
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

