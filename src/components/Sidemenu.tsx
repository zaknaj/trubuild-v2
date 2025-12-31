export const Sidemenu = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-screen fixed top-13 left-0 w-80 rounded-tr-xl bg-white sidemenu-shadow pb-20 overflow-auto">
      {children}
    </div>
  )
}
