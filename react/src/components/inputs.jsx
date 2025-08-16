function CodeInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='text'
            title='Code must be 6 characters long and may include letters and digits'
            value={value}
            pattern={'[a-zA-Z0-9]{6}'}
            maxLength={6}
            onChange={onChange}
            required
        />
  )
}

function UsernameInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='text'
            title='Username must be 1 to 30 characters long and may include letters, digits and special characters'
            value={value}
            pattern={'[a-zA-Z0-9]{1, 30}'}
            maxLength={30}
            onChange={onChange}
            required
        />
  )
}

function BiographyInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='text'
            title='Biography must be 1 to 300 characters long and may include letters, digits and special characters'
            value={value}
            pattern={'[a-zA-Z0-9]{1, 300}'}
            maxLength={300}
            onChange={onChange}
            required
        />
  )
}

function PasswordInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='password'
            title='Password must be 12 to 32 characters long and may include letters, digits and special characters'
            value={value}
            pattern=".{12,32}"
            onChange={onChange}
            required
        />
  )
}

function EmailInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='email'
            title='Enter your email address in the format: username@domain.com'
            value={value}
            onChange={onChange}
            required
        />
  )
}

function PostInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='text'
            title='Tell the word how you feel ! You can use up to 500 characters per post.'
            placeholder='Write something...'
            value={value}
            maxLength={500}
            pattern=".{0,500}"
            onChange={onChange}
            required
        />
  )
}

export { CodeInput, PasswordInput, EmailInput, UsernameInput, PostInput, BiographyInput }