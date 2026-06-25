import { useState } from 'react'
import {
  Save, Building2, ClipboardList, Check, Store, Wrench, CreditCard, Truck, ShoppingBag, ListChecks,
  User, Smartphone, Lock, Wallet,
} from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useLab } from '../../context/LabContext.jsx'
import { PanelHead, Card, Field, PrimaryBtn, inputCls } from './ui.jsx'
import EditableList from './EditableList.jsx'
import FeatureManager from './FeatureManager.jsx'

// Master-only customization hub, split into two areas:
//   • אתר הצרכן (storefront/checkout)
//   • ניהול ומעבדה (back-office workflow)
export default function SettingsPanel() {
  const {
    settings, updateSettings,
    paymentMethods, deliveryMethods, orderStatuses, payments, deliveries, orderStatusOps,
  } = useSettings()
  const {
    conditionOptions, addConditionOption, updateConditionOption, deleteConditionOption, toggleConditionRequired,
    repairStatuses, addRepairStatus, updateRepairStatusLabel, deleteRepairStatus,
    labSettings, addLabField, updateLabField, deleteLabField, toggleLabFieldRequired,
  } = useLab()

  const [group, setGroup] = useState('consumer')
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const saveBusiness = (e) => {
    e.preventDefault()
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div>
      <PanelHead title="הגדרות והתאמה אישית" subtitle="שליטה מלאה בפרטי האתר, אפשרויות הקנייה וזרימת העבודה." />

      {/* Group switch */}
      <div className="mb-5 inline-flex rounded-full bg-white p-1 shadow-card">
        <GroupTab active={group === 'consumer'} onClick={() => setGroup('consumer')} Icon={Store}>
          אתר הצרכן
        </GroupTab>
        <GroupTab active={group === 'admin'} onClick={() => setGroup('admin')} Icon={Wrench}>
          ניהול ומעבדה
        </GroupTab>
      </div>

      {group === 'consumer' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Business details */}
          <Card>
            <CardTitle icon={Building2} title="פרטי העסק" />
            <form onSubmit={saveBusiness} className="space-y-4">
              <Field label="שם החברה">
                <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="כתובת">
                <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="טלפון לתצוגה">
                  <input className={inputCls} value={form.whatsappDisplay} onChange={(e) => set('whatsappDisplay', e.target.value)} />
                </Field>
                <Field label="וואטסאפ (בינלאומי)" hint="לדוגמה 972556802800">
                  <input className={inputCls} dir="ltr" value={form.whatsappIntl} onChange={(e) => set('whatsappIntl', e.target.value)} />
                </Field>
              </div>
              <div className="flex justify-end">
                <PrimaryBtn type="submit">
                  {saved ? <Check size={16} /> : <Save size={16} />} {saved ? 'נשמר' : 'שמירה'}
                </PrimaryBtn>
              </div>
            </form>
          </Card>

          {/* Payment methods */}
          <Card>
            <CardTitle icon={CreditCard} title="אמצעי תשלום" hint="האפשרויות בעמוד התשלום" />
            <EditableList
              items={paymentMethods}
              onAdd={payments.add}
              onUpdate={payments.update}
              onDelete={payments.remove}
              placeholder="הוספת אמצעי תשלום"
            />
          </Card>

          {/* Delivery methods */}
          <Card>
            <CardTitle icon={Truck} title="אופני קבלה ומשלוח" />
            <EditableList
              items={deliveryMethods}
              onAdd={deliveries.add}
              onUpdate={deliveries.update}
              onDelete={deliveries.remove}
              placeholder="הוספת אופן קבלה"
            />
          </Card>

          {/* Order statuses */}
          <Card>
            <CardTitle icon={ShoppingBag} title="סטטוסי הזמנה" />
            <EditableList
              items={orderStatuses}
              onAdd={orderStatusOps.add}
              onUpdate={orderStatusOps.update}
              onDelete={orderStatusOps.remove}
              placeholder="הוספת סטטוס הזמנה"
            />
          </Card>

          {/* Rotating featured strip (below the brand row) */}
          <FeatureManager />
        </div>
      ) : (
        <>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-light/80">
            הגדרות מעבדה — שדות טופס התיקון
          </h3>
          <p className="mb-4 text-sm text-ink-light">
            בכל אחד מ-5 הבלוקים ניתן להוסיף שדות מעקב מותאמים. סימון <span className="font-bold text-red-500">*</span> הופך שדה לחובה בטופס פתיחת/עריכת תיקון.
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {/* 1. Customer details */}
            <Card>
              <CardTitle icon={User} title="הגדרת פרטי לקוח" hint="שדות נוספים מעבר לשם/טלפון/כתובת" />
              <EditableList
                items={labSettings.customer}
                onAdd={(l) => addLabField('customer', l)}
                onUpdate={(id, l) => updateLabField('customer', id, l)}
                onDelete={(id) => deleteLabField('customer', id)}
                onToggleRequired={(id) => toggleLabFieldRequired('customer', id)}
                placeholder="הוספת שדה לקוח (למשל: ת.ז)"
              />
            </Card>

            {/* 2. Device details */}
            <Card>
              <CardTitle icon={Smartphone} title="הגדרת פרטי מכשיר" hint="שדות נוספים מעבר למותג/דגם/IMEI" />
              <EditableList
                items={labSettings.device}
                onAdd={(l) => addLabField('device', l)}
                onUpdate={(id, l) => updateLabField('device', id, l)}
                onDelete={(id) => deleteLabField('device', id)}
                onToggleRequired={(id) => toggleLabFieldRequired('device', id)}
                placeholder="הוספת שדה מכשיר (למשל: צבע)"
              />
            </Card>

            {/* 3. Device code */}
            <Card>
              <CardTitle icon={Lock} title="הגדרת קוד מכשיר" hint="שדות נוספים לקוד/אבטחה" />
              <EditableList
                items={labSettings.code}
                onAdd={(l) => addLabField('code', l)}
                onUpdate={(id, l) => updateLabField('code', id, l)}
                onDelete={(id) => deleteLabField('code', id)}
                onToggleRequired={(id) => toggleLabFieldRequired('code', id)}
                placeholder="הוספת שדה קוד (למשל: קוד גיבוי)"
              />
            </Card>

            {/* 4. Condition on arrival */}
            <Card>
              <CardTitle icon={ClipboardList} title="מצב בקבלה" hint="צ׳קבוקסים בטופס פתיחת תיקון" />
              <EditableList
                items={conditionOptions}
                onAdd={addConditionOption}
                onUpdate={updateConditionOption}
                onDelete={deleteConditionOption}
                onToggleRequired={toggleConditionRequired}
                placeholder="הוספת אפשרות (למשל: הגיע עם נרתיק)"
              />
            </Card>

            {/* 5. Payment */}
            <Card>
              <CardTitle icon={Wallet} title="תשלום" hint="שדות נוספים מעבר למקדמה" />
              <EditableList
                items={labSettings.payment}
                onAdd={(l) => addLabField('payment', l)}
                onUpdate={(id, l) => updateLabField('payment', id, l)}
                onDelete={(id) => deleteLabField('payment', id)}
                onToggleRequired={(id) => toggleLabFieldRequired('payment', id)}
                placeholder="הוספת שדה תשלום (למשל: הנחה)"
              />
            </Card>

            {/* Repair statuses (workflow) */}
            <Card>
              <CardTitle icon={ListChecks} title="סטטוסי תיקון" hint="שלבי זרימת העבודה במעבדה" />
              <EditableList
                items={repairStatuses}
                onAdd={addRepairStatus}
                onUpdate={updateRepairStatusLabel}
                onDelete={deleteRepairStatus}
                placeholder="הוספת סטטוס תיקון"
              />
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function GroupTab({ active, onClick, Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
        active ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-light hover:text-ink'
      }`}
    >
      <Icon size={18} /> {children}
    </button>
  )
}

function CardTitle({ icon: Icon, title, hint }) {
  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
        <Icon size={18} className="text-brand-500" /> {title}
      </h3>
      {hint && <p className="mt-0.5 text-sm text-ink-light">{hint}</p>}
    </div>
  )
}
