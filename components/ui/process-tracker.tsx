import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Circle } from "lucide-react"

interface ProcessStep {
  label: string
  status: "completed" | "current" | "pending"
  description?: string
}

interface ProcessTrackerProps {
  steps: ProcessStep[]
  className?: string
}

export function ProcessTracker({ steps, className }: ProcessTrackerProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center flex-1">
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    step.status === "completed" &&
                      "bg-green-500 border-green-500 text-white",
                    step.status === "current" &&
                      "bg-blue-500 border-blue-500 text-white animate-pulse",
                    step.status === "pending" &&
                      "bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-700"
                  )}
                >
                  {step.status === "completed" ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Circle
                      className={cn(
                        "w-5 h-5",
                        step.status === "current" && "fill-current"
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.status === "completed" && "text-green-600 dark:text-green-400",
                    step.status === "current" && "text-blue-600 dark:text-blue-400",
                    step.status === "pending" && "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 -mt-8">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    steps[index + 1].status === "completed" ||
                      steps[index].status === "completed"
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-700"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

