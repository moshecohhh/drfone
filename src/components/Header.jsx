import Logo from './Logo.jsx'
import DomainSwitch from './DomainSwitch.jsx'
import SearchBar from './SearchBar.jsx'
import CategoryBar from './CategoryBar.jsx'
import AuthControls from './AuthControls.jsx'
import CartButton from './CartButton.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="relative w-full px-4 py-3 xl:px-[3cm]">
        {/* Top row: logo (right) — beside it a column with the domain switch
            stacked directly over the categories — and the controls (left).
            Stacking switch+categories fills the space next to the tall logo,
            so the categories sit right under the switch with no empty band. */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          {/* Enlarged logo (address removed to free the space beside it) */}
          <Logo className="order-1 h-16 shrink-0 sm:h-20 2xl:h-28" />

          {/* Controls — on mobile they sit beside the logo (in flow); on desktop
              they're pinned to the top-left and taken OUT of the flow, so the
              category row below can use the full width (including the space
              beneath them) instead of being squeezed into a narrow column. */}
          <div className="order-2 flex shrink-0 items-center gap-2 lg:absolute lg:left-4 lg:top-3 lg:z-20 xl:left-[3cm]">
            <ThemeToggle />
            <CartButton />
            <AuthControls />
          </div>

          {/* Switch + categories, stacked beside the logo. Spans the full
              remaining width on desktop (the controls no longer take a column),
              so the category row extends left into the free space. */}
          <div className="order-3 flex w-full min-w-0 flex-col items-start gap-2 lg:order-2 lg:flex-1 lg:pt-1">
            {/* Major switch — above the categories (items-start keeps the
                segmented pill hugging its content instead of stretching). */}
            <DomainSwitch />
            {/* Nudge the categories left a touch (desktop) so "ראשי" lands
                directly under "חנות" in the switch above. */}
            <div className="w-full min-w-0 lg:pr-3">
              <CategoryBar />
            </div>
          </div>
        </div>

        {/* Bottom row: contextual search */}
        <div className="mt-3">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}
