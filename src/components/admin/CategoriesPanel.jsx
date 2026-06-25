import { useState } from 'react'
import { Store, Wrench } from 'lucide-react'
import { DOMAINS } from '../../context/AppContext.jsx'
import { PanelHead } from './ui.jsx'
import DomainToggle from './DomainToggle.jsx'
import CategoryManager from './CategoryManager.jsx'

const LABEL = { [DOMAINS.STORE]: 'חנות', [DOMAINS.LAB]: 'מעבדה' }

export default function CategoriesPanel() {
  const [domain, setDomain] = useState(DOMAINS.STORE)
  return (
    <div>
      <PanelHead title="ניהול קטגוריות" subtitle="הוספה, עריכה, מחיקה וסידור קטגוריות לכל דומיין." />
      <DomainToggle
        domain={domain}
        onChange={setDomain}
        options={[
          { id: DOMAINS.STORE, label: 'חנות', Icon: Store },
          { id: DOMAINS.LAB, label: 'מעבדה', Icon: Wrench },
        ]}
      />
      <CategoryManager domain={domain} domainLabel={LABEL[domain]} />
    </div>
  )
}
