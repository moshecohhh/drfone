import { createContext, useContext } from 'react'

// Lightweight context that exposes whether the admin panel is in "edit mode"
// (label renaming + list reordering). Provided by AdminDashboard; consumed by
// shared admin building blocks like PanelHead so they don't need prop drilling.
const AdminEditContext = createContext({ editMode: false })

export function AdminEditProvider({ editMode, children }) {
  return <AdminEditContext.Provider value={{ editMode }}>{children}</AdminEditContext.Provider>
}

export function useAdminEdit() {
  return useContext(AdminEditContext)
}
