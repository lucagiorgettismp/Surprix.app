export const ISO_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
  'BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN',
  'CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
  'EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF',
  'GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM',
  'HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM',
  'JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC',
  'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK',
  'ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA',
  'NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG',
  'PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS',
  'ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO',
  'TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI',
  'VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
]

const cache = {}

const getRegionNames = (lang) => {
  if (!cache[lang]) cache[lang] = new Intl.DisplayNames([lang], { type: 'region' })
  return cache[lang]
}

const CATEGORY_LABELS = {
  it: {
    Hand_painted: 'Dipinti a mano',
    Metallic: 'Metallici',
    Flocked: 'Floccati',
    Glow: 'Fosforescenti',
    Compo: 'Componibili',
    Special: 'Speciali',
  },
  en: {
    Hand_painted: 'Hand painted',
    Metallic: 'Metallic',
    Flocked: 'Flocked',
    Glow: 'Glow in the dark',
    Compo: 'Assembly toys',
    Special: 'Special editions',
  },
}

export const getCategoryLabel = (category, lang = 'it') => {
  if (!category) return ''
  return CATEGORY_LABELS[lang]?.[category] ?? category.replace(/_/g, ' ')
}

const CUSTOM_REGIONS = {
  EUR: { it: 'Europa', en: 'Europe' },
}

const RESOLVE_LANGS = ['en','it','pl','es','ca','fr','de','pt','nl','cs','ro','hr','sk','hu','sv','da','fi','el','tr','ru','uk']

export const resolveCountryCode = (value) => {
  if (!value) return ''
  const upper = value.toUpperCase()
  if (ISO_CODES.includes(upper)) return upper
  const lower = value.toLowerCase()
  const displays = RESOLVE_LANGS.map((l) => { try { return new Intl.DisplayNames([l], { type: 'region' }) } catch { return null } }).filter(Boolean)
  return ISO_CODES.find((code) =>
    displays.some((d) => { try { return d.of(code)?.toLowerCase() === lower } catch { return false } })
  ) || ''
}

export const getCountryCodes = (lang = 'it') => {
  const names = getRegionNames(lang)
  return ISO_CODES
    .map((code) => ({ code, label: names.of(code) || code }))
    .sort((a, b) => a.label.localeCompare(b.label, lang))
}

export const getCountryName = (code, lang = 'it') => {
  if (!code) return ''
  const upper = code.toUpperCase()
  if (CUSTOM_REGIONS[upper]) return CUSTOM_REGIONS[upper][lang] ?? CUSTOM_REGIONS[upper].en
  try {
    return getRegionNames(lang).of(upper) || code
  } catch {
    return code
  }
}
