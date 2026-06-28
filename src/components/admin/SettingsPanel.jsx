import { useState, useRef } from 'react'
import {
  Save, Building2, ClipboardList, Check, Store, Wrench, CreditCard, Truck, ShoppingBag, ListChecks,
  User, Smartphone, Lock, Wallet, Upload, X, PanelBottom,
} from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useLab } from '../../context/LabContext.jsx'
import { downscaleImage } from '../../utils/image.js'
import { PanelHead, Card, Field, PrimaryBtn, Switch, inputCls } from './ui.jsx'
import EditableList from './EditableList.jsx'
import ImageOptimizer from './ImageOptimizer.jsx'

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
  const footerLogoRef = useRef(null)

  // Upload a footer logo → downscale to a small data-URL stored on the settings.
  const onFooterLogo = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    downscaleImage(file, 400, 0.9).then((url) => set('footerLogo', url)).catch(() => {})
  }

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
              <Field label="נ״צ במפה (קו רוחב, קו אורך)" hint="הנקודה המדויקת במפת התחתית — אליה מובילים כפתורי הניווט (Waze / גוגל מפות). העתיקו מגוגל מפס: לחיצה ימנית על הנקודה ← העתקת המספרים">
                <input className={inputCls} dir="ltr" placeholder="31.938305,35.046213" value={form.mapCoords || ''} onChange={(e) => set('mapCoords', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="טלפון לתצוגה" hint="מוצג בכותרת התחתית">
                  <input className={inputCls} value={form.whatsappDisplay} onChange={(e) => set('whatsappDisplay', e.target.value)} />
                </Field>
                <Field label="וואטסאפ (בינלאומי)" hint="מספר כפתור הוואטסאפ · לדוגמה 972556802800">
                  <input className={inputCls} dir="ltr" value={form.whatsappIntl} onChange={(e) => set('whatsappIntl', e.target.value)} />
                </Field>
              </div>

              {/* Footer (black bottom panel) */}
              <div className="rounded-xl border border-black/10 bg-brand-50/30 p-3">
                <span className="mb-3 flex items-center gap-2 text-xs font-bold text-ink-light">
                  <PanelBottom size={14} className="text-brand-500" /> כותרת תחתית (Footer)
                </span>
                <Field label="לוגו בתחתית">
                  <div className="flex items-center gap-3">
                    {/* Preview reflects the white-background setting */}
                    <div className={`flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 p-1.5 ${form.footerLogoWhiteBg !== false ? 'bg-white' : 'bg-black'}`}>
                      {form.footerLogo ? (
                        <img src={form.footerLogo} alt="" className="h-full w-auto object-contain" />
                      ) : (
                        <img src="/logo.png" alt="" className="h-full w-auto object-contain" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button type="button" onClick={() => footerLogoRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-black/5">
                        <Upload size={14} /> העלאת לוגו
                      </button>
                      {form.footerLogo && (
                        <button type="button" onClick={() => set('footerLogo', '')} className="flex items-center gap-1.5 text-xs font-semibold text-ink-light hover:text-red-500">
                          <X size={13} /> שימוש בלוגו הראשי
                        </button>
                      )}
                    </div>
                    <input ref={footerLogoRef} type="file" accept="image/*" onChange={onFooterLogo} className="hidden" />
                  </div>
                </Field>
                {/* White-background toggle — persists across re-uploads */}
                <label className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">רקע לבן מאחורי הלוגו</span>
                  <Switch checked={form.footerLogoWhiteBg !== false} onChange={(v) => set('footerLogoWhiteBg', v)} label="רקע לבן ללוגו" />
                </label>
                <p className="mt-1 text-xs text-ink-light">כבו אם הלוגו שלכם לבן/שקוף — הוא יוצג ישירות על הרקע השחור ללא קופסה.</p>
                <div className="mt-3">
                  <Field label="טקסט תיאור בתחתית">
                    <textarea rows={3} className={inputCls} value={form.footerTagline} onChange={(e) => set('footerTagline', e.target.value)} />
                  </Field>
                </div>
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
            <CardTitle icon={Truck} title="אופני קבלה ומשלוח" hint="המחיר מתווסף לסה״כ ההזמנה · 0 = חינם" />
            <EditableList
              items={deliveryMethods}
              onAdd={deliveries.add}
              onUpdate={deliveries.update}
              onDelete={deliveries.remove}
              placeholder="הוספת אופן קבלה"
              withPrice
            />
          </Card>

          {/* Delivery street list — offered as a dropdown at checkout */}
          <Card>
            <CardTitle icon={Truck} title="רשימת רחובות למשלוח" hint="הרחובות שיוצעו לבחירה בקופה ובכתובות. ניתן תמיד להזין רחוב שאינו ברשימה." />
            <EditableList
              items={(settings.streets || []).map((s, i) => ({ id: String(i), label: s }))}
              onAdd={(label) => label.trim() && updateSettings({ streets: [...(settings.streets || []), label.trim()] })}
              onUpdate={(id, label) => updateSettings({ streets: (settings.streets || []).map((s, i) => (String(i) === id ? label.trim() : s)) })}
              onDelete={(id) => updateSettings({ streets: (settings.streets || []).filter((_, i) => String(i) !== id) })}
              placeholder="הוספת רחוב"
              scroll
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

          {/* One-click image compression to speed up the whole site */}
          <ImageOptimizer />
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
