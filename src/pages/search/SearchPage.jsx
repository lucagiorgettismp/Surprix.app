import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, TextField, List, ListItem, ListItemButton, ListItemAvatar,
  ListItemText, Avatar, Typography, CircularProgress, InputAdornment,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { fetchAllSurprises, getSet } from '../../services/database.service'
import { gsToHttps } from '../../utils/storage'
import { useT } from '../../store/LanguageContext'

const SearchPage = () => {
  const t = useT()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [surprises, setSurprises] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllSurprises()
      .then(setSurprises)
      .finally(() => setLoading(false))
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return surprises
      .filter((s) =>
        s.code?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.set_name?.toLowerCase().includes(q)
      )
      .slice(0, 50)
  }, [surprises, query])

  const handleClick = async (s) => {
    if (!s.set_producer_id || !s.set_year_id) return
    const set = await getSet(s.set_id)
    navigate(`/catalog/${s.set_producer_id}/${s.set_year_id}/${s.set_id}`, {
      state: {
        producerLabel: s.set_producer_name,
        yearLabel: s.set_year_name,
        setLabel: s.set_name,
      },
    })
  }

  const displayName = (s) => {
    const useCode = (s.isSet_effective_code || s.set_effective_code) && s.code
    return useCode ? s.code : s.description
  }

  const displaySub = (s) => {
    const useCode = (s.isSet_effective_code || s.set_effective_code) && s.code
    return [useCode ? s.description : null, s.set_name].filter(Boolean).join(' · ')
  }

  return (
    <Box>
      <TextField
        fullWidth
        autoFocus
        size="small"
        placeholder={t.search.placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={loading}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1.5 }}
      />

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 4, justifyContent: 'center' }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">{t.search.loading}</Typography>
        </Box>
      )}

      {!loading && query.trim().length < 2 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t.search.typeToSearch}
        </Typography>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t.search.noResults}
        </Typography>
      )}

      <List disablePadding>
        {results.map((s) => (
          <ListItem key={s.id} disablePadding sx={{ bgcolor: 'background.paper', mb: 0.75, borderRadius: 2 }}>
            <ListItemButton sx={{ borderRadius: 2, gap: 1 }} onClick={() => handleClick(s)}>
              <ListItemAvatar sx={{ minWidth: 48 }}>
                <Avatar
                  src={gsToHttps(s.img_path)}
                  variant="rounded"
                  sx={{ width: 44, height: 44, bgcolor: 'background.default' }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={displayName(s)}
                secondary={displaySub(s)}
                slotProps={{
                  primary: { variant: 'body2', fontWeight: 600, noWrap: true },
                  secondary: { variant: 'caption', noWrap: true },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

export default SearchPage
