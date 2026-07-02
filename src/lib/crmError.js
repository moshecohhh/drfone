// Turn a failed `supabase.functions.invoke` call against one of the CRM edge
// functions (check-operator / send-ivr / check-kosher-imei) into a
// human-readable Hebrew message. Those functions return a JSON body with
// { error, detail } even on failure responses, but functions-js surfaces
// non-2xx responses as a FunctionsHttpError whose body must be read from
// `err.context` — without this the panels can only show a generic
// "try again later" and the real cause (bad CRM credentials, CRM down,
// CRM blocking the server) is lost.
export async function crmErrorMessage(err, fallback) {
  let error = ''
  let detail = ''
  try {
    const body = await err?.context?.json()
    error = String(body?.error ?? '')
    detail = String(body?.detail ?? '')
  } catch {
    /* no JSON body — network / relay error; keep the fallback */
  }
  if (error.includes('credentials not configured') || error.includes('login failed')) {
    return 'ההתחברות ל‑CRM נכשלה — יש לבדוק את פרטי ההתחברות (CRM_USER / CRM_PWD) בהגדרות הפונקציה.'
  }
  if (error.includes('CSRF token not found')) {
    return 'מערכת ה‑CRM אינה זמינה או חוסמת את השרת. נסו שוב מאוחר יותר.'
  }
  if (error) return `${fallback} (${detail || error})`
  return fallback
}
