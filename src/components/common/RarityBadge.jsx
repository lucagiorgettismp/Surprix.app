import { useState, useCallback } from 'react'
import { Tooltip, Box, ClickAwayListener } from '@mui/material'
import { useT } from '../../store/LanguageContext'
import DiamondIcon from '@mui/icons-material/Diamond'
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined'

const RarityBadge = ({ rarity, rarityAuto, missingCount, doubleCount, size = 'small' }) => {
  const value = Number(rarity) || 0
  const t = useT()
  const [open, setOpen] = useState(false)
  const iconSx = { fontSize: size === 'small' ? 16 : 20 }

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    setOpen((v) => {
      if (!v) setTimeout(() => setOpen(false), 2000)
      return !v
    })
  }, [])

  const handleClose = useCallback(() => setOpen(false), [])

  const diamonds = (
    <Box
      component="span"
      onClick={value ? handleClick : undefined}
      sx={{ display: 'inline-flex', gap: '2px', cursor: value ? 'pointer' : 'inherit' }}
    >
      {Array.from({ length: 3 }).map((_, i) =>
        i < value
          ? <DiamondIcon key={i} sx={{ ...iconSx, color: Boolean(rarityAuto) ? 'primary.main' : 'warning.main' }} />
          : <DiamondOutlinedIcon key={i} sx={{ ...iconSx, opacity: 0.3 }} />
      )}
    </Box>
  )

  if (!value) return diamonds

  let tooltipTitle
  if (rarityAuto) {
    const counts = missingCount != null && doubleCount != null
      ? `${missingCount} ${t.rarity.missing} · ${doubleCount} ${t.rarity.doubles}`
      : null
    tooltipTitle = (
      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span>{t.rarity.auto} <Box component="span" sx={{ color: 'secondary.light', fontWeight: 700 }}>Surprix AI</Box></span>
        {counts && <span style={{ opacity: 0.75, fontSize: '0.8em' }}>{counts}</span>}
      </Box>
    )
  } else {
    tooltipTitle = t.rarity.consolidated
  }

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Tooltip
        title={tooltipTitle}
        open={open}
        onClose={handleClose}
        disableFocusListener
        disableHoverListener
        disableTouchListener
        placement="top"
        arrow
        slotProps={{ popper: { sx: { zIndex: 9 }, modifiers: [{ name: 'offset', options: { offset: [0, -16] } }] } }}
      >
        {diamonds}
      </Tooltip>
    </ClickAwayListener>
  )
}

export default RarityBadge
