import { useCallback } from 'react'
import { UseFormReturn } from './useForm'

export interface UseFormFieldReturn {
  value: any
  error: string | undefined
  touched: boolean
  dirty: boolean
  
  // Input props to spread on input elements
  inputProps: {
    value: any
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onBlur: () => void
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }
  
  // Helper to get error message ID for aria-describedby
  errorId: string
  
  // Manually set value
  setValue: (value: any) => void
  
  // Manually set error
  setError: (error: string) => void
}

/**
 * Hook for individual form field
 * Provides everything needed to bind an input and show error messages
 */
export function useFormField<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  fieldName: keyof T
): UseFormFieldReturn {
  const value = form.values[fieldName]
  const error = form.errors[fieldName]
  const touched = form.touched[fieldName] || false
  const errorId = `${String(fieldName)}-error`

  // Check if this field is dirty
  const dirty = value !== form.values[fieldName]

  const setValue = useCallback(
    (newValue: any) => {
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
    value: value ?? '',
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
