/**
 * Subscription success page
 * Shown after successful Polar checkout
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SubscriptionSuccessPage() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
            <svg
              className="w-10 h-10 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Your New Plan!
          </h1>
          <p className="text-muted-foreground text-lg">
            Your subscription has been successfully activated. You now have access to all the features in your selected plan.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            What&apos;s Next?
          </h2>
          <ul className="text-left space-y-3 text-muted-foreground">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Your plan is now active and ready to use</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>You can manage your subscription anytime from your account settings</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>A confirmation email has been sent to your registered email address</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <a
            href="/"
            className="block w-full py-3 px-6 text-white bg-red-700 dark:bg-red-600 hover:bg-red-800 dark:hover:bg-red-700 rounded-md font-medium transition-colors"
          >
            Start Using Rōmy
          </a>
          <a
            href="/pricing"
            className="block w-full py-3 px-6 text-foreground bg-transparent hover:bg-muted border border-border rounded-md font-medium transition-colors"
          >
            View Your Plan Details
          </a>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          Need help? Contact us at{" "}
          <a href="mailto:support@romy.chat" className="text-red-600 dark:text-red-500 hover:underline">
            support@romy.chat
          </a>
        </p>
      </div>
    </div>
  );
}