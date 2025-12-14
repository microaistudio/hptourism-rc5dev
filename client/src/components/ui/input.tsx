import * as React from "react"

import { cn } from "@/lib/utils"

type CharacterRestriction = "alpha" | "alpha-space" | "numeric"

const restrictionRegexMap: Record<CharacterRestriction, RegExp> = {
  alpha: /[^A-Za-z]/g,
  "alpha-space": /[^A-Za-z\s]/g,
  numeric: /\D/g,
}

const restrictionPatternMap: Record<CharacterRestriction, string> = {
  alpha: "[A-Za-z]*",
  "alpha-space": "[A-Za-z ]*",
  numeric: "\\d*",
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  characterRestriction?: CharacterRestriction
  onChange?: React.ChangeEventHandler<HTMLInputElement>
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = "text",
    characterRestriction,
    onChange,
    inputMode,
    pattern,
    value,
    defaultValue,
    ...props
  }, ref) => {
    const sanitizeValue = (value: string) => {
      if (!characterRestriction) return value
      return value.replace(restrictionRegexMap[characterRestriction], "")
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (characterRestriction) {
        const sanitized = sanitizeValue(event.target.value)
        if (sanitized !== event.target.value) {
          event.target.value = sanitized
        }
      }
      onChange?.(event)
    }

    const resolvedInputMode =
      inputMode ?? (characterRestriction === "numeric" ? "numeric" : undefined)
    const resolvedPattern =
      pattern ?? (characterRestriction ? restrictionPatternMap[characterRestriction] : undefined)

    const resolvedValue =
      typeof value === "string" && characterRestriction ? sanitizeValue(value) : value
    const resolvedDefaultValue =
      typeof defaultValue === "string" && characterRestriction ? sanitizeValue(defaultValue) : defaultValue

    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        inputMode={resolvedInputMode}
        pattern={resolvedPattern}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...(value !== undefined ? { value: resolvedValue as typeof value } : {})}
        {...(defaultValue !== undefined ? { defaultValue: resolvedDefaultValue as typeof defaultValue } : {})}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
