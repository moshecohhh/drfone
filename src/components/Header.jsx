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

        {/* Bottom row: contextual search */}
        <div className="mt-2.5 lg:mt-3">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}
