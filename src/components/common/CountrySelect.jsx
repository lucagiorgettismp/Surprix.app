import { useMemo } from 'react'
import { Autocomplete, TextField } from '@mui/material'
import { useLanguage } from '../../store/LanguageContext'
import { ISO_CODES } from '../../utils/locale'

const buildOptions = (lang) => {
  const names = new Intl.DisplayNames([lang], { type: 'region' })
  return ISO_CODES
    .map((code) => { try { return { code, label: names.of(code) || code } } catch { return null } })
    .filter((o) => o && o.label !== o.code)
    .sort((a, b) => a.label.localeCompare(b.label, lang))
}

const CountrySelect = ({ value, onChange, label, size = 'small' }) => {
  const { lang } = useLanguage()
  const options = useMemo(() => buildOptions(lang), [lang])
  const selected = useMemo(() => options.find((o) => o.code === value) ?? null, [options, value])

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(o) => o.label}
      value={selected}
      onChange={(_, val) => onChange(val?.code || '')}
      isOptionEqualToValue={(option, val) => option.code === val?.code}
      renderInput={(params) => <TextField {...params} label={label} size={size} fullWidth />}
    />
  )
}

export default CountrySelect
