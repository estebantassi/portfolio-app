function CodeInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='text'
            title='Code must be 6 characters long and may include letters and digits.'
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
            title='Username must be 1 to 30 characters long. Only ASCII characters are allowed.'
            value={value}
            pattern={'[\x20-\x7E]{1,30}'}
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
            title='Biography must be 1 to 300 characters long. Only ASCII characters are allowed.'
            value={value}
            pattern={'[\x20-\x7E]{1,300}'}
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
            title='Password must be 12 to 32 characters long. Only ASCII characters are allowed.'
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
            title='Enter your email address in the format: "username@domain.com".'
            value={value}
            onChange={onChange}
            required
        />
  )
}

function PostInput({value, onChange, inputRef}) {
  return (
        <textarea
            ref={inputRef}
            type='text'
            title='Tell the word how you feel ! You can use up to 500 characters per post. Only ASCII characters are allowed.'
            placeholder='Write something...'
            value={value}
            maxLength={500}
            pattern="[\x20-\x7E]{0,500}"
            onChange={onChange}
            required
        />
  )
}

function MessageInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='text'
            title='Send a message to your friend ! You can use up to 1000 characters per message. Only ASCII characters are allowed.'
            placeholder='Hey there !'
            value={value}
            maxLength={1000}
            pattern="[\x20-\x7E]{0,1000}"
            onChange={onChange}
            required
        />
  )
}

function TagInput({value, onChange, inputRef}) {
  return (
        <input
            ref={inputRef}
            type='text'
            title='Tag must be 1 to 30 characters long. It cannot be a number other than your user ID. Only ASCII characters are allowed.'
            value={value}
            pattern={'[\x20-\x7E]{1,30}'}
            maxLength={30}
            onChange={onChange}
            required
        />
  )
}

export { CodeInput, PasswordInput, EmailInput, UsernameInput, PostInput, BiographyInput, TagInput, MessageInput }