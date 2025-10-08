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
            placeholder="Person123"
            title='Username must be 1 to 30 characters long.'
            value={value}
            pattern={'{1,30}'}
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
            title='Biography must be 1 to 300 characters long.'
            value={value}
            pattern={'{1,300}'}
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
            title='Password must be at least 12 characters long.'
            placeholder="..." 
            value={value}
            pattern=".{12,}"
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
            placeholder="example@gmail.com"
            required
        />
  )
}

function PostInput({value, onChange, inputRef}) {
  return (
        <textarea
            ref={inputRef}
            type='text'
            title='Tell the word how you feel ! You can use up to 500 characters per post.'
            placeholder='Write something...'
            value={value}
            maxLength={500}
            pattern="{0,500}"
            onChange={onChange}
        />
  )
}

function MessageInput({value, onChange, inputRef}) {
  return (
        <textarea
            ref={inputRef}
            type='text'
            title='Send a message to your friend ! You can use up to 1000 characters per message.'
            placeholder='Hey there !'
            value={value}
            maxLength={1000}
            pattern="{0,1000}"
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
            title='Tag must be 1 to 30 characters long. It cannot be a number other than your user ID.'
            placeholder="tag"
            value={value}
            pattern={'{1,30}'}
            maxLength={30}
            onChange={onChange}
            required
        />
  )
}

export { CodeInput, PasswordInput, EmailInput, UsernameInput, PostInput, BiographyInput, TagInput, MessageInput }