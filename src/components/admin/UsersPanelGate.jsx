import PasswordGate from './PasswordGate.jsx'
import UsersPanel from './UsersPanel.jsx'

// Users & Permissions behind the access-code gate.
export default function UsersPanelGate() {
  return (
    <PasswordGate title="משתמשים והרשאות">
      <UsersPanel />
    </PasswordGate>
  )
}
