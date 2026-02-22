import { useState, useCallback } from 'react'

// Validator function type
export type Validator<T = any> = (value: T) => string | null

// Built-in validators
export const validators = {
  required: (message = 'This field is required'): Validator => (value) => {
    if (value === null || value === undefined || value === '') {
      return message
    }
    return null
  },

  email: (message = 'Invalid email address'): Validator => (value) => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(String(value)) ? null : message
  },

  minLength: (min: number, message?: string): Validator => (value) => {
    if (!value) return null
    const length = String(value).length
    return length >= min ? null : message || `Minimum length is ${min} characters`
  },

  maxLength: (max: number, message?: string): Validator => (value) => {
    if (!value) return null
    const length = String(value).length
    return length <= max ? null : message || `Maximum length is ${max} characters`
  },

  pattern: (regex: RegExp, message = 'Invalid format'): Validator => (value) => {
    if (!value) return null
    return regex.test(String(value)) ? null : message
  },

  // Combine multiple validators
  combine: (...validators: Validator[]): Validator => (value) => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return null
  },
}

// Form configuration
export interface UseFormConfig<T> {
  initialValues: T
  validators?: { [K in keyof T]?: Validator }
  validateOnChange?: boolean
  validateOnBlur?: boolean
  onSubmit?: (values: T) => void | Promise<void>
}

// Form state
export interface UseFormReturn<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  dirty: boolean
  isSubmitting: boolean
  isValid: boolean
  
  setValue: (field: keyof T, value: any) => void
  setValues: (values: Partial<T>) => void
  setError: (field: keyof T, error: string) => void
  setErrors: (errors: Partial<Record<keyof T, string>>) => void
  setTouched: (field: keyof T, touched: boolean) => void
  
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleBlur: (field: keyof T) => () => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  
  validate: (field?: keyof T) => boolean
  reset: () => void
}

export function useForm<T extends Record<string, any>>(
  config: UseFormConfig<T>
): UseFormReturn<T> {
  const {
    initialValues,
    validators: fieldValidators = {} as UseFormConfig<T>['validators'],
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
  } = config

  const [values, setValuesState] = useState<T>(initialValues)
  const [errors, setErrorsState] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if form has been modified
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues)

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0

  // Validate a single field or all fields
  const validate = useCallback(
    (field?: keyof T): boolean => {
      if (field) {
        const validator = fieldValidators?.[field]
        if (!validator) return true

        const error = validator(values[field])
        if (error) {
          setErrorsState((prev) => ({ ...prev, [field]: error }))
          return false
        } else {
          setErrorsState((prev) => {
            const newErrors = { ...prev }
            delete newErrors[field]
            return newErrors
          })
          return true
        }
      } else {
        // Validate all fields
        const newErrors: { [K in keyof T]?: string } = {}
        let isValid = true

        for (const key in fieldValidators) {
          const validator = fieldValidators[key]
          if (validator) {
            const error = validator(values[key as keyof T])
            if (error) {
              newErrors[key as keyof T] = error
              isValid = false
            }
          }
        }

        setErrorsState(newErrors)
        return isValid
      }
    },
    [values, fieldValidators]
  )

  // Set single value
  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState((prev) => ({ ...prev, [field]: value }))
      
      if (validateOnChange) {
        const validator = fieldValidators?.[field]
        if (validator) {
          const error = validator(value)
          if (error) {
            setErrorsState((prev) => ({ ...prev, [field]: error }))
          } else {
            setErrorsState((prev) => {
              const newErrors = { ...prev }
              delete newErrors[field]
              return newErrors
            })
          }
        }
      }
    },
    [fieldValidators, validateOnChange]
  )

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }))
  }, [])

  // Set single error
  const setError = useCallback((field: keyof T, error: string) => {
    setErrorsState((prev) => ({ ...prev, [field]: error }))
  }, [])

  // Set multiple errors
  const setErrors = useCallback((newErrors: Partial<Record<keyof T, string>>) => {
    setErrorsState(newErrors)
  }, [])

  // Set touched state
  const setTouched = useCallback((field: keyof T, isTouched: boolean) => {
    setTouchedState((prev) => ({ ...prev, [field]: isTouched }))
  }, [])

  // Handle input change
  const handleChange = useCallback(
    (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
      setValue(field, value)
    },
    [setValue]
  )

  // Handle input blur
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched(field, true)
      if (validateOnBlur) {
        validate(field)
      }
    },
    [setTouched, validate, validateOnBlur]
  )

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault()
      }

      // Mark all fields as touched
      const allTouched: Partial<Record<keyof T, boolean>> = {}
      for (const key in values) {
        allTouched[key] = true
      }
      setTouchedState(allTouched)

      // Validate all fields
      const isValid = validate()

      if (isValid && onSubmit) {
        setIsSubmitting(true)
        try {
          await onSubmit(values)
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [values, validate, onSubmit]
  )

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrorsState({})
    setTouchedState({})
    setIsSubmitting(false)
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    dirty,
    isSubmitting,
    isValid,
    
    setValue,
    setValues,
    setError,
    setErrors,
    setTouched,
    
    handleChange,
    handleBlur,
    handleSubmit,
    
    validate,
    reset,
  }
}
