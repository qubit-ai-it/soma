import { cn } from "cn"

// Material Symbols Outlined, rendered through font ligatures
function Icon({
  name,
  className,
  ...props
}: { name: string } & React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="icon"
      className={cn("material-symbols-outlined size-[1em] select-none text-[1.25em] leading-none", className)}
      {...props}
    >
      {name}
    </span>
  )
}

export { Icon }
