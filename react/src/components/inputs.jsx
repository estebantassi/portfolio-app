function CodeInput({value, onChange}) {
  return (
        <input
            title='Code must be 6 characters long and may include letters and digits'
            value={value}
            pattern={'[a-zA-Z0-9]{6}'}
            maxLength={6}
            onChange={onChange}
            required
        />
  )
}

function UsernameInput({value, onChange}) {
  return (
        <input
            title='Username must be 1 to 30 characters long and may include letters, digits and special characters'
            value={value}
            pattern={'[a-zA-Z0-9]{1, 30}'}
            maxLength={30}
            onChange={onChange}
            required
        />
  )
}

function PasswordInput({value, onChange}) {
  return (
        <input
            type='password'
            title='Password must be 12 to 32 characters long and may include letters, digits and special characters'
            value={value}
            pattern=".{12,32}"
            onChange={onChange}
            required
        />
  )
}

function EmailInput({value, onChange}) {
  return (
        <input
            type='email'
            title='Enter your email address in the format: username@domain.com'
            value={value}
            onChange={onChange}
            required
        />
  )
}

export { CodeInput, PasswordInput, EmailInput, UsernameInput }