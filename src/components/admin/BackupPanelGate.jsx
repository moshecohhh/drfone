import PasswordGate from './PasswordGate.jsx'
import BackupPanel from './BackupPanel.jsx'

// Backup & Restore behind the access-code gate (avoids accidental clicks).
export default function BackupPanelGate() {
  return (
    <PasswordGate title="גיבוי ושחזור">
      <BackupPanel />
    </PasswordGate>
  )
}
