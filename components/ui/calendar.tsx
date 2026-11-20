"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 sm:p-3 w-full flex justify-center", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4 relative w-full justify-center",
        month: "flex flex-col gap-3 w-full items-center",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-semibold text-slate-800",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white p-0 opacity-70 hover:opacity-100 absolute left-1 shadow-xs border-slate-200"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white p-0 opacity-70 hover:opacity-100 absolute right-1 shadow-xs border-slate-200"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weeks: "flex flex-col gap-y-1.5 mt-2 w-full items-center",
        weekdays: "flex w-full justify-between max-w-[17.5rem]",
        weekday:
          "text-slate-500 rounded-md w-8 sm:w-9 font-medium text-[0.75rem] sm:text-[0.8rem] text-center",
        week: "flex w-full mt-1 justify-between max-w-[17.5rem]",
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md"
            : "[&:has([aria-selected])]:rounded-md",
          "[&[data-selected=true]_button]:!bg-emerald-600 [&[data-selected=true]_button]:!text-white [&[data-selected=true]_button]:!font-bold [&[data-selected=true]_button]:rounded-md [&[data-selected=true]_button]:shadow-sm [&[data-selected=true]_button]:hover:!bg-emerald-700",
          "[&[aria-selected=true]_button]:!bg-emerald-600 [&[aria-selected=true]_button]:!text-white [&[aria-selected=true]_button]:!font-bold [&[aria-selected=true]_button]:rounded-md [&[aria-selected=true]_button]:shadow-sm [&[aria-selected=true]_button]:hover:!bg-emerald-700"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal transition-colors flex items-center justify-center rounded-md hover:bg-emerald-50 hover:text-emerald-800",
          "[td[data-selected=true]_&]:!bg-emerald-600 [td[data-selected=true]_&]:!text-white [td[data-selected=true]_&]:!font-bold [td[data-selected=true]_&]:shadow-sm [td[data-selected=true]_&]:hover:!bg-emerald-700",
          "[td[aria-selected=true]_&]:!bg-emerald-600 [td[aria-selected=true]_&]:!text-white [td[aria-selected=true]_&]:!font-bold [td[aria-selected=true]_&]:shadow-sm [td[aria-selected=true]_&]:hover:!bg-emerald-700"
        ),
        selected:
          "!bg-emerald-600 !text-white font-bold rounded-md shadow-sm [&_button]:!bg-emerald-600 [&_button]:!text-white [&_button]:!font-bold [&_button]:rounded-md",
        today:
          "[&:not([data-selected=true])_button]:text-emerald-700 [&:not([data-selected=true])_button]:font-bold [&:not([data-selected=true])_button]:border [&:not([data-selected=true])_button]:border-emerald-300 rounded-md",
        outside:
          "text-slate-400 opacity-40 aria-selected:bg-emerald-100/50 aria-selected:text-slate-400 aria-selected:opacity-30",
        disabled: "text-slate-300 opacity-40 cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <ChevronLeft className="h-4 w-4" />
          if (orientation === "right") return <ChevronRight className="h-4 w-4" />
          if (orientation === "up") return <ChevronUp className="h-4 w-4" />
          return <ChevronDown className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
