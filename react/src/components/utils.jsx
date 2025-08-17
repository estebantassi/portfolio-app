function StopPropagation({ children }) {
  return (
    <div onClick={e => e.stopPropagation()}>
      {children}
    </div>
  )
}

export { StopPropagation }