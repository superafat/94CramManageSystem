/**
 * Form Validation Hooks - Usage Examples
 * 
 * This file demonstrates how to use useForm and useFormField hooks
 */

import { useForm, validators } from './useForm'
import { useFormField } from './useFormField'

// ============================================================================
// Example 1: Basic Login Form
// ============================================================================

interface LoginFormValues {
  email: string
  password: string
}

export function LoginFormExample() {
  const form = useForm<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validators: {
      email: validators.combine(
        validators.required('Email is required'),
        validators.email()
      ),
      password: validators.combine(
        validators.required('Password is required'),
        validators.minLength(6, 'Password must be at least 6 characters')
      ),
    },
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      console.log('Submitting:', values)
      // API call here
    },
  })

  const emailField = useFormField(form, 'email')
  const passwordField = useFormField(form, 'password')

  return (
    <form onSubmit={form.handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...emailField.inputProps}
        />
        {emailField.error && (
          <span id={emailField.errorId} className="error">
            {emailField.error}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...passwordField.inputProps}
        />
        {passwordField.error && (
          <span id={passwordField.errorId} className="error">
            {passwordField.error}
          </span>
        )}
      </div>

      <button type="submit" disabled={form.isSubmitting || !form.isValid}>
        {form.isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}

// ============================================================================
// Example 2: Registration Form with Custom Validator
// ============================================================================

interface RegisterFormValues {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export function RegisterFormExample() {
  const form = useForm<RegisterFormValues>({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      username: validators.combine(
        validators.required('Username is required'),
        validators.minLength(3),
        validators.maxLength(20)
      ),
      email: validators.combine(
        validators.required(),
        validators.email()
      ),
      password: validators.combine(
        validators.required(),
        validators.minLength(8, 'Password must be at least 8 characters'),
        validators.pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain uppercase, lowercase, and number'
        )
      ),
      confirmPassword: (value) => {
        if (value !== form.values.password) {
          return 'Passwords do not match'
        }
        return null
      },
    },
    onSubmit: async (values) => {
      console.log('Registering:', values)
      // API call here
    },
  })

  const usernameField = useFormField(form, 'username')
  const emailField = useFormField(form, 'email')
  const passwordField = useFormField(form, 'password')
  const confirmPasswordField = useFormField(form, 'confirmPassword')

  return (
    <form onSubmit={form.handleSubmit}>
      <div>
        <label htmlFor="username">Username</label>
        <input id="username" type="text" {...usernameField.inputProps} />
        {usernameField.error && <span className="error">{usernameField.error}</span>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...emailField.inputProps} />
        {emailField.error && <span className="error">{emailField.error}</span>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...passwordField.inputProps} />
        {passwordField.error && <span className="error">{passwordField.error}</span>}
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" type="password" {...confirmPasswordField.inputProps} />
        {confirmPasswordField.error && <span className="error">{confirmPasswordField.error}</span>}
      </div>

      <button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Registering...' : 'Register'}
      </button>

      {form.dirty && <p>You have unsaved changes</p>}
    </form>
  )
}

// ============================================================================
// Example 3: Using Manual Control
// ============================================================================

export function ManualControlExample() {
  const form = useForm({
    initialValues: { name: '', age: 0 },
    validators: {
      name: validators.required(),
      age: (value) => (value > 0 && value < 120 ? null : 'Invalid age'),
    },
  })

  const nameField = useFormField(form, 'name')
  const ageField = useFormField(form, 'age')

  const handleCustomSubmit = () => {
    // Manual validation
    const isValid = form.validate()
    
    if (isValid) {
      console.log('Form is valid:', form.values)
    } else {
      console.log('Form has errors:', form.errors)
    }
  }

  const handleReset = () => {
    form.reset()
  }

  return (
    <div>
      <input {...nameField.inputProps} />
      {nameField.error && <span>{nameField.error}</span>}

      <input type="number" {...ageField.inputProps} />
      {ageField.error && <span>{ageField.error}</span>}

      <button onClick={handleCustomSubmit}>Validate</button>
      <button onClick={handleReset}>Reset</button>
      
      <pre>
        Values: {JSON.stringify(form.values, null, 2)}
        Errors: {JSON.stringify(form.errors, null, 2)}
        Dirty: {form.dirty.toString()}
        Valid: {form.isValid.toString()}
      </pre>
    </div>
  )
}
