import { Alert } from '@mui/material'

const ErrorMessage = ({ message }) => (
  <Alert severity="error" sx={{ my: 2 }}>
    {message || 'Si è verificato un errore. Riprova.'}
  </Alert>
)

export default ErrorMessage
