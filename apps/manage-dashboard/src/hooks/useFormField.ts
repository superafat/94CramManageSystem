import { useCallback } from 'react'
import { UseFormReturn } from './useForm'

export interface UseFormFieldReturn<T = string> {
  value: T
  error: string | undefined
  touched: boolean
  dirty: boolean

  // Input props to spread on input elements
  inputProps: {
    value: T
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onBlur: () => void
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }

  // Helper to get error message ID for aria-describedby
  errorId: string

  // Manually set value
  setValue: (value: T) => void

  // Manually set error
  setError: (error: string) => void
}

/**
 * Hook for individual form field
 * Provides everything needed to bind an input and show error messages
 */
export function useFormField<T extends object, K extends keyof T>(
  form: UseFormReturn<T>,
  fieldName: K
): UseFormFieldReturn<T[K]> {
  const value = form.values[fieldName]
  const error = form.errors[fieldName]
  const touched = form.touched[fieldName] || false
  const errorId = `${String(fieldName)}-error`

  // Check if this field is dirty
  const dirty = value !== form.values[fieldName]

  const setValue = useCallback(
    (newValue: T[K]) => {
      form.setValue(fieldName, newValue)
    },
    [form, fieldName]
  )

  const setError = useCallback(
    (errorMessage: string) => {
      form.setError(fieldName, errorMessage)
    },
    [form, fieldName]
  )

  const inputProps = {
    value: (value ?? '') as T[K],
    onChange: form.handleChange(fieldName),
    onBlur: form.handleBlur(fieldName),
    'aria-invalid': !!(touched && error),
    'aria-describedby': touched && error ? errorId : undefined,
  }

  return {
    value,
    error: touched ? error : undefined,
    touched,
    dirty,
    inputProps,
    errorId,
    setValue,
    setError,
  }
}
