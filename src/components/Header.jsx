import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import Logo from './Logo.jsx'
import DomainSwitch from './DomainSwitch.jsx'
import SearchBar from './SearchBar.jsx'
import CategoryBar from './CategoryBar.jsx'
import AuthControls from './AuthControls.jsx'
import CartButton from './CartButton.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function Header() {
  // On mobile the search bar collapses once the user scrolls down, freeing
  // screen space for the products (the categories + store/lab switch stay).
  // Hysteresis (collapse past 90px, only re-open under 30px) leaves a dead zone
  // so the bar can't rapidly flip-flop — collapsing the bar shifts the layout,
  // which would otherwise re-cross a single threshold and make it jitter.
  const [hideSearch, setHideSearch] = useState(false)
  // When scrolled down, the compact icon opens the SAME search bar in place
  // (inside the sticky header at the top of the screen) instead of scrolling the
  // customer back up. Reusing <SearchBar/> keeps the behaviour identical.
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      // Dead zone between 30 and 90: once collapsed it stays collapsed until
      // we're back near the top, and vice-versa — so it can't flip-flop.
      setHideSearch((prev) => (prev ? y > 30 : y > 90))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  // Once the full bar is naturally visible again (back near the top), drop the
  // manual "opened via icon" state so scrolling down re-collapses it.
  useEffect(() => {
    if (!hideSearch) setSearchOpen(false)
  }, [hideSearch])

  const toggleInlineSearch = () => {
    setSearchOpen((o) => {
      const next = !o
      // Focus the field (and pop the keyboard) right after it expands.
      if (next) setTimeout(() => document.querySelector('header input[type="search"]')?.focus(), 60)
      return next
    })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="relative w-full px-4 py-2.5 lg:py-3 xl:px-[3cm]">
        {/* Top row: logo (right) — beside it a column with the domain switch
            stacked directly over the categories — and the controls (left).
            Stacking switch+categories fills the space next to the tall logo,
            so the categories sit right under the switch with no empty band. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 lg:items-start lg:gap-x-4 lg:gap-y-3">
          {/* Logo — compact on phones so the header doesn't eat the screen;
              restored to its enlarged desktop size at lg and up. */}
          <Logo className="order-1 h-12 shrink-0 sm:h-16 lg:h-20 2xl:h-28" />

          {/* Controls — on mobile they sit beside the logo (in flow); on desktop
              they're pinned to the top-left and taken OUT of the flow, so the
              category row below can use the full width (including the space
              beneath them) instead of being squeezed into a narrow column. */}
          <div className="order-2 flex shrink-0 items-center gap-2 lg:absolute lg:left-4 lg:top-3 lg:z-20 xl:left-[3cm]">
            {/* Compact search shortcut — appears (mobile only) once the full
                search bar has collapsed on scroll. Tapping it opens the search
                bar in place (at the top of the screen) WITHOUT scrolling up. */}
            {hideSearch && (
              <button
                type="button"
                onClick={toggleInlineSearch}
                aria-label="חיפוש"
                aria-expanded={searchOpen}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition lg:hidden ${
                  searchOpen ? 'bg-brand-50 text-brand-600' : 'text-ink hover:bg-black/5'
                }`}
              >
                <Search size={20} />
              </button>
            )}
            <ThemeToggle />
            <CartButton />
            <AuthControls />
          </div>

          {/* Switch + categories. On phones they sit on ONE row (switch hugs
              its content, categories fill the rest) to save vertical space; on
              desktop they stack beside the logo as before. */}
          <div className="order-3 flex w-full min-w-0 flex-row items-center gap-2 lg:order-2 lg:flex-col lg:items-start lg:flex-1 lg:pt-1">
            {/* Major switch — on mobile it sits on the LEFT (order-2) with the
                categories on the RIGHT (order-1); on desktop it goes back above
                the categories (order-1) in the vertical stack. */}
            <div className="order-2 shrink-0 lg:order-1">
              <DomainSwitch />
            </div>
            {/* Categories — RIGHT on mobile, below the switch on desktop. */}
            <div className="order-1 min-w-0 flex-1 lg:order-2 lg:w-full lg:flex-none lg:pr-3">
              <CategoryBar />
            </div>
          </div>
        </div>

        {/* Bottom row: contextual search. On mobile it collapses on scroll, but
            the compact icon can re-open it in place (searchOpen); on desktop
            (lg+) it's always visible. */}
        <div
          className={`overflow-hidden transition-all duration-300 lg:mt-3 lg:max-h-16 lg:opacity-100 ${
            hideSearch && !searchOpen ? 'mt-0 max-h-0 opacity-0' : 'mt-2.5 max-h-16 opacity-100'
          }`}
        >
          <SearchBar />
        </div>
      </div>
    </header>
  )
}
